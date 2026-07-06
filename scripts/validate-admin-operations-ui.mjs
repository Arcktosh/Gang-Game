#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing ${relativePath}.`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

const adminPanel = read('apps/web/src/features/admin/admin-panel.tsx');
const adminPage = read('apps/web/src/app/(admin)/admin/page.tsx');
const packageJson = JSON.parse(read('package.json'));

const requiredPanelSnippets = [
  'handleSearch',
  '/api/admin/search',
  'handleFlag',
  '/api/admin/characters/${characterId}/flag',
  'handleResolveFlag',
  '/api/admin/flags/${flagId}/resolve',
  'handleClearStatus',
  '/api/admin/characters/${characterId}/clear-status',
  'handleEnforcement',
  '/api/admin/characters/${characterId}/enforce',
  'handleLiftEnforcement',
  '/api/admin/enforcements/${enforcementId}/lift',
  'handleAppealReview',
  '/api/admin/appeals/${appealId}/review',
  'handleModeration',
  '/api/admin/moderation/reports/${reportId}',
  'handleAdjust',
  '/api/admin/characters/${characterId}/adjust',
  'Moderation transparency',
  'Moderation queue',
  'Active enforcements',
  'Open appeals',
  'Active flags',
  'Admin audit log',
  'Loan exposure',
  'loanExposure',
];

for (const snippet of requiredPanelSnippets) {
  if (!adminPanel.includes(snippet)) {
    errors.push(`Admin operations panel is missing ${snippet}.`);
  }
}

for (const snippet of ['hasAdminCapability', 'view_admin', 'listAdminAudit', 'listAdminLoanExposure', 'listModerationQueue', 'getModerationTransparencySummary']) {
  if (!adminPage.includes(snippet)) {
    errors.push(`Admin page is missing ${snippet}.`);
  }
}

const adminRoutes = [
  'apps/web/src/app/api/admin/search/route.ts',
  'apps/web/src/app/api/admin/economy/loans/route.ts',
  'apps/web/src/app/api/admin/characters/[characterId]/flag/route.ts',
  'apps/web/src/app/api/admin/flags/[flagId]/resolve/route.ts',
  'apps/web/src/app/api/admin/characters/[characterId]/clear-status/route.ts',
  'apps/web/src/app/api/admin/characters/[characterId]/enforce/route.ts',
  'apps/web/src/app/api/admin/enforcements/[enforcementId]/lift/route.ts',
  'apps/web/src/app/api/admin/appeals/[appealId]/review/route.ts',
  'apps/web/src/app/api/admin/moderation/reports/[reportId]/route.ts',
  'apps/web/src/app/api/admin/characters/[characterId]/adjust/route.ts',
];

for (const route of adminRoutes) {
  const source = read(route);
  for (const snippet of ['requireAdminCapability', 'withApiObservability']) {
    if (!source.includes(snippet)) {
      errors.push(`${route} is missing ${snippet}.`);
    }
  }
}

if (!packageJson.scripts?.['validate:admin-operations-ui']) {
  errors.push('package.json is missing validate:admin-operations-ui script.');
}
if (!packageJson.scripts?.['validate:static']?.includes('pnpm validate:admin-operations-ui')) {
  errors.push('validate:static does not include validate:admin-operations-ui.');
}

if (errors.length > 0) {
  console.error('Admin operations UI validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Admin operations UI validation passed: search, moderation, enforcement, appeal, flag, status, economy, loan exposure, and audit surfaces are wired.');
