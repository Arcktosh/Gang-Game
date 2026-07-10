#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is required. It must point at a disposable PostgreSQL database.');
  process.exit(1);
}

if (/prod|production/i.test(testDatabaseUrl) || !/test|localhost|127\.0\.0\.1/i.test(testDatabaseUrl)) {
  console.error('Refusing to run integration proof against an unsafe TEST_DATABASE_URL.');
  process.exit(1);
}

const commands = [
  ['pnpm', ['db:apply:all']],
  ['pnpm', ['test:integration']],
];

for (const [command, args] of commands) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      RUN_DB_INTEGRATION_TESTS: 'true',
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
