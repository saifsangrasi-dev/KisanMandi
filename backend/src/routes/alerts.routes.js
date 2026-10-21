/**
 * Alerts REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateAlertData } from '../middleware/validateRequest.js';
import { evaluateAlerts } from '../services/alertService.js';

const router = express.Router();

function getRequestUserId(req) {
  return req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id || null;
}

// POST /api/alerts/evaluate - Evaluate active alerts against current mandi prices
router.post('/evaluate', async (req, res, next) => {
  try {
    const result = await evaluateAlerts(storage);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts
router.get('/', async (req, res, next) => {
  try {
    const [alerts, crops, markets, users] = await Promise.all([
      storage.getCollection('alerts'),
      storage.getCollection('crops'),
      storage.getCollection('markets'),
      storage.getCollection('users')
    ]);

    const { user_id, active_status, triggered_status } = req.query;

    let filtered = [...alerts];

    if (user_id && user_id !== 'undefined' && user_id !== 'null') {
      filtered = filtered.filter((a) => a.user_id === String(user_id));
    }
    if (active_status !== undefined && active_status !== 'undefined' && active_status !== 'null') {
      const boolVal = active_status === 'true' || active_status === true;
      filtered = filtered.filter((a) => Boolean(a.active_status) === boolVal);
    }
    if (triggered_status !== undefined && triggered_status !== 'undefined' && triggered_status !== 'null') {
      const boolVal = triggered_status === 'true' || triggered_status === true;
      filtered = filtered.filter((a) => Boolean(a.triggered_status) === boolVal);
    }

    // Enrich with names
    const enriched = filtered.map((alert) => {
      const crop = crops.find((c) => c.id === alert.crop_id);
      const market = markets.find((m) => m.id === alert.market_id);
      const user = users.find((u) => u.id === alert.user_id);
      return {
        ...alert,
        crop_name: crop?.name || 'Unknown Crop',
        market_name: market?.name || 'Unknown Market',
        market_district: market?.district || '',
        user_name: user?.name || 'Unknown User'
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await storage.findById('alerts', req.params.id);
    if (!alert) {
      throw new AppError(`Alert with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    const [crop, market] = await Promise.all([
      storage.findById('crops', alert.crop_id),
      storage.findById('markets', alert.market_id)
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...alert,
        crop_name: crop?.name || 'Unknown Crop',
        market_name: market?.name || 'Unknown Market'
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts
router.post('/', async (req, res, next) => {
  try {
    const { user_id, crop_id, market_id, condition, target_price, active_status = true } = req.body;

    validateAlertData({ user_id, crop_id, market_id, condition, target_price, active_status }, false);

    // Foreign-key checks
    const [user, crop, market] = await Promise.all([
      storage.findById('users', user_id),
      storage.findById('crops', crop_id),
      storage.findById('markets', market_id)
    ]);

    if (!user) throw new AppError(`Referenced user_id '${user_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    if (!crop) throw new AppError(`Referenced crop_id '${crop_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    if (!market) throw new AppError(`Referenced market_id '${market_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');

    const newAlert = {
      id: `alt_${crypto.randomUUID().slice(0, 8)}`,
      user_id,
      crop_id,
      market_id,
      condition,
      target_price: Number(target_price),
      active_status: Boolean(active_status),
      triggered_status: false,
      last_triggered_at: null
    };

    const created = await storage.insert('alerts', newAlert);

    // Trigger initial evaluation immediately
    try {
      await evaluateAlerts(storage);
    } catch (e) {
      console.warn('Post-creation alert evaluation warning:', e.message);
    }

    // Reload created alert
    const refreshed = await storage.findById('alerts', created.id);

    res.status(201).json({
      success: true,
      data: refreshed || created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/alerts/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('alerts', req.params.id);
    if (!existing) {
      throw new AppError(`Alert with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    // Owner safeguard
    const callerId = getRequestUserId(req);
    if (callerId && existing.user_id !== callerId) {
      throw new AppError('Forbidden: Cannot modify an alert owned by another user', 403, 'OWNERSHIP_MISMATCH');
    }

    validateAlertData(req.body, true);

    if (req.body.crop_id) {
      const crop = await storage.findById('crops', req.body.crop_id);
      if (!crop) throw new AppError(`Crop '${req.body.crop_id}' not found`, 400, 'FOREIGN_KEY_ERROR');
    }
    if (req.body.market_id) {
      const market = await storage.findById('markets', req.body.market_id);
      if (!market) throw new AppError(`Market '${req.body.market_id}' not found`, 400, 'FOREIGN_KEY_ERROR');
    }

    const updates = {};
    if (req.body.crop_id !== undefined) updates.crop_id = req.body.crop_id;
    if (req.body.market_id !== undefined) updates.market_id = req.body.market_id;
    if (req.body.condition !== undefined) updates.condition = req.body.condition;
    if (req.body.target_price !== undefined) updates.target_price = Number(req.body.target_price);
    if (req.body.active_status !== undefined) updates.active_status = Boolean(req.body.active_status);
    if (req.body.triggered_status !== undefined) updates.triggered_status = Boolean(req.body.triggered_status);

    const updated = await storage.update('alerts', req.params.id, updates);

    // Re-evaluate
    await evaluateAlerts(storage);
    const reloaded = await storage.findById('alerts', req.params.id);

    res.status(200).json({
      success: true,
      data: reloaded || updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('alerts', req.params.id);
    if (!existing) {
      throw new AppError(`Alert with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    // Owner safeguard
    const callerId = getRequestUserId(req);
    if (callerId && existing.user_id !== callerId) {
      throw new AppError('Forbidden: Cannot delete an alert owned by another user', 403, 'OWNERSHIP_MISMATCH');
    }

    await storage.delete('alerts', req.params.id);
    res.status(200).json({
      success: true,
      message: `Alert '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
