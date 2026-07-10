#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function requireFile(relativePath) {
  if (!exists(relativePath)) {
    errors.push(`${relativePath} is missing.`);
    return '';
  }
  return read(relativePath);
}

function requireIncludes(relativePath, terms) {
  const source = requireFile(relativePath);
  for (const term of terms) {
    if (!source.includes(term)) {
      errors.push(`${relativePath} must include ${term}.`);
    }
  }
}

const publicPages = [
  ['privacy page', 'apps/web/src/app/(public)/privacy/page.tsx', ['Privacy Policy', 'Live payment processing is intentionally disabled', '/terms', '/rules']],
  ['terms page', 'apps/web/src/app/(public)/terms/page.tsx', ['Terms of Service', 'fictional browser MMO', 'Fair play', '/privacy']],
  ['rules page', 'apps/web/src/app/(public)/rules/page.tsx', ['Community Rules', 'Moderation workflow', 'report', '/privacy']],
  ['onboarding page', 'apps/web/src/app/(public)/onboarding/page.tsx', ['First Session Checklist', 'Create an account', 'Apply for a starter job', '/register']],
];

for (const [label, relativePath, terms] of publicPages) {
  requireIncludes(relativePath, terms);
}

requireIncludes('apps/web/src/app/page.tsx', ['/privacy', '/terms', '/rules', '/onboarding']);

const policyDocs = [
  ['docs/privacy-policy.md', ['Privacy Policy Draft', 'Data categories', 'Payments', 'Pre-launch action']],
  ['docs/terms-of-service.md', ['Terms of Service Draft', 'Fictional gameplay', 'Beta state', 'Pre-launch action']],
  ['docs/community-rules.md', ['Community Rules', 'Enforcement ladder', 'Operator workflow']],
  ['docs/beta-test-plan.md', ['Public Beta Test Plan', 'pnpm prove:mvp-runtime', 'prove:integration', 'First-session script', 'Exit criteria']],
];

for (const [relativePath, terms] of policyDocs) {
  requireIncludes(relativePath, terms);
}

const packageJson = JSON.parse(requireFile('package.json'));
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('scripts/validate-public-launch.mjs')) {
  errors.push('package.json validate:static must include scripts/validate-public-launch.mjs.');
}

requireIncludes('README.md', ['docs/privacy-policy.md', 'docs/terms-of-service.md', 'docs/community-rules.md', 'docs/beta-test-plan.md', 'Feature Pass 59']);
requireIncludes('docs/mvp-release-runbook.md', ['docs/privacy-policy.md', 'docs/terms-of-service.md', 'docs/community-rules.md', 'docs/beta-test-plan.md']);
requireIncludes('docs/mvp-acceptance.md', ['Public launch polish', 'privacy', 'terms', 'community rules', 'beta test plan']);
requireIncludes('docs/project-status.md', ['Feature Pass 59', 'public launch polish']);
requireIncludes('docs/remaining-work.md', ['Feature Pass 59', 'Production legal review']);
requireIncludes('docs/feature-checklist.md', ['Feature Pass 59', 'Public launch polish']);
requireIncludes('docs/validation-audit.md', ['validate:public-launch', 'public launch']);

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    publicPages: publicPages.length,
    policyDocs: policyDocs.length,
    errors: errors.length,
    ok: errors.length === 0,
  },
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
