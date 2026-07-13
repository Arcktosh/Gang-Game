import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectations = [
  {
    manifest: 'apps/worker/package.json',
    tests: ['apps/worker/src/__tests__/tick-runner.test.ts'],
  },
  {
    manifest: 'packages/db/package.json',
    tests: ['packages/db/src/__tests__/transaction-normalization.test.ts'],
  },
  {
    manifest: 'packages/ui/package.json',
    tests: ['packages/ui/src/__tests__/stat-card.test.tsx'],
  },
];

const placeholderPattern = /\b(no tests?|placeholder|not configured)\b/i;
const failures = [];

for (const expectation of expectations) {
  const manifestPath = path.join(root, expectation.manifest);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const testCommand = manifest.scripts?.test;

  if (typeof testCommand !== 'string' || testCommand.trim().length === 0) {
    failures.push(`${expectation.manifest} has no executable test command.`);
  } else if (placeholderPattern.test(testCommand)) {
    failures.push(`${expectation.manifest} still uses a placeholder test command: ${testCommand}`);
  }

  for (const testFile of expectation.tests) {
    if (!fs.existsSync(path.join(root, testFile))) {
      failures.push(`Missing package baseline test: ${testFile}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Package test baseline validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Package test baseline validation passed.');
