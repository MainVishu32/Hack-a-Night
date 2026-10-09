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

  const events = await db.getAllEvents();
  if (events.length > 0) {
    const units = await db.getInventoryUnitsByEvent(events[0].id);
    await redisEngine.syncWithDatabase(units);
  }

  // Start durable background worker and self-healing reconciler
  worker.start();
  console.log('[PulseReserve] Engine online: Database initialized, Redis synchronized, worker active.');
}

