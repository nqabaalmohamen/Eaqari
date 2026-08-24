import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  try {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err: any) => {
      console.error('[prisma] Pool error:', err?.message || err);
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (adapterErr: any) {
    console.warn('[prisma] ⚠️ Adapter init failed, falling back to direct client:', adapterErr?.message || String(adapterErr));
    return new PrismaClient();
  }
}

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target: any, prop: string | symbol) {
    const client = getPrisma();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
