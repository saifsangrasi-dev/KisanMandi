/**
 * Request Validation Middleware for KisanMandi
 */

import { AppError } from './errorHandler.js';
import { isValidDateFormat, isPastDate } from '../utils/dateUtils.js';

export function validateUserData(data, isPatch = false) {
  if (!isPatch || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Name is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.phone !== undefined) {
    if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 6) {
      throw new AppError('Valid contact phone is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.district !== undefined) {
    if (!data.district || typeof data.district !== 'string' || !data.district.trim()) {
      throw new AppError('District is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.role !== undefined) {
    if (!['Farmer', 'Buyer'].includes(data.role)) {
      throw new AppError("Role must be either 'Farmer' or 'Buyer'", 400, 'VALIDATION_ERROR');
    }
  }
}

export function validateCropData(data, isPatch = false) {
  if (!isPatch || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Crop name is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.category !== undefined) {
    if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
      throw new AppError('Crop category is required', 400, 'VALIDATION_ERROR');
    }
  }
}

export function validateMarketData(data, isPatch = false) {
  if (!isPatch || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError('Market name is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.district !== undefined) {
    if (!data.district || typeof data.district !== 'string' || !data.district.trim()) {
      throw new AppError('Market district is required', 400, 'VALIDATION_ERROR');
    }
  }
}

export function validatePriceData(data, isPatch = false) {
  if (!isPatch || data.crop_id !== undefined) {
    if (!data.crop_id || typeof data.crop_id !== 'string') {
      throw new AppError('Valid crop_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.market_id !== undefined) {
    if (!data.market_id || typeof data.market_id !== 'string') {
      throw new AppError('Valid market_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.date !== undefined) {
    if (!isValidDateFormat(data.date)) {
      throw new AppError('Valid date in YYYY-MM-DD format is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.price !== undefined) {
    const num = Number(data.price);
    if (isNaN(num) || num <= 0) {
      throw new AppError('Price must be a positive number greater than zero', 400, 'VALIDATION_ERROR');
    }
  }
}

export function validateListingData(data, isPatch = false) {
  if (!isPatch || data.user_id !== undefined) {
    if (!data.user_id || typeof data.user_id !== 'string') {
      throw new AppError('Valid user_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.crop_id !== undefined) {
    if (!data.crop_id || typeof data.crop_id !== 'string') {
      throw new AppError('Valid crop_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError('Quantity must be greater than zero', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.asking_price !== undefined) {
    const price = Number(data.asking_price);
    if (isNaN(price) || price <= 0) {
      throw new AppError('Asking price must be greater than zero', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.district !== undefined) {
    if (!data.district || typeof data.district !== 'string' || !data.district.trim()) {
      throw new AppError('District is required and cannot be empty', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.grade !== undefined) {
    if (!['A', 'B', 'C'].includes(data.grade)) {
      throw new AppError("Grade must be 'A', 'B', or 'C'", 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.available_from !== undefined) {
    if (!isValidDateFormat(data.available_from)) {
      throw new AppError('available_from must be a valid date in YYYY-MM-DD format', 400, 'VALIDATION_ERROR');
    }
    if (isPastDate(data.available_from)) {
      throw new AppError('Available-from date cannot be in the past', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.contact_phone !== undefined) {
    if (!data.contact_phone || typeof data.contact_phone !== 'string' || data.contact_phone.trim().length < 6) {
      throw new AppError('Valid contact phone is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (data.status !== undefined) {
    if (!['Active', 'Sold'].includes(data.status)) {
      throw new AppError("Status must be either 'Active' or 'Sold'", 400, 'VALIDATION_ERROR');
    }
  }
}

export function validateAlertData(data, isPatch = false) {
  if (!isPatch || data.user_id !== undefined) {
    if (!data.user_id || typeof data.user_id !== 'string') {
      throw new AppError('Valid user_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.crop_id !== undefined) {
    if (!data.crop_id || typeof data.crop_id !== 'string') {
      throw new AppError('Valid crop_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.market_id !== undefined) {
    if (!data.market_id || typeof data.market_id !== 'string') {
      throw new AppError('Valid market_id is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.condition !== undefined) {
    if (!['Above', 'Below'].includes(data.condition)) {
      throw new AppError("Condition must be either 'Above' or 'Below'", 400, 'VALIDATION_ERROR');
    }
  }

  if (!isPatch || data.target_price !== undefined) {
    const num = Number(data.target_price);
    if (isNaN(num) || num <= 0) {
      throw new AppError('Target price must be a positive number', 400, 'VALIDATION_ERROR');
    }
  }

  if (data.active_status !== undefined && typeof data.active_status !== 'boolean') {
    throw new AppError('active_status must be a boolean', 400, 'VALIDATION_ERROR');
  }
}
