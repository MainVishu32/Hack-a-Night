import express from 'express';
import cookieParser from 'cookie-parser';
import { db } from './db/database.js';
import { redisEngine } from './redis/redisEngine.js';
import { worker } from './services/worker.js';
import { apiRouter } from './api/router.js';

export const app = express();

app.use(express.json());
app.use(cookieParser());

// Mount the API router
app.use('/api', apiRouter);

// Initialize DB and Redis Sync
let isInitialized = false;

export async function initializeBackend() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('[PulseReserve] Initializing Database & Redis coordination engine...');
  await db.init();
  await redisEngine.connect();

  const events = await db.getAllEvents();
  for (const event of events) {
    const units = await db.getInventoryUnitsByEvent(event.id);
    await redisEngine.syncWithDatabase(units);
  }

  // Start durable background worker and self-healing reconciler
  worker.start();
  const shutdown = async () => { try { worker.stop?.(); } catch {} try { await redisEngine.close(); } catch {} try { await db.close(); } catch {} };
  process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)); });
  console.log('[PulseReserve] Engine online: Database initialized, Redis synchronized, worker active.');
}

