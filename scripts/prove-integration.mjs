#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const startedAt = new Date();
const artifactPath = path.join(process.cwd(), 'artifacts', 'integration-proof.json');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const steps = [];

function writeArtifact(status, error = null) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(
    artifactPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        status,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        database: testDatabaseUrl ? { configured: true, safeNameDetected: /test|localhost|127\.0\.0\.1/i.test(testDatabaseUrl) } : { configured: false },
        steps,
        error,
      },
      null,
      2,
    )}\n`,
  );
}

function fail(message, exitCode = 1) {
  console.error(message);
  writeArtifact('failed', message);
  process.exit(exitCode);
}

if (!testDatabaseUrl) fail('TEST_DATABASE_URL is required. It must point at a disposable PostgreSQL database.');
if (/prod|production/i.test(testDatabaseUrl) || !/test|localhost|127\.0\.0\.1/i.test(testDatabaseUrl)) {
  fail('Refusing to run integration proof against an unsafe TEST_DATABASE_URL.');
}

const commands = [
  { name: 'apply-migrations', command: 'pnpm', args: ['db:apply:all'] },
  { name: 'run-integration-suite', command: 'pnpm', args: ['test:integration'] },
];

for (const step of commands) {
  console.log(`\n$ ${step.command} ${step.args.join(' ')}`);
  const stepStartedAt = Date.now();
  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      RUN_DB_INTEGRATION_TESTS: 'true',
    },
    shell: process.platform === 'win32',
  });
  steps.push({
    name: step.name,
    command: [step.command, ...step.args].join(' '),
    exitCode: result.status,
    durationMs: Date.now() - stepStartedAt,
  });
  if (result.error) fail(`${step.name} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${step.name} failed with exit code ${result.status ?? 1}.`, result.status ?? 1);
}

writeArtifact('passed');
console.log(`\nIntegration proof passed. Evidence written to ${artifactPath}.`);
