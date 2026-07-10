#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing ${relativePath}.`);
    return '';
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

const requiredFlags = [
  'feature.messages',
  'feature.newspaper',
  'feature.shops',
  'feature.trades',
  'feature.gambling',
  'feature.finance',
  'feature.market',
  'feature.contracts',
  'feature.factions',
  'feature.pvp',
];

const migration = read('packages/db/drizzle/0043_feature_flags.sql');
for (const flag of requiredFlags) {
  if (!migration.includes(flag)) {
    errors.push(`0043_feature_flags.sql is missing ${flag}.`);
  }
}

const gameFlags = read('packages/game/src/feature-flags.ts');
for (const required of ['FEATURE_FLAG_DEFINITIONS', 'normalizeFeatureFlagValue', 'buildFeatureFlagValue', 'isFeatureFlagKey']) {
  if (!gameFlags.includes(required)) {
    errors.push(`packages/game/src/feature-flags.ts is missing ${required}.`);
  }
}

const dbFlags = read('packages/db/src/queries/feature-flags.ts');
for (const required of ['listFeatureFlagStates', 'getFeatureFlagState', 'isFeatureEnabled', 'gameConfigEntries']) {
  if (!dbFlags.includes(required)) {
    errors.push(`packages/db/src/queries/feature-flags.ts is missing ${required}.`);
  }
}

const webHelper = read('apps/web/src/lib/feature-flags.ts');
for (const required of ['requireFeatureEnabled', 'feature_disabled', 'getFeatureFlagState']) {
  if (!webHelper.includes(required)) {
    errors.push(`apps/web/src/lib/feature-flags.ts is missing ${required}.`);
  }
}

const routeCoverage = new Map([
  ['feature.messages', ['apps/web/src/app/api/messages/route.ts']],
  ['feature.newspaper', ['apps/web/src/app/api/newspaper/route.ts']],
  ['feature.shops', [
    'apps/web/src/app/api/shops/route.ts',
    'apps/web/src/app/api/shops/actions/route.ts',
    'apps/web/src/app/api/shops/listings/route.ts',
    'apps/web/src/app/api/shops/purchase/route.ts',
  ]],
  ['feature.trades', [
    'apps/web/src/app/api/trades/route.ts',
    'apps/web/src/app/api/trades/[tradeOfferId]/route.ts',
  ]],
  ['feature.gambling', ['apps/web/src/app/api/gambling/route.ts']],
  ['feature.finance', ['apps/web/src/app/api/finance/route.ts']],
  ['feature.market', ['apps/web/src/app/api/market/route.ts']],
  ['feature.contracts', [
    'apps/web/src/app/api/contracts/route.ts',
    'apps/web/src/app/api/contracts/[contractId]/accept/route.ts',
    'apps/web/src/app/api/contracts/[contractId]/cancel/route.ts',
    'apps/web/src/app/api/contracts/[contractId]/complete/route.ts',
  ]],
  ['feature.factions', [
    'apps/web/src/app/api/factions/route.ts',
    'apps/web/src/app/api/factions/[factionId]/bank/route.ts',
    'apps/web/src/app/api/factions/[factionId]/inventory/route.ts',
    'apps/web/src/app/api/factions/[factionId]/join/route.ts',
    'apps/web/src/app/api/factions/[factionId]/leave/route.ts',
    'apps/web/src/app/api/factions/[factionId]/members/route.ts',
  ]],
  ['feature.pvp', ['apps/web/src/app/api/pvp/attack/route.ts']],
]);

for (const [flag, files] of routeCoverage) {
  for (const file of files) {
    const contents = read(file);
    if (!contents.includes(`requireFeatureEnabled('${flag}')`)) {
      errors.push(`${file} does not check ${flag}.`);
    }
  }
}

const adminPage = read('apps/web/src/app/(admin)/admin/page.tsx');
if (!adminPage.includes('listFeatureFlagStates()') || !adminPage.includes('featureFlags={featureFlags}')) {
  errors.push('Admin page does not load and pass feature flag state.');
}

const adminPanel = read('apps/web/src/features/admin/admin-panel.tsx');
for (const required of ['Feature flags', 'handleFeatureFlag', 'Operational kill switches', 'featureFlags.map']) {
  if (!adminPanel.includes(required)) {
    errors.push(`Admin panel is missing ${required}.`);
  }
}

const featureChecklist = read('docs/feature-checklist.md');
if (!featureChecklist.includes('Feature Pass 91 - Operational feature flags')) {
  errors.push('docs/feature-checklist.md is missing Feature Pass 91 notes.');
}

const packageJson = JSON.parse(read('package.json'));
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('scripts/validate-feature-flags.mjs')) {
  errors.push('validate:static does not include scripts/validate-feature-flags.mjs.');
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    errors: errors.length,
    ok: errors.length === 0,
  },
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
