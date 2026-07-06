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
  const mode = fs.statSync(path.join(repoRoot, relativePath)).mode;
  return (mode & 0o111) !== 0;
}

const rootPackage = json('package.json');

for (const scriptName of ['prove:mvp-runtime', 'validate:runtime-proof']) {
  if (!rootPackage.scripts?.[scriptName]) {
    errors.push(`package.json is missing ${scriptName}.`);
  }
}

if (!rootPackage.scripts?.['validate:static']?.includes('pnpm validate:runtime-proof')) {
  errors.push('package.json validate:static must include pnpm validate:runtime-proof.');
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
    'db:apply:initial',
    'db:apply:admin-roles',
    'db:apply:job-lifecycle',
    'db:apply:monetization',
    'db:apply:loan-defaulting',
    'validate:static',
    'typecheck',
    'test',
    'SMOKE_STRICT_HEALTH_OK',
    'smoke:runtime',
    'db:backup',
    'db:restore',
    'MVP_RESTORE_DATABASE_URL',
    '--dry-run',
  ];

  for (const term of requiredScriptTerms) {
    if (!proofScript.includes(term)) {
      errors.push(`scripts/prove-mvp-runtime.mjs must include ${term}.`);
    }
  }

  const migrationMatches = [...proofScript.matchAll(/'db:apply:[^']+'|'db:seed'/g)].map((match) => match[0].replaceAll("'", ''));
  const uniqueMigrationCommands = new Set(migrationMatches);
  if (uniqueMigrationCommands.size < 36) {
    errors.push(`scripts/prove-mvp-runtime.mjs should include the full 36-step migration/seed chain, found ${uniqueMigrationCommands.size}.`);
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
