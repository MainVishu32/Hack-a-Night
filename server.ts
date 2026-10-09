import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { app, initializeBackend } from './server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

async function startProductionServer() {
  await initializeBackend();

  // Serve static assets from dist
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));

  // SPA fallback for frontend client routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulseReserve] Production server listening on http://0.0.0.0:${PORT}`);
  });
}

startProductionServer().catch(err => {
  console.error('[PulseReserve] Startup failure:', err);
  process.exit(1);
});
