#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const requiredEnvKeys = [
  'DATABASE_URL',
  'REDIS_URL',
  'AUTH_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'APP_ORIGIN',
  'TRUSTED_ORIGINS',
];
const requiredPackageScripts = [
  'db:backup',
  'db:restore',
  'smoke:runtime',
  'validate:runtime',
  'validate:release-readiness',
  'validate:ci',
];
const requiredReadmeLinks = [
  'docs/mvp-release-runbook.md',
  'docs/backup-restore.md',
  'docs/runtime-smoke.md',
  'docs/migration-guide.md',
];
const requiredReleaseCommands = [
  'pnpm install',
  'docker compose up -d',
  'pnpm validate:static',
  'pnpm typecheck',
  'pnpm test',
  'SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime',
];
const requiredBackupTerms = ['pg_dump', 'pg_restore', 'DATABASE_URL', 'RESTORE_CLEAN=true'];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function hasExecutableBit(relativePath) {
  const mode = fs.statSync(path.join(repoRoot, relativePath)).mode;
  return (mode & 0o111) !== 0;
}

const errors = [];
const notes = [];

const packageJson = JSON.parse(read('package.json'));
for (const scriptName of requiredPackageScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(`package.json is missing the ${scriptName} script.`);
  }
}

if (!packageJson.scripts?.['validate:static']?.includes('pnpm validate:release-readiness')) {
  errors.push('package.json validate:static must include pnpm validate:release-readiness.');
}

const readme = read('README.md');
for (const link of requiredReadmeLinks) {
  if (!readme.includes(link)) {
    errors.push(`README.md must link to ${link}.`);
  }
}

const envExample = read('.env.example');
for (const key of requiredEnvKeys) {
  if (!new RegExp(`^${key}=`, 'm').test(envExample)) {
    errors.push(`.env.example is missing ${key}.`);
  }
}

const dockerCompose = read('docker-compose.yml');
for (const service of ['postgres:', 'redis:']) {
  if (!dockerCompose.includes(service)) {
    errors.push(`docker-compose.yml is missing the ${service.replace(':', '')} service.`);
  }
}

for (const scriptPath of ['scripts/backup-db.sh', 'scripts/restore-db.sh']) {
  if (!exists(scriptPath)) {
    errors.push(`${scriptPath} is missing.`);
  } else if (!hasExecutableBit(scriptPath)) {
    errors.push(`${scriptPath} must be executable.`);
  }
}

if (exists('scripts/backup-db.sh') && !read('scripts/backup-db.sh').includes('pg_dump')) {
  errors.push('scripts/backup-db.sh must call pg_dump.');
}

if (exists('scripts/restore-db.sh') && !read('scripts/restore-db.sh').includes('pg_restore')) {
  errors.push('scripts/restore-db.sh must call pg_restore.');
}

if (!exists('docs/mvp-release-runbook.md')) {
  errors.push('docs/mvp-release-runbook.md is missing.');
} else {
  const releaseRunbook = read('docs/mvp-release-runbook.md');
  for (const command of requiredReleaseCommands) {
    if (!releaseRunbook.includes(command)) {
      errors.push(`docs/mvp-release-runbook.md must include ${command}.`);
    }
  }

  for (const phrase of ['rollback', 'backup', 'smoke', 'Feature Pass 52']) {
    if (!releaseRunbook.toLowerCase().includes(phrase.toLowerCase())) {
      notes.push(`docs/mvp-release-runbook.md should mention ${phrase}.`);
    }
  }
}

if (!exists('docs/backup-restore.md')) {
  errors.push('docs/backup-restore.md is missing.');
} else {
  const backupRestore = read('docs/backup-restore.md');
  for (const term of requiredBackupTerms) {
    if (!backupRestore.includes(term)) {
      errors.push(`docs/backup-restore.md must include ${term}.`);
    }
  }

  for (const command of ['pnpm db:backup', 'pnpm db:restore --']) {
    if (!backupRestore.includes(command)) {
      errors.push(`docs/backup-restore.md must include ${command}.`);
    }
  }
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    requiredEnvKeys: requiredEnvKeys.length,
    requiredPackageScripts: requiredPackageScripts.length,
    readmeReleaseLinks: requiredReadmeLinks.length,
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
