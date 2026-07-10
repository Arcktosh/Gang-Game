import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres, { type Sql } from 'postgres';

const MIGRATION_PATTERN = /^(\d{4})_.+\.sql$/;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || parseBoolean(process.env.DB_MIGRATIONS_DRY_RUN, false);
const allowChecksumMismatch =
  args.includes('--allow-checksum-mismatch') || parseBoolean(process.env.DB_MIGRATIONS_ALLOW_CHECKSUM_MISMATCH, false);
const baselineThrough = readOption('--baseline-through') ?? process.env.DB_MIGRATIONS_BASELINE_THROUGH ?? null;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readOption(name: string) {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const inner = trimmed.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : inner;
  }

  return trimmed;
}

function loadEnvFileIfPresent(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const assignment = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
    const equalsIndex = assignment.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = assignment.slice(0, equalsIndex).trim();
    const value = unquoteEnvValue(assignment.slice(equalsIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadMonorepoRootEnv(monorepoRoot: string) {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const envFiles = [`.env.${nodeEnv}.local`, nodeEnv === 'test' ? null : '.env.local', `.env.${nodeEnv}`, '.env'];

  for (const envFile of envFiles) {
    if (envFile) {
      loadEnvFileIfPresent(resolve(monorepoRoot, envFile));
    }
  }
}

function checksum(contents: string) {
  return createHash('sha256').update(contents).digest('hex');
}

function parseMigrationNumber(file: string) {
  const match = file.match(MIGRATION_PATTERN);

  if (!match) {
    throw new Error(`Unexpected migration file name: ${file}`);
  }

  return Number(match[1]);
}

function parseBaselineThrough(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,4})(?:_.+\.sql)?$/);

  if (!match) {
    throw new Error('DB_MIGRATIONS_BASELINE_THROUGH must be a migration number like 0039 or a migration file prefix.');
  }

  return Number(match[1]);
}

async function ensureTrackingTable(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      execution_ms integer NOT NULL DEFAULT 0
    )
  `;
}

async function loadAppliedMigrations(sql: Sql) {
  const rows = await sql<{ id: string; checksum: string }[]>`
    SELECT id, checksum
    FROM schema_migrations
  `;

  return new Map(rows.map((row) => [row.id, row.checksum]));
}

async function recordBaseline(sql: Sql, migrations: MigrationFile[], throughNumber: number, applied: Map<string, string>) {
  const recorded: MigrationFile[] = [];

  for (const migration of migrations) {
    if (migration.number > throughNumber || applied.has(migration.file)) {
      continue;
    }

    if (dryRun) {
      console.log(`[baseline:dry-run] ${migration.file}`);
      recorded.push(migration);
      continue;
    }

    await sql`
      INSERT INTO schema_migrations (id, checksum, execution_ms)
      VALUES (${migration.file}, ${migration.checksum}, 0)
      ON CONFLICT (id) DO NOTHING
    `;
    applied.set(migration.file, migration.checksum);
    recorded.push(migration);
    console.log(`[baseline] ${migration.file}`);
  }

  return recorded;
}

type MigrationFile = {
  file: string;
  number: number;
  path: string;
  contents: string;
  checksum: string;
};

async function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(scriptDir, '..');
  const monorepoRoot = resolve(packageRoot, '../..');
  const migrationsDir = resolve(packageRoot, 'drizzle');
  loadMonorepoRootEnv(monorepoRoot);

  const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
  const migrations = readdirSync(migrationsDir)
    .filter((file) => MIGRATION_PATTERN.test(file))
    .sort()
    .map((file) => {
      const path = join(migrationsDir, file);
      const contents = readFileSync(path, 'utf8');
      return {
        file,
        number: parseMigrationNumber(file),
        path,
        contents,
        checksum: checksum(contents),
      };
    });

  const sql = postgres(connectionString, { max: 1 });
  const startedAt = Date.now();
  const results: { file: string; action: 'applied' | 'skipped' | 'baseline' | 'dry-run'; executionMs: number }[] = [];

  try {
    await ensureTrackingTable(sql);
    const applied = await loadAppliedMigrations(sql);
    const baselineNumber = parseBaselineThrough(baselineThrough);

    if (baselineNumber !== null) {
      const recorded = await recordBaseline(sql, migrations, baselineNumber, applied);
      for (const migration of recorded) {
        results.push({ file: migration.file, action: dryRun ? 'dry-run' : 'baseline', executionMs: 0 });
      }
      console.log(`Baseline recorded ${recorded.length} migration(s) through ${String(baselineNumber).padStart(4, '0')}.`);
    }

    for (const migration of migrations) {
      const previousChecksum = applied.get(migration.file);

      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          const message = `Migration checksum mismatch for ${migration.file}. Applied=${previousChecksum}, current=${migration.checksum}.`;

          if (!allowChecksumMismatch) {
            throw new Error(`${message} Set DB_MIGRATIONS_ALLOW_CHECKSUM_MISMATCH=true only after manually verifying the drift.`);
          }

          console.warn(`[checksum-mismatch:allowed] ${message}`);
        }

        if (baselineNumber === null || migration.number > baselineNumber) {
          results.push({ file: migration.file, action: 'skipped', executionMs: 0 });
        }
        console.log(`[skip] ${migration.file}`);
        continue;
      }

      if (dryRun) {
        results.push({ file: migration.file, action: 'dry-run', executionMs: 0 });
        console.log(`[apply:dry-run] ${migration.file}`);
        continue;
      }

      const migrationStartedAt = Date.now();
      await sql.begin(async (tx) => {
        await tx.unsafe(migration.contents);
        await tx`
          INSERT INTO schema_migrations (id, checksum, execution_ms)
          VALUES (${migration.file}, ${migration.checksum}, ${Date.now() - migrationStartedAt})
        `;
      });
      const executionMs = Date.now() - migrationStartedAt;
      results.push({ file: migration.file, action: 'applied', executionMs });
      console.log(`[apply] ${migration.file} (${executionMs}ms)`);
    }

    const summary = {
      ok: true,
      checkedAt: new Date().toISOString(),
      migrationCount: migrations.length,
      applied: results.filter((result) => result.action === 'applied').length,
      skipped: results.filter((result) => result.action === 'skipped').length,
      baselined: results.filter((result) => result.action === 'baseline').length,
      dryRun: results.filter((result) => result.action === 'dry-run').length,
      elapsedMs: Date.now() - startedAt,
    };

    console.log(JSON.stringify({ summary, results }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
