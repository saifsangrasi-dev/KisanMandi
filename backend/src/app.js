/**
 * KisanMandi Express Application Setup
 */

import express from 'express';
import cors from 'cors';
import { storage } from './services/storage.js';
import usersRouter from './routes/users.routes.js';
import cropsRouter from './routes/crops.routes.js';
import marketsRouter from './routes/markets.routes.js';
import pricesRouter from './routes/prices.routes.js';
import listingsRouter from './routes/listings.routes.js';
import alertsRouter from './routes/alerts.routes.js';
import weatherRouter from './routes/weather.routes.js';
import assistantRouter from './routes/assistant.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Configure CORS for local development and cloud iframe preview
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const db = await storage.read();
      const storageAvailable = storage.initialized && Boolean(db);

      res.status(200).json({
        status: 'healthy',
        storage_available: storageAvailable,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        collections: {
          users: db.users?.length || 0,
          crops: db.crops?.length || 0,
          markets: db.markets?.length || 0,
          prices: db.prices?.length || 0,
          listings: db.listings?.length || 0,
          alerts: db.alerts?.length || 0
        }
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        storage_available: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Mount collection routers
  app.use('/api/users', usersRouter);
  app.use('/api/crops', cropsRouter);
  app.use('/api/markets', marketsRouter);
  app.use('/api/prices', pricesRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/weather', weatherRouter);
  app.use('/api/assistant', assistantRouter);

  // 404 handler for unknown API routes
  app.use('/api', notFoundHandler);

  // Global centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
