#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
const packageJsonPath = path.join(repoRoot, 'package.json');
const errors = [];
const notes = [];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

if (!fs.existsSync(workflowPath)) {
  errors.push('.github/workflows/ci.yml is missing.');
} else {
  const workflow = read(workflowPath);
  const requiredFragments = [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'node-version: 22',
    'corepack enable',
    'pnpm install --no-frozen-lockfile',
    'pnpm validate:ci',
  ];

  for (const fragment of requiredFragments) {
    if (!workflow.includes(fragment)) {
      errors.push(`CI workflow is missing required fragment: ${fragment}`);
    }
  }

  if (!/pull_request\s*:/.test(workflow)) {
    errors.push('CI workflow must run for pull_request events.');
  }

  if (!/push\s*:/.test(workflow)) {
    notes.push('CI workflow does not run for push events.');
  }

  if (!/timeout-minutes:\s*\d+/.test(workflow)) {
    notes.push('CI workflow has no job timeout.');
  }
}

const packageJson = JSON.parse(read(packageJsonPath));
const scripts = packageJson.scripts ?? {};

if (!scripts['validate:ci']) {
  errors.push('package.json is missing validate:ci.');
} else {
  const validateCi = scripts['validate:ci'];
  for (const command of ['pnpm validate:static', 'pnpm typecheck', 'pnpm test']) {
    if (!validateCi.includes(command)) {
      errors.push(`validate:ci must include ${command}.`);
    }
  }
}

if (!scripts['validate:ci-workflow']) {
  errors.push('package.json is missing validate:ci-workflow.');
}

if (!scripts['validate:static']?.includes('pnpm validate:ci-workflow')) {
  errors.push('validate:static must include pnpm validate:ci-workflow.');
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    workflow: path.relative(repoRoot, workflowPath),
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
