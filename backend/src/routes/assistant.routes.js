/**
 * Assistant REST API Routes (AI Kisan Dost)
 */

import express from 'express';
import { askKisanDost } from '../services/kisanDostService.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/assistant/status
 * Returns assistant capabilities and configured engine.
 */
router.get('/status', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  res.status(200).json({
    success: true,
    data: {
      name: 'AI Kisan Dost',
      provider: hasGeminiKey ? 'Gemini 3.8 Flash (Server-Side)' : 'Deterministic Rule-Based Engine',
      ai_enabled: hasGeminiKey,
      supported_languages: ['Urdu (اردو)', 'Sindhi (سنڌي)', 'Roman Urdu', 'English'],
      suggested_questions: [
        'Aaj gandum ka rate kya hai?',
        'Meri fasal kis mandi mein bechni chahiye?',
        'Aaj mausam kaisa rahega?',
        'Mujhe kitna munafa hoga?',
        'Meri fasal ka munasib rate kya hai?'
      ]
    }
  });
});

/**
 * POST /api/assistant/chat
 * Primary conversation endpoint.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { message, language, district } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new AppError('Message is required and must be non-empty', 400, 'VALIDATION_ERROR');
    }

    const result = await askKisanDost({
      message: message.trim(),
      district: district || 'Hyderabad',
      language
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
