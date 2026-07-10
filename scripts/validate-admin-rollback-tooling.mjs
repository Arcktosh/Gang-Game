#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`missing required file: ${relativePath}`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

const requiredFiles = [
  'packages/db/drizzle/0046_admin_rollback_action_types.sql',
  'packages/db/drizzle/0047_admin_rollback_tooling.sql',
  'apps/web/src/app/api/admin/rollback/route.ts',
  'scripts/validate-admin-rollback-tooling.mjs',
];

for (const file of requiredFiles) read(file);

const tokenChecks = [
  ['packages/db/drizzle/0046_admin_rollback_action_types.sql', "'rollback_apply'"],
  ['packages/db/drizzle/0047_admin_rollback_tooling.sql', 'admin_action_logs_rollback_original_idx'],
  ['packages/db/src/schema/index.ts', "'rollback_apply'"],
  ['packages/db/src/queries/admin.ts', 'listAdminRollbackCandidates'],
  ['packages/db/src/queries/admin.ts', 'applyAdminActionRollback'],
  ['packages/db/src/queries/admin.ts', 'originalActionLogId'],
  ['apps/web/src/app/(admin)/admin/page.tsx', 'listAdminRollbackCandidates'],
  ['apps/web/src/app/(admin)/admin/page.tsx', 'rollbackCandidates'],
  ['apps/web/src/app/api/admin/rollback/route.ts', 'requireAdminCapability'],
  ['apps/web/src/app/api/admin/rollback/route.ts', 'manage_economy'],
  ['apps/web/src/app/api/admin/rollback/route.ts', 'withIdempotency'],
  ['apps/web/src/app/api/admin/rollback/route.ts', 'applyAdminActionRollback'],
  ['apps/web/src/features/admin/admin-panel.tsx', 'Rollback workbench'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/rollback'],
  ['apps/web/src/features/admin/admin-panel.tsx', 'handleRollback'],
];

for (const [file, token] of tokenChecks) {
  const source = read(file);
  if (source && !source.includes(token)) {
    failures.push(`${file} is missing required token: ${token}`);
  }
}

const packageJson = JSON.parse(read('package.json') || '{}');
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('validate-admin-rollback-tooling.mjs')) {
  failures.push('validate:static must include validate-admin-rollback-tooling.mjs.');
}

if (failures.length > 0) {
  console.error('Admin rollback tooling validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Admin rollback tooling validation passed.');
