#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'packages/db/drizzle/0031_monetization_foundation.sql',
  'packages/db/src/queries/monetization.ts',
  'apps/web/src/lib/checkout.ts',
  'apps/web/src/app/api/monetization/catalog/route.ts',
  'apps/web/src/app/api/monetization/entitlements/route.ts',
  'apps/web/src/app/api/monetization/checkout/route.ts',
  'docs/monetization.md',
];
const requiredMigrationTokens = ['product_catalog', 'user_entitlements', 'character_cosmetics', 'founder_badge', 'season_pass_s1'];
const requiredRouteTokens = ['withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'checkoutIntentSchema'];
const requiredDocsTokens = ['cosmetics are allowed', 'GET /api/monetization/catalog', 'POST /api/monetization/checkout', 'STRIPE_SECRET_KEY'];
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`${file} is missing.`);
  }
}

if (fs.existsSync(path.join(root, 'packages/db/drizzle/0031_monetization_foundation.sql'))) {
  const migration = read('packages/db/drizzle/0031_monetization_foundation.sql');
  for (const token of requiredMigrationTokens) {
    if (!migration.includes(token)) {
      errors.push(`0031_monetization_foundation.sql is missing ${token}.`);
    }
  }
}

const checkoutRoute = 'apps/web/src/app/api/monetization/checkout/route.ts';
if (fs.existsSync(path.join(root, checkoutRoute))) {
  const source = read(checkoutRoute);
  for (const token of requiredRouteTokens) {
    if (!source.includes(token)) {
      errors.push(`${checkoutRoute} is missing ${token}.`);
    }
  }
}

if (fs.existsSync(path.join(root, 'docs/monetization.md'))) {
  const doc = read('docs/monetization.md');
  for (const token of requiredDocsTokens) {
    if (!doc.includes(token)) {
      errors.push(`docs/monetization.md is missing ${token}.`);
    }
  }
}

const packageJson = JSON.parse(read('package.json'));
const dbPackageJson = JSON.parse(read('packages/db/package.json'));
for (const script of ['db:apply:monetization', 'validate:monetization']) {
  if (!packageJson.scripts?.[script]) {
    errors.push(`package.json is missing ${script}.`);
  }
}
if (!dbPackageJson.scripts?.['db:apply:monetization']?.includes('0031_monetization_foundation.sql')) {
  errors.push('packages/db/package.json is missing db:apply:monetization for 0031_monetization_foundation.sql.');
}
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('validate:monetization')) {
  errors.push('validate:static does not include validate:monetization.');
}

const apiRef = read('docs/api-reference.md');
for (const route of ['/api/monetization/catalog', '/api/monetization/entitlements', '/api/monetization/checkout']) {
  if (!apiRef.includes(`\`${route}\``)) {
    errors.push(`docs/api-reference.md is missing ${route}.`);
  }
}

const summary = {
  validatedAt: new Date().toISOString(),
  requiredFiles: requiredFiles.length,
  errors: errors.length,
  ok: errors.length === 0,
};
console.log(JSON.stringify({ summary, errors }, null, 2));
if (errors.length > 0) process.exit(1);
