/**
 * Prices REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validatePriceData } from '../middleware/validateRequest.js';
import {
  getLatestPrice,
  getDailyPriceChange,
  getFourteenDayStats,
  getMarketComparison
} from '../services/marketPriceService.js';
import { evaluateAlerts } from '../services/alertService.js';

const router = express.Router();

// GET /api/prices/summary?crop_id=...&market_id=...
router.get('/summary', async (req, res, next) => {
  try {
    const { crop_id, market_id } = req.query;
    if (!crop_id || !market_id) {
      throw new AppError('crop_id and market_id query parameters are required', 400, 'VALIDATION_ERROR');
    }

    const prices = await storage.getCollection('prices');
    const latest = getLatestPrice(String(crop_id), String(market_id), prices);
    const change = getDailyPriceChange(String(crop_id), String(market_id), prices);
    const stats14Day = getFourteenDayStats(String(crop_id), String(market_id), prices);

    res.status(200).json({
      success: true,
      data: {
        crop_id,
        market_id,
        latest_record: latest,
        daily_change: change,
        stats_14_day: stats14Day
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices/comparison?crop_id=...
router.get('/comparison', async (req, res, next) => {
  try {
    const { crop_id } = req.query;
    if (!crop_id) {
      throw new AppError('crop_id query parameter is required', 400, 'VALIDATION_ERROR');
    }

    const [markets, prices] = await Promise.all([
      storage.getCollection('markets'),
      storage.getCollection('prices')
    ]);

    const comparison = getMarketComparison(String(crop_id), markets, prices);

    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices
router.get('/', async (req, res, next) => {
  try {
    const prices = await storage.getCollection('prices');
    const { crop_id, market_id, date, start_date, end_date } = req.query;

    let filtered = [...prices];

    if (crop_id && crop_id !== 'undefined' && crop_id !== 'null') {
      filtered = filtered.filter((p) => p.crop_id === String(crop_id));
    }
    if (market_id && market_id !== 'undefined' && market_id !== 'null') {
      filtered = filtered.filter((p) => p.market_id === String(market_id));
    }
    if (date && date !== 'undefined' && date !== 'null') {
      filtered = filtered.filter((p) => p.date === String(date));
    }
    if (start_date && start_date !== 'undefined' && start_date !== 'null') {
      filtered = filtered.filter((p) => p.date >= String(start_date));
    }
    if (end_date && end_date !== 'undefined' && end_date !== 'null') {
      filtered = filtered.filter((p) => p.date <= String(end_date));
    }

    // Default sort by date descending
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const price = await storage.findById('prices', req.params.id);
    if (!price) {
      throw new AppError(`Price record with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: price
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prices
router.post('/', async (req, res, next) => {
  try {
    const { crop_id, market_id, date, price } = req.body;
    validatePriceData({ crop_id, market_id, date, price }, false);

    // Foreign-key validations
    const [crop, market, allPrices] = await Promise.all([
      storage.findById('crops', crop_id),
      storage.findById('markets', market_id),
      storage.getCollection('prices')
    ]);

    if (!crop) {
      throw new AppError(`Referenced crop_id '${crop_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }
    if (!market) {
      throw new AppError(`Referenced market_id '${market_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }

    // Reject duplicate price record for same crop, market, and date
    const exists = allPrices.some(
      (p) => p.crop_id === crop_id && p.market_id === market_id && p.date === date
    );
    if (exists) {
      throw new AppError(
        `A price record already exists for crop '${crop_id}', market '${market_id}' on date '${date}'`,
        409,
        'DUPLICATE_PRICE'
      );
    }

    const newRecord = {
      id: `prc_${crypto.randomUUID().slice(0, 8)}`,
      crop_id,
      market_id,
      date,
      price: Number(price)
    };

    const created = await storage.insert('prices', newRecord);

    // Auto-evaluate active alerts after successful price insertion
    try {
      await evaluateAlerts(storage);
    } catch (e) {
      console.warn('Alert evaluation post price insertion warning:', e.message);
    }

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/prices/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('prices', req.params.id);
    if (!existing) {
      throw new AppError(`Price record with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    validatePriceData(req.body, true);

    const crop_id = req.body.crop_id || existing.crop_id;
    const market_id = req.body.market_id || existing.market_id;
    const date = req.body.date || existing.date;

    if (req.body.crop_id) {
      const crop = await storage.findById('crops', crop_id);
      if (!crop) throw new AppError(`Crop '${crop_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }
    if (req.body.market_id) {
      const market = await storage.findById('markets', market_id);
      if (!market) throw new AppError(`Market '${market_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }

    // Check duplicate if crop, market, or date is modified
    if (crop_id !== existing.crop_id || market_id !== existing.market_id || date !== existing.date) {
      const allPrices = await storage.getCollection('prices');
      const conflict = allPrices.some(
        (p) => p.id !== req.params.id && p.crop_id === crop_id && p.market_id === market_id && p.date === date
      );
      if (conflict) {
        throw new AppError('Another price record already exists for this crop, market, and date', 409, 'DUPLICATE_PRICE');
      }
    }

    const updates = {};
    if (req.body.crop_id !== undefined) updates.crop_id = crop_id;
    if (req.body.market_id !== undefined) updates.market_id = market_id;
    if (req.body.date !== undefined) updates.date = date;
    if (req.body.price !== undefined) updates.price = Number(req.body.price);

    const updated = await storage.update('prices', req.params.id, updates);

    // Auto-evaluate alerts
    try {
      await evaluateAlerts(storage);
    } catch (e) {
      console.warn('Alert evaluation warning:', e.message);
    }

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/prices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('prices', req.params.id);
    if (!existing) {
      throw new AppError(`Price record with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    await storage.delete('prices', req.params.id);
    res.status(200).json({
      success: true,
      message: `Price record '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
