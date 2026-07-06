import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const file = process.argv[2];

if (!file) {
  console.error('Usage: tsx scripts/run-sql-file.ts <sql-file>');
  process.exit(1);
}

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

loadMonorepoRootEnv();

const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
const sql = postgres(connectionString, { max: 1 });

try {
  const contents = await readFile(resolve(file), 'utf8');
  await sql.unsafe(contents);
  console.log(`Applied SQL file: ${file}`);
} finally {
  await sql.end();
}
