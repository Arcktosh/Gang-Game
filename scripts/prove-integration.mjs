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
  ['pnpm', ['db:apply:initial']],
  ['pnpm', ['db:seed']],
  ['pnpm', ['db:apply:auth']],
  ['pnpm', ['db:apply:progression']],
  ['pnpm', ['db:apply:gameplay']],
  ['pnpm', ['db:apply:risk']],
  ['pnpm', ['db:apply:legal']],
  ['pnpm', ['db:apply:factions']],
  ['pnpm', ['db:apply:shops']],
  ['pnpm', ['db:apply:finance']],
  ['pnpm', ['db:apply:gambling']],
  ['pnpm', ['db:apply:contracts']],
  ['pnpm', ['db:apply:achievements']],
  ['pnpm', ['db:apply:seasons']],
  ['pnpm', ['db:apply:admin']],
  ['pnpm', ['db:apply:pvp']],
  ['pnpm', ['db:apply:equipment']],
  ['pnpm', ['db:apply:vehicles']],
  ['pnpm', ['db:apply:crafting']],
  ['pnpm', ['db:apply:contacts']],
  ['pnpm', ['db:apply:notifications']],
  ['pnpm', ['db:apply:messages']],
  ['pnpm', ['db:apply:newspaper-social']],
  ['pnpm', ['db:apply:shop-ops']],
  ['pnpm', ['db:apply:moderation']],
  ['pnpm', ['db:apply:enforcement']],
  ['pnpm', ['db:apply:enforcement-ops']],
  ['pnpm', ['db:apply:idempotency']],
  ['pnpm', ['db:apply:hardening']],
  ['pnpm', ['db:apply:admin-roles']],
  ['pnpm', ['db:apply:job-lifecycle']],
  ['pnpm', ['db:apply:monetization']],
  ['pnpm', ['db:apply:auth-recovery']],
  ['pnpm', ['db:apply:runtime-repair']],
  ['pnpm', ['db:apply:loans']],
  ['pnpm', ['db:apply:loan-defaulting']],
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
