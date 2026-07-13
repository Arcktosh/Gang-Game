#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

for (const file of ['scripts/production-doctor.mjs', 'scripts/prove-mvp-runtime.mjs']) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file} is missing.`);
}

if (pkg.scripts?.['doctor:production'] !== 'node scripts/production-doctor.mjs') {
  errors.push('package.json must expose doctor:production.');
}
if (pkg.scripts?.['doctor:proof'] !== 'node scripts/production-doctor.mjs --proof') {
  errors.push('package.json must expose doctor:proof.');
}
if (!String(pkg.scripts?.['validate:static'] ?? '').includes('validate-production-doctor.mjs')) {
  errors.push('validate:static must include validate-production-doctor.mjs.');
}

const doctor = read('scripts/production-doctor.mjs');
for (const term of ['pnpm', 'docker-compose', 'pg_dump', 'pg_restore', 'DATABASE_URL', 'AUTH_SECRET', 'MVP_RESTORE_DATABASE_URL', '--proof', '--json']) {
  if (!doctor.includes(term)) errors.push(`production doctor must check/support ${term}.`);
}

const proof = read('scripts/prove-mvp-runtime.mjs');
for (const term of ['skipPreflight', 'production-doctor.mjs', '--proof']) {
  if (!proof.includes(term)) errors.push(`runtime proof must include ${term}.`);
}

console.log(JSON.stringify({ summary: { ok: errors.length === 0, errors: errors.length }, errors }, null, 2));
if (errors.length) process.exit(1);
