import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'packages', 'db', 'drizzle');
const PACKAGE_JSON = join(ROOT, 'packages', 'db', 'package.json');
const MIGRATION_PATTERN = /^(\d{4})_(.+)\.sql$/;
const OPTIONAL_SEED_MIGRATIONS = new Set(['0001_seed_starter_content.sql']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => MIGRATION_PATTERN.test(file))
    .sort();

  const migrations = files.map((file) => {
    const match = file.match(MIGRATION_PATTERN);
    const contents = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    if (!match) {
      throw new Error(`Unexpected migration file shape: ${file}`);
    }

    return {
      file,
      number: Number(match[1]),
      name: match[2],
      hasCreateOrAlter: /\b(CREATE|ALTER)\b/i.test(contents),
      hasDropTable: /\bDROP\s+TABLE\b/i.test(contents),
      hasDestructiveDelete:
        /\bDELETE\s+FROM\b/i.test(contents) && !/cleanup|maintenance|expired|stale/i.test(file),
    };
  });

  const gaps = [];
  const duplicateNumbers = [];
  const seen = new Set();

  migrations.forEach((migration, index) => {
    if (seen.has(migration.number)) {
      duplicateNumbers.push(migration.number);
    }

    seen.add(migration.number);

    if (migration.number !== index) {
      gaps.push(`expected ${String(index).padStart(4, '0')} but found ${migration.file}`);
    }
  });

  const packageJson = readJson(PACKAGE_JSON);
  const scripts = packageJson.scripts ?? {};
  const applyScripts = Object.entries(scripts)
    .filter(([name]) => name.startsWith('db:apply:'))
    .map(([name, command]) => ({ name, command: String(command) }));

  const hasApplyAllRunner =
    Boolean(scripts['db:apply:all']) &&
    String(scripts['db:apply:all']).includes('apply-migrations.ts');

  const uncoveredMigrations = migrations.filter((migration) => {
    if (OPTIONAL_SEED_MIGRATIONS.has(migration.file)) {
      return false;
    }

    if (hasApplyAllRunner) {
      return false;
    }

    return !applyScripts.some((script) => script.command.includes(migration.file));
  });

  const potentiallyDestructiveMigrations = migrations
    .filter((migration) => migration.hasDropTable || migration.hasDestructiveDelete)
    .map((migration) => migration.file);

  const summary = {
    validatedAt: new Date().toISOString(),
    migrationCount: migrations.length,
    firstMigration: migrations[0]?.file ?? null,
    lastMigration: migrations.at(-1)?.file ?? null,
    applyScriptCount: applyScripts.length,
    hasApplyAllRunner,
    gaps,
    duplicateNumbers,
    uncoveredMigrations: uncoveredMigrations.map((migration) => migration.file),
    potentiallyDestructiveMigrations,
    ok: gaps.length === 0 && duplicateNumbers.length === 0 && uncoveredMigrations.length === 0,
  };

  console.log(JSON.stringify({ summary, migrations }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main();
