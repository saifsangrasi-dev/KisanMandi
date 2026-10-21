/**
 * Weather REST API Routes
 */

import express from 'express';
import { getDistrictWeather, getSupportedDistricts } from '../services/weatherService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /api/weather/districts
router.get('/districts', (req, res) => {
  res.status(200).json({
    success: true,
    data: getSupportedDistricts()
  });
});

// GET /api/weather?district=Hyderabad
router.get('/', async (req, res, next) => {
  try {
    const district = req.query.district || 'Hyderabad';
    const data = await getDistrictWeather(String(district));
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    // If external service fails, do not fabricate data
    next(new AppError(err.message, 502, 'WEATHER_SERVICE_ERROR'));
  }
});

export default router;
