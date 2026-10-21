/**
 * Crops REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateCropData } from '../middleware/validateRequest.js';

const router = express.Router();

// GET /api/crops
router.get('/', async (req, res, next) => {
  try {
    const crops = await storage.getCollection('crops');
    const { category } = req.query;

    let filtered = [...crops];
    if (category) {
      filtered = filtered.filter((c) => c.category.toLowerCase() === String(category).toLowerCase());
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

// GET /api/crops/:id
router.get('/:id', async (req, res, next) => {
  try {
    const crop = await storage.findById('crops', req.params.id);
    if (!crop) {
      throw new AppError(`Crop with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: crop
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/crops
router.post('/', async (req, res, next) => {
  try {
    const { name, category } = req.body;
    validateCropData({ name, category }, false);

    const newCrop = {
      id: `crp_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      category: category.trim()
    };

    const created = await storage.insert('crops', newCrop);
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/crops/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('crops', req.params.id);
    if (!existing) {
      throw new AppError(`Crop with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    validateCropData(req.body, true);

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.category !== undefined) updates.category = req.body.category.trim();

    const updated = await storage.update('crops', req.params.id, updates);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/crops/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('crops', req.params.id);
    if (!existing) {
      throw new AppError(`Crop with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    await storage.delete('crops', req.params.id);
    res.status(200).json({
      success: true,
      message: `Crop '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
