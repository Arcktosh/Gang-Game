#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'packages/db/drizzle/0044_operational_anomalies.sql',
  'packages/db/src/queries/anomalies.ts',
  'packages/game/src/anomaly-detection.ts',
  'apps/worker/src/ticks/anomaly-tick.ts',
  'apps/web/src/app/api/admin/anomalies/[anomalyId]/route.ts',
  'apps/web/src/app/api/admin/anomalies/scan/route.ts',
  'scripts/validate-operational-anomalies.mjs',
];

const requiredTokens = [
  ['packages/db/drizzle/0044_operational_anomalies.sql', 'CREATE TABLE IF NOT EXISTS operational_anomalies'],
  ['packages/db/drizzle/0044_operational_anomalies.sql', 'operational_anomalies_signal_key_unique'],
  ['packages/db/src/schema/index.ts', 'export const operationalAnomalies = pgTable'],
  ['packages/db/src/queries/anomalies.ts', 'runOperationalAnomalyScan'],
  ['packages/db/src/queries/anomalies.ts', 'resolveOperationalAnomaly'],
  ['packages/db/src/queries/anomalies.ts', 'listOperationalAnomalies'],
  ['packages/game/src/anomaly-detection.ts', 'DEFAULT_OPERATIONAL_ANOMALY_THRESHOLDS'],
  ['apps/worker/src/index.ts', 'startAnomalyTick'],
  ['apps/web/src/app/(admin)/admin/page.tsx', 'listOperationalAnomalies'],
  ['apps/web/src/features/admin/admin-panel.tsx', 'Operational anomalies'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/anomalies/scan'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/anomalies/${anomalyId}'],
  ['packages/validators/src/index.ts', 'ANOMALY_SCAN_TICK_MS'],
  ['.env.example', 'ANOMALY_HIGH_NET_WORTH'],
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push(`missing required anomaly file: ${file}`);
  }
}

for (const [file, token] of requiredTokens) {
  const path = join(root, file);
  if (!existsSync(path)) {
    failures.push(`missing file for token check: ${file}`);
    continue;
  }

  const source = readFileSync(path, 'utf8');
  if (!source.includes(token)) {
    failures.push(`${file} is missing required token: ${token}`);
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts['validate:static'].includes('validate-operational-anomalies.mjs')) {
  failures.push('validate:static must include validate-operational-anomalies.mjs');
}

if (failures.length > 0) {
  console.error('Operational anomaly validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Operational anomaly validation passed.');
