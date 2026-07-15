#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];
const notes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function requireFile(relativePath) {
  if (!exists(relativePath)) {
    errors.push(`${relativePath} is missing.`);
    return '';
  }

  return read(relativePath);
}

function requireTerms(relativePath, terms) {
  const source = requireFile(relativePath);
  for (const term of terms) {
    if (!source.includes(term)) {
      errors.push(`${relativePath} must include ${term}.`);
    }
  }
}

function hasExecutableBit(relativePath) {
  if (process.platform === 'win32') {
    return true;
  }

  const mode = fs.statSync(path.join(repoRoot, relativePath)).mode;
  return (mode & 0o111) !== 0;
}

const rootPackage = json('package.json');

if (!rootPackage.scripts?.['prove:mvp-runtime']) {
  errors.push('package.json is missing prove:mvp-runtime.');
}

if (!String(rootPackage.scripts?.['validate:static'] ?? '').includes('scripts/validate-runtime-proof.mjs')) {
  errors.push('package.json validate:static must include scripts/validate-runtime-proof.mjs.');
}

if (!exists('packages/db/scripts/apply-migrations.ts')) {
  errors.push('packages/db/scripts/apply-migrations.ts is missing.');
} else {
  const migrationRunner = read('packages/db/scripts/apply-migrations.ts');
  for (const term of ['schema_migrations', 'DB_MIGRATIONS_BASELINE_THROUGH', 'DB_MIGRATIONS_ALLOW_CHECKSUM_MISMATCH', 'sha256']) {
    if (!migrationRunner.includes(term)) {
      errors.push(`packages/db/scripts/apply-migrations.ts must include ${term}.`);
    }
  }
}

if (!rootPackage.scripts?.['db:apply:all']) {
  errors.push('package.json is missing db:apply:all.');
}

const dbPackage = json('packages/db/package.json');
if (!dbPackage.scripts?.['db:apply:all']?.includes('apply-migrations.ts')) {
  errors.push('packages/db/package.json db:apply:all must run scripts/apply-migrations.ts.');
}

if (!exists('scripts/prove-mvp-runtime.mjs')) {
  errors.push('scripts/prove-mvp-runtime.mjs is missing.');
} else {
  if (!hasExecutableBit('scripts/prove-mvp-runtime.mjs')) {
    errors.push('scripts/prove-mvp-runtime.mjs must be executable.');
  }

  const proofScript = read('scripts/prove-mvp-runtime.mjs');
  const requiredScriptTerms = [
    'pnpm install',
    'docker',
    'compose',
    'db:apply:all',
    'validate:static',
    'typecheck',
    'build',
    'test',
    'prove:redis-rate-limit',
    'RATE_LIMIT_REDIS_REQUIRED',
    '@drugdeal/web start',
    '@drugdeal/worker',
    'worker-stability',
    'MVP_PROOF_ARTIFACT',
    '--frozen-lockfile',
    'SMOKE_STRICT_HEALTH_OK',
    'smoke:runtime',
    'db:backup',
    'db:restore',
    'MVP_RESTORE_DATABASE_URL',
    '--dry-run',
    'shouldUseShell',
    'sanitizeEnv',
    'windowsHide',
  ];

  for (const term of requiredScriptTerms) {
    if (!proofScript.includes(term)) {
      errors.push(`scripts/prove-mvp-runtime.mjs must include ${term}.`);
    }
  }

  if (!proofScript.includes("'db:apply:all'")) {
    errors.push('scripts/prove-mvp-runtime.mjs should use the idempotent db:apply:all migration runner.');
  }
}

requireTerms('docs/mvp-release-runbook.md', [
  'pnpm prove:mvp-runtime',
  'MVP_RESTORE_DATABASE_URL',
  'MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime',
  'Feature Pass 56',
]);

requireTerms('docs/mvp-acceptance.md', [
  'pnpm prove:mvp-runtime',
  'Runtime proof command',
  'MVP_RESTORE_DATABASE_URL',
]);

requireTerms('docs/runtime-smoke.md', [
  'pnpm prove:mvp-runtime',
  'SMOKE_STRICT_HEALTH_OK=true',
]);

requireTerms('docs/backup-restore.md', [
  'MVP_RESTORE_DATABASE_URL',
  'pnpm prove:mvp-runtime',
]);

requireTerms('docs/remaining-work.md', [
  'Feature Pass 56',
  'pnpm prove:mvp-runtime',
  'Runtime proof still required',
]);

requireTerms('docs/project-status.md', [
  'Feature Pass 56',
  'runtime proof orchestrator',
]);

requireTerms('docs/feature-checklist.md', [
  'Feature Pass 56',
  'prove:mvp-runtime',
]);

requireTerms('docs/validation-audit.md', [
  'validate:runtime-proof',
  'prove:mvp-runtime',
]);

requireTerms('README.md', [
  'Feature Pass 56',
  'pnpm prove:mvp-runtime',
  'validate:runtime-proof',
]);

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    errors: errors.length,
    notes: notes.length,
    ok: errors.length === 0,
  },
  notes,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
