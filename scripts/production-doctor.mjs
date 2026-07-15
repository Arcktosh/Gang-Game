#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const jsonOnly = args.has('--json');
const proofMode = args.has('--proof');
const skipDocker = args.has('--skip-docker') || envBoolean('MVP_PROOF_SKIP_DOCKER');
const skipBackup = args.has('--skip-backup') || envBoolean('MVP_PROOF_SKIP_BACKUP');
const skipServer = args.has('--skip-server') || envBoolean('MVP_PROOF_SKIP_SERVER');
const skipWorker = args.has('--skip-worker') || envBoolean('MVP_PROOF_SKIP_WORKER');
const skipRedisProof = args.has('--skip-redis-proof') || envBoolean('MVP_PROOF_SKIP_REDIS_PROOF');
const checks = [];

function envBoolean(name) {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env[name] ?? '').toLowerCase());
}

function add(name, ok, details = {}) {
  checks.push({ name, ok, ...details });
}

function run(command, commandArgs = []) {
  try {
    return execFileSync(command, commandArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function commandVersion(name, versionArgs = ['--version']) {
  return run(name, versionArgs);
}

function parseMajor(version) {
  const match = String(version ?? '').match(/v?(\d+)/);
  return match ? Number(match[1]) : null;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function loadEnv(relativePath) {
  const values = {};
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) return values;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const assignment = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const index = assignment.indexOf('=');
    if (index < 1) continue;
    const key = assignment.slice(0, index).trim();
    let value = assignment.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function isPlaceholder(value) {
  if (!value) return true;
  return /(change[-_ ]?me|replace[-_ ]?me|example|your[-_ ]|todo|placeholder)/i.test(value);
}

const rootPackage = readJson('package.json');
const expectedPnpm = String(rootPackage.packageManager ?? '').replace(/^pnpm@/, '');
const nodeVersion = process.version;
const nodeMajor = parseMajor(nodeVersion);
add('node', nodeMajor !== null && nodeMajor >= 22, {
  actual: nodeVersion,
  expected: '>=22.0.0',
  remediation: 'Install Node.js 22 or newer.',
});

const pnpmVersion = commandVersion('pnpm');
add('pnpm', pnpmVersion === expectedPnpm, {
  actual: pnpmVersion ?? 'not found',
  expected: expectedPnpm,
  remediation: `Run corepack enable && corepack prepare pnpm@${expectedPnpm} --activate.`,
});

if (!skipDocker) {
  const dockerVersion = commandVersion('docker');
  const composeVersion = dockerVersion ? run('docker', ['compose', 'version']) : null;
  add('docker', Boolean(dockerVersion), {
    actual: dockerVersion ?? 'not found',
    remediation: 'Install Docker Engine or Docker Desktop and ensure docker is on PATH.',
  });
  add('docker-compose', Boolean(composeVersion), {
    actual: composeVersion ?? 'not available',
    remediation: 'Install the Docker Compose v2 plugin.',
  });
} else {
  add('docker', true, { skipped: true, reason: 'Docker proof explicitly skipped.' });
}

if (!skipBackup) {
  for (const tool of ['pg_dump', 'pg_restore']) {
    const version = commandVersion(tool);
    add(tool, Boolean(version), {
      actual: version ?? 'not found',
      remediation: `Install PostgreSQL client tools so ${tool} is available on PATH.`,
    });
  }
} else {
  add('postgres-client-tools', true, { skipped: true, reason: 'Backup/restore proof explicitly skipped.' });
}

const requiredFiles = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'docker-compose.yml',
  '.env.example',
  'scripts/prove-mvp-runtime.mjs',
  'scripts/runtime-smoke.mjs',
  'scripts/backup-db.sh',
  'scripts/restore-db.sh',
];
for (const relativePath of requiredFiles) {
  add(`file:${relativePath}`, fs.existsSync(path.join(repoRoot, relativePath)), {
    remediation: `Restore the required repository file ${relativePath}.`,
  });
}

const envFile = loadEnv('.env');
const exampleEnv = loadEnv('.env.example');
const mergedEnv = { ...exampleEnv, ...envFile, ...process.env };
add('environment-file', fs.existsSync(path.join(repoRoot, '.env')) || fs.existsSync(path.join(repoRoot, '.env.example')), {
  actual: fs.existsSync(path.join(repoRoot, '.env')) ? '.env' : '.env.example fallback',
  remediation: 'Copy .env.example to .env and replace all placeholders.',
});

const databaseUrl = mergedEnv.DATABASE_URL;
let validDatabaseUrl = false;
try {
  const parsed = new URL(databaseUrl);
  validDatabaseUrl = ['postgres:', 'postgresql:'].includes(parsed.protocol) && Boolean(parsed.hostname) && Boolean(parsed.pathname.replace(/^\//, ''));
} catch {
  validDatabaseUrl = false;
}
add('DATABASE_URL', validDatabaseUrl, {
  actual: validDatabaseUrl ? 'configured' : 'missing or invalid',
  remediation: 'Set DATABASE_URL to a PostgreSQL connection string.',
});

const authSecret = mergedEnv.AUTH_SECRET;
add('AUTH_SECRET', typeof authSecret === 'string' && authSecret.length >= 32 && !isPlaceholder(authSecret), {
  actual: authSecret ? `${authSecret.length} characters` : 'missing',
  expected: 'at least 32 non-placeholder characters',
  remediation: 'Generate a strong AUTH_SECRET, for example with openssl rand -base64 48.',
});

if (!skipServer) {
  const appUrl = mergedEnv.NEXT_PUBLIC_APP_URL ?? mergedEnv.APP_ORIGIN ?? 'http://localhost:3000';
  let validAppUrl = false;
  try {
    validAppUrl = ['http:', 'https:'].includes(new URL(appUrl).protocol);
  } catch {
    validAppUrl = false;
  }
  add('application-origin', validAppUrl, {
    actual: appUrl,
    remediation: 'Set NEXT_PUBLIC_APP_URL or APP_ORIGIN to a valid HTTP(S) origin.',
  });
}

if (proofMode && !skipRedisProof) {
  const redisUrl = mergedEnv.RATE_LIMIT_REDIS_URL || mergedEnv.REDIS_URL;
  let validRedisUrl = false;
  try {
    validRedisUrl = ['redis:', 'rediss:'].includes(new URL(redisUrl).protocol);
  } catch {
    validRedisUrl = false;
  }
  add('redis-rate-limit-url', validRedisUrl, {
    actual: validRedisUrl ? 'configured' : 'missing or invalid',
    remediation: 'Set REDIS_URL or RATE_LIMIT_REDIS_URL to the Redis instance used by the application.',
  });
}

if (proofMode && !skipWorker) {
  add('worker-package', fs.existsSync(path.join(repoRoot, 'apps/worker/package.json')), {
    remediation: 'Restore apps/worker/package.json before running the worker stability proof.',
  });
}

if (proofMode && !skipBackup) {
  add('restore-database-url', Boolean(process.env.MVP_RESTORE_DATABASE_URL), {
    actual: process.env.MVP_RESTORE_DATABASE_URL ? 'configured' : 'not configured',
    remediation: 'Set MVP_RESTORE_DATABASE_URL to a disposable PostgreSQL database to prove restore behavior.',
  });
}

const failed = checks.filter((check) => !check.ok);
const summary = {
  checkedAt: new Date().toISOString(),
  ok: failed.length === 0,
  checks: checks.length,
  failed: failed.length,
  proofMode,
};
const result = { summary, checks };

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Production doctor: ${summary.ok ? 'PASS' : 'FAIL'} (${checks.length - failed.length}/${checks.length} checks passed)`);
  for (const check of checks) {
    const marker = check.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${check.name}${check.actual ? `: ${check.actual}` : ''}`);
    if (!check.ok && check.remediation) console.log(`       ${check.remediation}`);
  }
}

if (!summary.ok) process.exit(1);
