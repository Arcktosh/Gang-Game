import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
  }

  return value ?? 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
}

function getPoolSize() {
  const value = Number(process.env.DB_POOL_SIZE ?? 10);

  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error('DB_POOL_SIZE must be an integer between 1 and 50.');
  }

  return value;
}

export const pgClient = postgres(getDatabaseUrl(), {
  max: getPoolSize(),
});

export const db = drizzle(pgClient, { schema });

export type Database = typeof db;
