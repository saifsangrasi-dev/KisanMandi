/**
 * Listings REST API Routes
 */

import express from 'express';
import crypto from 'node:crypto';
import { storage } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateListingData } from '../middleware/validateRequest.js';
import { calculateListingMarketLabel } from '../services/marketPriceService.js';

const router = express.Router();

function getRequestUserId(req) {
  return req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id || null;
}

// GET /api/listings
router.get('/', async (req, res, next) => {
  try {
    const [listings, crops, users, markets, prices] = await Promise.all([
      storage.getCollection('listings'),
      storage.getCollection('crops'),
      storage.getCollection('users'),
      storage.getCollection('markets'),
      storage.getCollection('prices')
    ]);

    const { crop_id, district, grade, status, user_id, search, sort } = req.query;

    let filtered = [...listings];

    if (crop_id && crop_id !== 'undefined' && crop_id !== 'null') {
      filtered = filtered.filter((l) => l.crop_id === String(crop_id));
    }
    if (district && district !== 'undefined' && district !== 'null') {
      filtered = filtered.filter((l) => l.district.toLowerCase() === String(district).toLowerCase());
    }
    if (grade && grade !== 'undefined' && grade !== 'null') {
      filtered = filtered.filter((l) => l.grade === String(grade).toUpperCase());
    }
    if (status && status !== 'undefined' && status !== 'null') {
      filtered = filtered.filter((l) => l.status.toLowerCase() === String(status).toLowerCase());
    }
    if (user_id && user_id !== 'undefined' && user_id !== 'null') {
      filtered = filtered.filter((l) => l.user_id === String(user_id));
    }

    // Attach dynamic market label and helpful crop/farmer names
    let enriched = filtered.map((listing) => {
      const crop = crops.find((c) => c.id === listing.crop_id);
      const user = users.find((u) => u.id === listing.user_id);
      const marketAnalysis = calculateListingMarketLabel(listing.asking_price, listing.crop_id, markets, prices);

      return {
        ...listing,
        crop_name: crop?.name || 'Unknown Crop',
        crop_category: crop?.category || 'General',
        farmer_name: user?.name || 'Unknown Farmer',
        market_label: marketAnalysis.label,
        market_difference_pct: marketAnalysis.differencePercentage,
        market_average_price: marketAnalysis.marketAverage
      };
    });

    if (search) {
      const q = String(search).toLowerCase();
      enriched = enriched.filter(
        (l) =>
          l.crop_name.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.farmer_name.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sort === 'price_asc') {
      enriched.sort((a, b) => a.asking_price - b.asking_price);
    } else {
      // Default: sort=newest
      enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/listings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const listing = await storage.findById('listings', req.params.id);
    if (!listing) {
      throw new AppError(`Listing with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    const [crop, user, markets, prices] = await Promise.all([
      storage.findById('crops', listing.crop_id),
      storage.findById('users', listing.user_id),
      storage.getCollection('markets'),
      storage.getCollection('prices')
    ]);

    const marketAnalysis = calculateListingMarketLabel(listing.asking_price, listing.crop_id, markets, prices);

    res.status(200).json({
      success: true,
      data: {
        ...listing,
        crop_name: crop?.name || 'Unknown Crop',
        crop_category: crop?.category || 'General',
        farmer_name: user?.name || 'Unknown Farmer',
        market_label: marketAnalysis.label,
        market_difference_pct: marketAnalysis.differencePercentage,
        market_average_price: marketAnalysis.marketAverage
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/listings
router.post('/', async (req, res, next) => {
  try {
    const {
      user_id,
      crop_id,
      quantity,
      asking_price,
      district,
      grade,
      available_from,
      status = 'Active',
      contact_phone
    } = req.body;

    validateListingData(
      {
        user_id,
        crop_id,
        quantity,
        asking_price,
        district,
        grade,
        available_from,
        status,
        contact_phone
      },
      false
    );

    // Foreign-key & role safeguards
    const [user, crop] = await Promise.all([
      storage.findById('users', user_id),
      storage.findById('crops', crop_id)
    ]);

    if (!user) {
      throw new AppError(`Referenced user_id '${user_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }

    // Role safeguard: A buyer must not create listings
    if (user.role !== 'Farmer') {
      throw new AppError(
        `User '${user.name}' has role '${user.role}'. Only registered Farmers can create produce listings.`,
        403,
        'ROLE_NOT_PERMITTED'
      );
    }

    if (!crop) {
      throw new AppError(`Referenced crop_id '${crop_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }

    const now = new Date().toISOString();
    const newListing = {
      id: `lst_${crypto.randomUUID().slice(0, 8)}`,
      user_id,
      crop_id,
      quantity: Number(quantity),
      asking_price: Number(asking_price),
      district: district.trim(),
      grade: grade.toUpperCase(),
      available_from,
      status: status || 'Active',
      contact_phone: contact_phone.trim(),
      created_at: now,
      updated_at: now
    };

    const created = await storage.insert('listings', newListing);
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/listings/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('listings', req.params.id);
    if (!existing) {
      throw new AppError(`Listing with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    // Identity & ownership verification
    const callerId = getRequestUserId(req);
    if (!callerId) {
      throw new AppError(
        'Owner identity required via x-user-id header or user_id field for listing modifications',
        400,
        'OWNER_IDENTITY_REQUIRED'
      );
    }

    const callerUser = await storage.findById('users', callerId);
    if (!callerUser) {
      throw new AppError(`User '${callerId}' does not exist`, 404, 'USER_NOT_FOUND');
    }

    if (callerUser.role !== 'Farmer') {
      throw new AppError('Only farmers can manage produce listings', 403, 'ROLE_NOT_PERMITTED');
    }

    // Farmer must not modify another farmer's listing
    if (existing.user_id !== callerId) {
      throw new AppError(
        "Forbidden: A farmer cannot modify another farmer's listing",
        403,
        'OWNERSHIP_MISMATCH'
      );
    }

    validateListingData(req.body, true);

    if (req.body.crop_id) {
      const crop = await storage.findById('crops', req.body.crop_id);
      if (!crop) throw new AppError(`Crop '${req.body.crop_id}' does not exist`, 400, 'FOREIGN_KEY_ERROR');
    }

    const updates = {};
    if (req.body.crop_id !== undefined) updates.crop_id = req.body.crop_id;
    if (req.body.quantity !== undefined) updates.quantity = Number(req.body.quantity);
    if (req.body.asking_price !== undefined) updates.asking_price = Number(req.body.asking_price);
    if (req.body.district !== undefined) updates.district = req.body.district.trim();
    if (req.body.grade !== undefined) updates.grade = req.body.grade.toUpperCase();
    if (req.body.available_from !== undefined) updates.available_from = req.body.available_from;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.contact_phone !== undefined) updates.contact_phone = req.body.contact_phone.trim();
    updates.updated_at = new Date().toISOString();

    const updated = await storage.update('listings', req.params.id, updates);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/listings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await storage.findById('listings', req.params.id);
    if (!existing) {
      throw new AppError(`Listing with ID '${req.params.id}' not found`, 404, 'NOT_FOUND');
    }

    // Ownership verification
    const callerId = getRequestUserId(req);
    if (!callerId) {
      throw new AppError(
        'Owner identity required via x-user-id header or user_id query parameter',
        400,
        'OWNER_IDENTITY_REQUIRED'
      );
    }

    const callerUser = await storage.findById('users', callerId);
    if (!callerUser) {
      throw new AppError(`User '${callerId}' does not exist`, 404, 'USER_NOT_FOUND');
    }

    if (callerUser.role !== 'Farmer') {
      throw new AppError('Only farmers can delete produce listings', 403, 'ROLE_NOT_PERMITTED');
    }

    if (existing.user_id !== callerId) {
      throw new AppError(
        "Forbidden: A farmer cannot delete another farmer's listing",
        403,
        'OWNERSHIP_MISMATCH'
      );
    }

    await storage.delete('listings', req.params.id);
    res.status(200).json({
      success: true,
      message: `Listing '${req.params.id}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
