#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'docs/integration-testing.md',
  'scripts/prove-integration.mjs',
  'packages/db/src/testing/integration.ts',
  'apps/web/src/lib/__tests__/mvp-flow.integration.test.ts',
];

const requiredPackageScripts = ['test:integration', 'prove:integration'];
const requiredDocTokens = [
  'RUN_DB_INTEGRATION_TESTS=true',
  'TEST_DATABASE_URL',
  'pnpm prove:integration',
  'job',
  'crime',
  'legal status',
];
const requiredTestTokens = [
  'shouldRunDbIntegrationTests',
  'resetMvpIntegrationState',
  'createIntegrationUser',
  'createIntegrationCharacter',
  'calculateProgressionFromExperience',
];

const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`${file} is missing.`);
  }
}

if (fs.existsSync(path.join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of requiredPackageScripts) {
    if (!packageJson.scripts?.[script]) {
      errors.push(`package.json is missing ${script}.`);
    }
  }

  if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('scripts/validate-integration-tests.mjs')) {
    errors.push('validate:static does not include scripts/validate-integration-tests.mjs.');
  }
}

if (fs.existsSync(path.join(root, 'docs/integration-testing.md'))) {
  const doc = read('docs/integration-testing.md');
  for (const token of requiredDocTokens) {
    if (!doc.includes(token)) {
      errors.push(`docs/integration-testing.md is missing ${token}.`);
    }
  }
}

if (fs.existsSync(path.join(root, 'apps/web/src/lib/__tests__/mvp-flow.integration.test.ts'))) {
  const testSource = read('apps/web/src/lib/__tests__/mvp-flow.integration.test.ts');
  for (const token of requiredTestTokens) {
    if (!testSource.includes(token)) {
      errors.push(`mvp-flow.integration.test.ts is missing ${token}.`);
    }
  }

  if (!testSource.includes('skip: !integrationEnabled')) {
    errors.push('mvp-flow.integration.test.ts must remain opt-in unless RUN_DB_INTEGRATION_TESTS=true.');
  }
}

const summary = {
  validatedAt: new Date().toISOString(),
  requiredFiles: requiredFiles.length,
  requiredPackageScripts: requiredPackageScripts.length,
  errors: errors.length,
  ok: errors.length === 0,
};

console.log(JSON.stringify({ summary, errors }, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
