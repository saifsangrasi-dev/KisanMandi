/**
 * KisanMandi Standalone HTTP Server Entrypoint
 */

import dotenv from 'dotenv';
import { createApp } from './src/app.js';
import { storage } from './src/services/storage.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    console.log('[KisanMandi Backend] Initializing persistent JSON storage...');
    await storage.init();
    console.log(`[KisanMandi Backend] Database verified at: ${storage.getDbPath()}`);

    const app = createApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` KisanMandi REST API Backend running successfully!`);
      console.log(` Listening on: http://0.0.0.0:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    const shutdown = async () => {
      console.log('\n[KisanMandi Backend] Gracefully shutting down...');
      server.close(() => {
        console.log('[KisanMandi Backend] Closed HTTP server.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[KisanMandi Backend] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
