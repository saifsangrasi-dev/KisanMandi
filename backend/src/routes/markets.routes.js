/**
 * Markets REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateMarketData } from '../middleware/validateRequest.js';

const router = express.Router();

// GET /api/markets
router.get('/', async (req, res, next) => {
  try {
    const markets = await storage.getCollection('markets');
    const { district } = req.query;

    let filtered = [...markets];
    if (district) {
      filtered = filtered.filter((m) => m.district.toLowerCase() === String(district).toLowerCase());
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/markets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const market = await storage.findById('markets', req.params.id);
    if (!market) {
      throw new AppError(`Market with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: market
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/markets
router.post('/', async (req, res, next) => {
  try {
    const { name, district } = req.body;
    validateMarketData({ name, district }, false);

    const newMarket = {
      id: `mkt_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      district: district.trim()
    };

    const created = await storage.insert('markets', newMarket);
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/markets/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('markets', req.params.id);
    if (!existing) {
      throw new AppError(`Market with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    validateMarketData(req.body, true);

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.district !== undefined) updates.district = req.body.district.trim();

    const updated = await storage.update('markets', req.params.id, updates);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/markets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('markets', req.params.id);
    if (!existing) {
      throw new AppError(`Market with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    await storage.delete('markets', req.params.id);
    res.status(200).json({
      success: true,
      message: `Market '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
