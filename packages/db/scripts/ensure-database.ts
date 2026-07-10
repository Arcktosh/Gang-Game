import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const inner = trimmed.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : inner;
  }

  return trimmed;
}

function loadEnvFileIfPresent(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const assignment = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
    const equalsIndex = assignment.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, equalsIndex).trim();
    const value = unquoteEnvValue(assignment.slice(equalsIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadMonorepoRootEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const monorepoRoot = resolve(scriptDir, '../../..');
  const envFiles = [`.env.${nodeEnv}.local`, nodeEnv === 'test' ? null : '.env.local', `.env.${nodeEnv}`, '.env'];

  for (const envFile of envFiles) {
    if (envFile) {
      loadEnvFileIfPresent(resolve(monorepoRoot, envFile));
    }
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getDatabaseName(url: URL) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  if (databaseName.includes('/') || databaseName.includes('\0')) {
    throw new Error(`Refusing to create invalid database name: ${databaseName}`);
  }

  return databaseName;
}

loadMonorepoRootEnv();

const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
const targetUrl = new URL(connectionString);
const targetDatabase = getDatabaseName(targetUrl);
const maintenanceDatabase = process.env.POSTGRES_MAINTENANCE_DATABASE ?? 'postgres';
const maintenanceUrl = new URL(connectionString);
maintenanceUrl.pathname = `/${maintenanceDatabase}`;

const sql = postgres(maintenanceUrl.toString(), { max: 1 });

try {
  const existing = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${targetDatabase}) AS exists
  `;

  if (existing[0]?.exists) {
    console.log(`[db:ensure] database "${targetDatabase}" already exists`);
  } else {
    await sql.unsafe(`CREATE DATABASE ${quoteIdentifier(targetDatabase)}`);
    console.log(`[db:ensure] created database "${targetDatabase}"`);
  }
} finally {
  await sql.end();
}
