#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function requireFile(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    failures.push(`missing required file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

const requiredFiles = [
  'packages/db/drizzle/0045_admin_audit_workbench.sql',
  'apps/web/src/app/api/admin/audit/economy/route.ts',
  'apps/web/src/app/api/admin/audit/inventory/route.ts',
  'apps/web/src/app/api/admin/audit/sessions/route.ts',
  'apps/web/src/app/api/admin/audit/csv.ts',
  'scripts/validate-admin-audit-workbench.mjs',
];

for (const file of requiredFiles) requireFile(file);

const tokenChecks = [
  ['packages/db/drizzle/0045_admin_audit_workbench.sql', 'financial_transactions_amount_created_at_idx'],
  ['packages/db/drizzle/0045_admin_audit_workbench.sql', 'inventory_items_item_quantity_idx'],
  ['packages/db/drizzle/0045_admin_audit_workbench.sql', 'user_sessions_ip_last_seen_at_idx'],
  ['packages/db/src/queries/admin.ts', 'listAdminEconomyAudit'],
  ['packages/db/src/queries/admin.ts', 'listAdminInventoryAudit'],
  ['packages/db/src/queries/admin.ts', 'listAdminSessionAudit'],
  ['packages/validators/src/index.ts', 'adminEconomyAuditQuerySchema'],
  ['packages/validators/src/index.ts', 'adminInventoryAuditQuerySchema'],
  ['packages/validators/src/index.ts', 'adminSessionAuditQuerySchema'],
  ['apps/web/src/app/(admin)/admin/page.tsx', 'listAdminEconomyAudit'],
  ['apps/web/src/features/admin/admin-panel.tsx', 'Admin audit workbench'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/audit/economy'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/audit/inventory'],
  ['apps/web/src/features/admin/admin-panel.tsx', '/api/admin/audit/sessions'],
];

for (const [file, token] of tokenChecks) {
  const source = requireFile(file);
  if (source && !source.includes(token)) {
    failures.push(`${file} is missing required token: ${token}`);
  }
}

for (const route of [
  'apps/web/src/app/api/admin/audit/economy/route.ts',
  'apps/web/src/app/api/admin/audit/inventory/route.ts',
  'apps/web/src/app/api/admin/audit/sessions/route.ts',
]) {
  const source = requireFile(route);
  for (const token of ['requireAdminCapability', 'withApiObservability', 'assertRateLimit', 'format', 'csvResponse']) {
    if (source && !source.includes(token)) {
      failures.push(`${route} is missing required route token: ${token}`);
    }
  }
}


const typedRouteChecks = [
  ['apps/web/src/app/api/admin/audit/economy/route.ts', 'AdminEconomyAuditTransaction', 'transaction: AdminEconomyAuditTransaction'],
  ['apps/web/src/app/api/admin/audit/inventory/route.ts', 'AdminInventoryAuditItem', 'item: AdminInventoryAuditItem'],
  ['apps/web/src/app/api/admin/audit/sessions/route.ts', 'AdminSessionAuditSession', 'session: AdminSessionAuditSession'],
];

for (const [route, importType, callbackType] of typedRouteChecks) {
  const source = requireFile(route);
  if (source && !source.includes(`type ${importType}`)) {
    failures.push(`${route} must import ${importType} for CSV mapper type safety.`);
  }
  if (source && !source.includes(callbackType)) {
    failures.push(`${route} must type its CSV mapper parameter as ${callbackType}.`);
  }
}


const adminPanelSource = requireFile('apps/web/src/features/admin/admin-panel.tsx');
const adminPanelTypeChecks = [
  'type { AdminEconomyAuditTransaction, AdminInventoryAuditItem, AdminSessionAuditSession, AdminTransactionType }',
  'transactions: AdminEconomyAuditTransaction[]',
  'items: AdminInventoryAuditItem[]',
  'sessions: AdminSessionAuditSession[]',
  "transaction.description ?? 'No description'",
  "item.characterName ?? 'unknown character'",
  "session.email ?? 'unknown email'",
];

for (const token of adminPanelTypeChecks) {
  if (adminPanelSource && !adminPanelSource.includes(token)) {
    failures.push(`apps/web/src/features/admin/admin-panel.tsx is missing admin audit nullable type safety token: ${token}`);
  }
}

const packageJson = JSON.parse(requireFile('package.json') || '{}');
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('validate-admin-audit-workbench.mjs')) {
  failures.push('validate:static must include validate-admin-audit-workbench.mjs.');
}

if (failures.length > 0) {
  console.error('Admin audit workbench validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Admin audit workbench validation passed.');
