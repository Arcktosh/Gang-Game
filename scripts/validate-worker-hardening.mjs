#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const tickRoot = path.join(repoRoot, 'apps', 'worker', 'src', 'ticks');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const errors = [];
const notes = [];

const tickRunner = read('apps/worker/src/tick-runner.ts');
for (const required of ['recordWorkerDeadLetter', 'WORKER_TICK_MAX_ATTEMPTS', 'WORKER_TICK_RETRY_BASE_MS', 'WORKER_TICK_RETRY_MAX_MS', 'previous tick still running', 'setInterval']) {
  if (!tickRunner.includes(required)) {
    errors.push(`apps/worker/src/tick-runner.ts is missing ${required}.`);
  }
}

const tickFiles = fs
  .readdirSync(tickRoot)
  .filter((file) => file.endsWith('.ts'))
  .sort();

for (const file of tickFiles) {
  const relativePath = `apps/worker/src/ticks/${file}`;
  const source = read(relativePath);

  if (!source.includes("from '../tick-runner'")) {
    errors.push(`${relativePath} does not import the shared worker tick scheduler.`);
  }

  if (!source.includes('scheduleWorkerTick')) {
    errors.push(`${relativePath} does not use scheduleWorkerTick.`);
  }

  if (/\bsetInterval\s*\(/.test(source)) {
    errors.push(`${relativePath} still schedules its own interval instead of using scheduleWorkerTick.`);
  }

  if (/\.catch\s*\(\s*\(?\s*error\b/.test(source) || /catch\s*\(\s*error\s*\)/.test(source)) {
    errors.push(`${relativePath} still has local error handling instead of shared retry/dead-letter handling.`);
  }
}

const schema = read('packages/db/src/schema/index.ts');
if (!schema.includes('export const workerDeadLetters = pgTable')) {
  errors.push('packages/db/src/schema/index.ts is missing workerDeadLetters schema.');
}

const migration = read('packages/db/drizzle/0041_worker_dead_letters.sql');
for (const required of ['CREATE TABLE IF NOT EXISTS worker_dead_letters', 'worker_dead_letters_status_created_idx', 'worker_dead_letters_tick_created_idx']) {
  if (!migration.includes(required)) {
    errors.push(`0041_worker_dead_letters.sql is missing ${required}.`);
  }
}

const workerOps = read('packages/db/src/queries/worker-ops.ts');
for (const required of ['recordWorkerDeadLetter', 'listOpenWorkerDeadLetters', 'resolveWorkerDeadLetter']) {
  if (!workerOps.includes(required)) {
    errors.push(`packages/db/src/queries/worker-ops.ts is missing ${required}.`);
  }
}

const featureChecklist = read('docs/feature-checklist.md');
if (!featureChecklist.includes('Feature Pass 89 - Achievement idempotency and worker dead letters')) {
  errors.push('docs/feature-checklist.md is missing Feature Pass 89 worker-hardening notes.');
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    tickFiles: tickFiles.length,
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
