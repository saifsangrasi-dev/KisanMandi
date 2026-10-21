/**
 * KisanMandi Full-Stack Development and Production Server
 *
 * Runs Express backend APIs on /api/* and mounts Vite middleware for the React frontend.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createApp } from './backend/src/app.js';
import { storage } from './backend/src/services/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const PORT = Number(process.env.PORT) || 3000;
  console.log('[KisanMandi] Initializing storage...');
  await storage.init();

  const app = express();

  // Mount backend API routes (/api/*)
  const apiApp = createApp();
  app.use(apiApp);

  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode: Vite middlewares
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KisanMandi Server] Ready on http://0.0.0.0:${PORT}`);
    console.log(`[KisanMandi Server] REST API available at http://0.0.0.0:${PORT}/api`);
  });
}

start().catch((err) => {
  console.error('[KisanMandi Server] Startup failed:', err);
  process.exit(1);
});
