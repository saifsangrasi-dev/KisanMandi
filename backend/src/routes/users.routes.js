/**
 * Users REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateUserData } from '../middleware/validateRequest.js';

const router = express.Router();

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await storage.getCollection('users');
    const { role, district } = req.query;

    let filtered = [...users];
    if (role) {
      filtered = filtered.filter((u) => u.role.toLowerCase() === String(role).toLowerCase());
    }
    if (district) {
      filtered = filtered.filter((u) => u.district.toLowerCase() === String(district).toLowerCase());
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

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await storage.findById('users', req.params.id);
    if (!user) {
      throw new AppError(`User with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, district, role } = req.body;
    validateUserData({ name, phone, district, role }, false);

    const newUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      phone: phone.trim(),
      district: district.trim(),
      role
    };

    const created = await storage.insert('users', newUser);
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('users', req.params.id);
    if (!existing) {
      throw new AppError(`User with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    validateUserData(req.body, true);

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.phone !== undefined) updates.phone = req.body.phone.trim();
    if (req.body.district !== undefined) updates.district = req.body.district.trim();
    if (req.body.role !== undefined) updates.role = req.body.role;

    const updated = await storage.update('users', req.params.id, updates);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('users', req.params.id);
    if (!existing) {
      throw new AppError(`User with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    await storage.delete('users', req.params.id);
    res.status(200).json({
      success: true,
      message: `User '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
