#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expectFile(relativePath, label = relativePath) {
  const exists = fs.existsSync(path.join(root, relativePath));
  checks.push({ check: `file:${label}`, ok: exists });
  if (!exists) errors.push(`${relativePath} is missing.`);
  return exists;
}

function expectIncludes(relativePath, needles) {
  const source = read(relativePath);
  for (const needle of needles) {
    const ok = source.includes(needle);
    checks.push({ check: `${relativePath} includes ${needle}`, ok });
    if (!ok) errors.push(`${relativePath} does not include ${needle}.`);
  }
}

if (expectFile('apps/web/src/app/api/legal/hospital/route.ts', 'hospital care API route')) {
  expectIncludes('apps/web/src/app/api/legal/hospital/route.ts', [
    'withApiObservability',
    'requireRequestUserId',
    'assertRateLimit',
    'withIdempotency',
    'hospitalCareSchema',
    'buyHospitalCare',
    'refreshCharacterResources',
  ]);
}

expectIncludes('packages/db/src/queries/action-state.ts', [
  'statusExpired',
  'hospitalStays',
  'jailSentences',
  "status: statusExpired ? 'free' : character.status",
  'statusReason: statusExpired ? null : character.statusReason',
]);

expectIncludes('apps/web/src/app/api/legal/status/route.ts', [
  'refreshCharacterHeat',
  'refreshCharacterResources',
  'activeJailSentence',
  'activeHospitalStay',
]);

expectIncludes('packages/db/src/queries/legal.ts', [
  'buyHospitalCare',
  'calculateCareService',
  'hospital_care_bought',
]);

expectIncludes('packages/validators/src/index.ts', ['hospitalCareSchema']);
expectIncludes('apps/web/src/app/(game)/legal/page.tsx', [
  'POST /api/legal/hospital',
  'Recovery actions',
]);
expectIncludes('docs/api-reference.md', ['`/api/legal/hospital`']);

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    checks: checks.length,
    errors: errors.length,
    ok: errors.length === 0,
  },
  failedChecks: checks.filter((check) => !check.ok),
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
