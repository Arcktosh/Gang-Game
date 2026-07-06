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

function requireIncludes(relativePath, requiredTerms) {
  const source = requireFile(relativePath);
  for (const term of requiredTerms) {
    if (!source.includes(term)) {
      errors.push(`${relativePath} must include ${term}.`);
    }
  }
}

const rootPackage = json('package.json');
const dbPackage = json('packages/db/package.json');

const requiredRootScripts = [
  'db:apply:admin-roles',
  'db:apply:job-lifecycle',
  'db:apply:monetization',
  'validate:static',
  'validate:ci',
  'validate:runtime',
  'validate:mvp-pages',
  'validate:mvp-gameplay',
  'validate:admin-rbac',
  'validate:job-lifecycle',
  'validate:legal-recovery',
  'validate:release-readiness',
  'validate:mvp-acceptance',
  'db:backup',
  'db:restore',
];

for (const scriptName of requiredRootScripts) {
  if (!rootPackage.scripts?.[scriptName]) {
    errors.push(`package.json is missing ${scriptName}.`);
  }
}

if (!rootPackage.scripts?.['validate:static']?.includes('pnpm validate:mvp-acceptance')) {
  errors.push('package.json validate:static must include pnpm validate:mvp-acceptance.');
}

for (const scriptName of ['db:apply:admin-roles', 'db:apply:job-lifecycle', 'db:apply:monetization']) {
  if (!dbPackage.scripts?.[scriptName]) {
    errors.push(`packages/db/package.json is missing ${scriptName}.`);
  }
}

const requiredPages = [
  'apps/web/src/app/(auth)/login/page.tsx',
  'apps/web/src/app/(auth)/register/page.tsx',
  'apps/web/src/app/(game)/dashboard/page.tsx',
  'apps/web/src/app/(game)/profile/page.tsx',
  'apps/web/src/app/(game)/jobs/page.tsx',
  'apps/web/src/app/(game)/crimes/page.tsx',
  'apps/web/src/app/(game)/legal/page.tsx',
  'apps/web/src/app/(game)/market/page.tsx',
  'apps/web/src/app/(game)/shops/page.tsx',
  'apps/web/src/app/(game)/messages/page.tsx',
  'apps/web/src/app/(game)/newspaper/page.tsx',
  'apps/web/src/app/(game)/factions/page.tsx',
  'apps/web/src/app/(admin)/admin/page.tsx',
];

for (const page of requiredPages) {
  if (!exists(page)) {
    errors.push(`${page} is missing from the MVP page set.`);
  }
}

const requiredApiRoutes = [
  'apps/web/src/app/api/health/route.ts',
  'apps/web/src/app/api/auth/register/route.ts',
  'apps/web/src/app/api/auth/login/route.ts',
  'apps/web/src/app/api/auth/logout/route.ts',
  'apps/web/src/app/api/auth/me/route.ts',
  'apps/web/src/app/api/characters/route.ts',
  'apps/web/src/app/api/jobs/route.ts',
  'apps/web/src/app/api/crimes/route.ts',
  'apps/web/src/app/api/legal/status/route.ts',
  'apps/web/src/app/api/legal/lawyer/route.ts',
  'apps/web/src/app/api/legal/bribe/route.ts',
  'apps/web/src/app/api/legal/hospital/route.ts',
  'apps/web/src/app/api/hospital/care/route.ts',
  'apps/web/src/app/api/market/route.ts',
  'apps/web/src/app/api/shops/route.ts',
  'apps/web/src/app/api/shops/listings/route.ts',
  'apps/web/src/app/api/shops/purchase/route.ts',
  'apps/web/src/app/api/messages/route.ts',
  'apps/web/src/app/api/messages/stream/route.ts',
  'apps/web/src/app/api/newspaper/route.ts',
  'apps/web/src/app/api/factions/route.ts',
  'apps/web/src/app/api/admin/search/route.ts',
  'apps/web/src/app/api/admin/moderation/route.ts',
  'apps/web/src/app/api/admin/audit/route.ts',
];

for (const route of requiredApiRoutes) {
  if (!exists(route)) {
    errors.push(`${route} is missing from the MVP route set.`);
  }
}

const requiredMigrations = [
  'packages/db/drizzle/0027_idempotency_keys.sql',
  'packages/db/drizzle/0028_hardening_completion.sql',
  'packages/db/drizzle/0029_admin_roles.sql',
  'packages/db/drizzle/0030_job_lifecycle.sql',
  'packages/db/drizzle/0031_monetization_foundation.sql',
];

for (const migration of requiredMigrations) {
  if (!exists(migration)) {
    errors.push(`${migration} is missing from the MVP migration set.`);
  }
}

const requiredValidators = [
  'scripts/validate-migrations.mjs',
  'scripts/audit-hardening.mjs',
  'scripts/audit-route-contracts.mjs',
  'scripts/validate-mvp-pages.mjs',
  'scripts/validate-mvp-gameplay.mjs',
  'scripts/validate-admin-rbac.mjs',
  'scripts/validate-job-lifecycle.mjs',
  'scripts/validate-legal-recovery.mjs',
  'scripts/validate-release-readiness.mjs',
  'scripts/validate-mvp-acceptance.mjs',
  'scripts/validate-runtime-proof.mjs',
  'scripts/validate-integration-tests.mjs',
  'scripts/validate-monetization-foundation.mjs',
  'scripts/validate-docs.mjs',
  'scripts/validate-ci-workflow.mjs',
  'scripts/runtime-smoke.mjs',
];

for (const validator of requiredValidators) {
  if (!exists(validator)) {
    errors.push(`${validator} is missing from the MVP validation set.`);
  }
}

requireIncludes('docs/mvp-acceptance.md', [
  'MVP acceptance status',
  'Static MVP acceptance gate',
  'Runtime proof still required',
  'SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime',
  'pnpm validate:static',
  'pnpm typecheck',
  'pnpm test',
]);

requireIncludes('docs/mvp-release-runbook.md', [
  'pnpm validate:static',
  'pnpm typecheck',
  'pnpm test',
  'SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime',
]);

requireIncludes('docs/backup-restore.md', ['pnpm db:backup', 'pnpm db:restore --']);
requireIncludes('docs/runtime-smoke.md', ['SMOKE_STRICT_HEALTH_OK=true', 'pnpm smoke:runtime']);
requireIncludes('docs/migration-guide.md', ['pnpm db:apply:admin-roles', 'pnpm db:apply:job-lifecycle', 'pnpm db:apply:monetization', '0031_monetization_foundation.sql']);
requireIncludes('README.md', ['Feature Pass 56', 'docs/mvp-acceptance.md', 'pnpm validate:mvp-acceptance', 'pnpm prove:mvp-runtime', 'docs/monetization.md']);
requireIncludes('docs/project-status.md', ['Feature Pass 56', 'MVP candidate']);
requireIncludes('docs/remaining-work.md', ['Feature Pass 56', 'Runtime proof still required']);
requireIncludes('docs/feature-checklist.md', ['Feature Pass 56', 'Static MVP acceptance gate']);
requireIncludes('docs/validation-audit.md', ['validate:mvp-acceptance', 'validate:integration-tests', 'validate:monetization', 'MVP acceptance']);

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    requiredRootScripts: requiredRootScripts.length,
    requiredPages: requiredPages.length,
    requiredApiRoutes: requiredApiRoutes.length,
    requiredMigrations: requiredMigrations.length,
    requiredValidators: requiredValidators.length,
    notes: notes.length,
    errors: errors.length,
    ok: errors.length === 0,
  },
  notes,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
