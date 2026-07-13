#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || parseBoolean(process.env.MVP_PROOF_DRY_RUN, false);
const skipInstall = args.has('--skip-install') || parseBoolean(process.env.MVP_PROOF_SKIP_INSTALL, false);
const skipPreflight = args.has('--skip-preflight') || parseBoolean(process.env.MVP_PROOF_SKIP_PREFLIGHT, false);
const skipDocker = args.has('--skip-docker') || parseBoolean(process.env.MVP_PROOF_SKIP_DOCKER, false);
const skipMigrations = args.has('--skip-migrations') || parseBoolean(process.env.MVP_PROOF_SKIP_MIGRATIONS, false);
const skipValidation = args.has('--skip-validation') || parseBoolean(process.env.MVP_PROOF_SKIP_VALIDATION, false);
const skipServer = args.has('--skip-server') || parseBoolean(process.env.MVP_PROOF_SKIP_SERVER, false);
const skipBackup = args.has('--skip-backup') || parseBoolean(process.env.MVP_PROOF_SKIP_BACKUP, false);
const restoreDatabaseUrl = process.env.MVP_RESTORE_DATABASE_URL;
const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const startupTimeoutMs = parsePositiveInteger(process.env.MVP_PROOF_STARTUP_TIMEOUT_MS, 120000);
const startupPollMs = parsePositiveInteger(process.env.MVP_PROOF_STARTUP_POLL_MS, 2000);
const backupDir = process.env.BACKUP_DIR ?? 'backups/mvp-proof';
const backupFile = process.env.BACKUP_FILE ?? `${backupDir}/drugdeal-game-mvp-proof.dump`;
const defaultDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
let useCurrentDatabase = parseBoolean(process.env.MVP_PROOF_USE_CURRENT_DATABASE, false);

const migrationScripts = ['db:apply:all'];

const proofCommandSummary = 'pnpm install, docker compose up -d, idempotent db:apply:all migrations, pnpm validate:static, pnpm typecheck, pnpm test, SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime, pnpm db:backup, pnpm db:restore';

const validationScripts = ['validate:static', 'typecheck', 'test'];
const results = [{ step: 'proof-command-summary', ok: true, command: proofCommandSummary }];
let webProcess;

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const inner = trimmed.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : inner;
  }

  return trimmed;
}

function loadEnvFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

function loadRootEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const envFiles = [`.env.${nodeEnv}.local`, nodeEnv === 'test' ? null : '.env.local', `.env.${nodeEnv}`, '.env'];

  for (const envFile of envFiles) {
    if (envFile) {
      loadEnvFileIfPresent(path.join(repoRoot, envFile));
    }
  }
}

function getProofDatabaseUrl() {
  const configuredDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;

  if (useCurrentDatabase) {
    return configuredDatabaseUrl;
  }

  if (process.env.MVP_PROOF_DATABASE_URL) {
    return process.env.MVP_PROOF_DATABASE_URL;
  }

  const url = new URL(configuredDatabaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'drugdeal_game';
  url.pathname = `/${encodeURIComponent(`${databaseName}_mvp_proof`)}`;
  return url.toString();
}

function getRuntimeEnv(proofDatabaseUrl) {
  return {
    DATABASE_URL: proofDatabaseUrl,
  };
}

function resolveExecutable(command) {
  return command;
}

function shouldUseShell() {
  return process.platform === 'win32';
}

function sanitizeEnv(env) {
  const sanitized = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) {
      continue;
    }

    sanitized[key] = String(value);
  }

  return sanitized;
}

function ensureEnvFile() {
  const envPath = path.join(repoRoot, '.env');
  const examplePath = path.join(repoRoot, '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    if (dryRun) {
      results.push({ step: 'env-file', ok: true, skipped: true, command: 'cp .env.example .env' });
      return;
    }

    fs.copyFileSync(examplePath, envPath);
    results.push({ step: 'env-file', ok: true, created: '.env' });
    return;
  }

  results.push({ step: 'env-file', ok: true, exists: fs.existsSync(envPath) });
}

function runCommand(step, command, args = [], options = {}) {
  const rendered = [command, ...args].join(' ');

  if (dryRun) {
    results.push({ step, ok: true, dryRun: true, command: rendered });
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let child;

    try {
      child = spawn(resolveExecutable(command), args, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: shouldUseShell(),
        env: sanitizeEnv({ ...process.env, ...options.env }),
        windowsHide: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ step, ok: false, command: rendered, error: message });
      reject(error);
      return;
    }

    child.on('exit', (code, signal) => {
      const ok = code === 0;
      results.push({ step, ok, command: rendered, code, signal });

      if (ok) {
        resolve();
      } else {
        reject(new Error(`${step} failed with code ${code ?? signal}.`));
      }
    });

    child.on('error', (error) => {
      results.push({ step, ok: false, command: rendered, error: error.message });
      reject(error);
    });
  });
}

function spawnWebServer() {
  if (dryRun) {
    results.push({ step: 'web-server', ok: true, dryRun: true, command: 'pnpm --filter @drugdeal/web dev' });
    return null;
  }

  let child;

  try {
    child = spawn(resolveExecutable('pnpm'), ['--filter', '@drugdeal/web', 'dev'], {
      cwd: repoRoot,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: shouldUseShell(),
      env: sanitizeEnv(process.env),
      windowsHide: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ step: 'web-server', ok: false, command: 'pnpm --filter @drugdeal/web dev', error: message });
    throw error;
  }

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[mvp-proof] web server exited with code ${code}.`);
    }
    if (signal) {
      console.error(`[mvp-proof] web server exited with signal ${signal}.`);
    }
  });

  return child;
}

async function waitForHealth() {
  const deadline = Date.now() + startupTimeoutMs;
  const url = new URL('/api/health', smokeBaseUrl).toString();
  let lastError = '';

  if (dryRun) {
    results.push({ step: 'wait-for-health', ok: true, dryRun: true, url });
    return;
  }

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) {
        results.push({ step: 'wait-for-health', ok: true, status: response.status, url });
        return;
      }
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(startupPollMs);
  }

  results.push({ step: 'wait-for-health', ok: false, url, lastError });
  throw new Error(`web app did not become reachable at ${url}: ${lastError}`);
}

async function stopWebServer() {
  if (!webProcess || dryRun) {
    return;
  }

  const processToStop = webProcess;
  webProcess = undefined;

  await new Promise((resolve) => {
    processToStop.once('exit', () => resolve());
    processToStop.kill('SIGTERM');
    setTimeout(() => {
      if (!processToStop.killed) {
        processToStop.kill('SIGKILL');
      }
      resolve();
    }, 5000).unref();
  });

  results.push({ step: 'web-server-stop', ok: true });
}

async function main() {
  const startedAt = new Date().toISOString();

  try {
    ensureEnvFile();
    loadRootEnv();

    if (!skipPreflight) {
      const doctorArgs = ['scripts/production-doctor.mjs', '--proof'];
      if (skipDocker) doctorArgs.push('--skip-docker');
      if (skipBackup) doctorArgs.push('--skip-backup');
      if (skipServer) doctorArgs.push('--skip-server');
      await runCommand('production-preflight', process.execPath, doctorArgs);
    }
    useCurrentDatabase = parseBoolean(process.env.MVP_PROOF_USE_CURRENT_DATABASE, false);
    const proofDatabaseUrl = getProofDatabaseUrl();
    const runtimeEnv = getRuntimeEnv(proofDatabaseUrl);

    if (!skipInstall) {
      await runCommand('install', 'pnpm', ['install']);
    }

    if (!skipDocker) {
      await runCommand('docker-compose', 'docker', ['compose', 'up', '-d']);
    }

    if (!skipMigrations) {
      if (!useCurrentDatabase) {
        await runCommand('database-prepare-mvp-proof', 'pnpm', ['--filter', '@drugdeal/db', 'db:prepare:mvp-proof'], {
          env: {
            MVP_PROOF_DATABASE_URL: proofDatabaseUrl,
          },
        });
      }

      for (const scriptName of migrationScripts) {
        await runCommand(`migration:${scriptName}`, 'pnpm', [scriptName], { env: runtimeEnv });
      }
    }

    if (!skipValidation) {
      for (const scriptName of validationScripts) {
        await runCommand(`validation:${scriptName}`, 'pnpm', [scriptName], { env: runtimeEnv });
      }
    }

    if (!skipServer) {
      process.env.DATABASE_URL = proofDatabaseUrl;
      webProcess = spawnWebServer();
      await waitForHealth();
      await runCommand('runtime-smoke', 'pnpm', ['smoke:runtime'], {
        env: {
          ...runtimeEnv,
          SMOKE_BASE_URL: smokeBaseUrl,
          SMOKE_STRICT_HEALTH_OK: 'true',
        },
      });
    }

    if (!skipBackup) {
      await runCommand('database-backup', 'pnpm', ['db:backup'], {
        env: {
          ...runtimeEnv,
          BACKUP_FILE: backupFile,
        },
      });

      if (restoreDatabaseUrl) {
        await runCommand('database-restore-proof', 'pnpm', ['db:restore', '--', backupFile], {
          env: {
            DATABASE_URL: restoreDatabaseUrl,
            RESTORE_CLEAN: 'true',
          },
        });
      } else {
        results.push({
          step: 'database-restore-proof',
          ok: true,
          skipped: true,
          reason: 'Set MVP_RESTORE_DATABASE_URL to restore into a disposable database.',
        });
      }
    }

    await stopWebServer();

    const summary = {
      checkedAt: startedAt,
      dryRun,
      ok: results.every((result) => result.ok),
      steps: results.length,
      skipped: results.filter((result) => result.skipped).length,
      proofDatabase: useCurrentDatabase ? 'current DATABASE_URL' : new URL(proofDatabaseUrl).pathname.replace(/^\//, ''),
      restoreProofAttempted: Boolean(restoreDatabaseUrl) && !skipBackup,
    };

    console.log(JSON.stringify({ summary, results }, null, 2));

    if (!summary.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    await stopWebServer();
    const summary = {
      checkedAt: startedAt,
      dryRun,
      ok: false,
      steps: results.length,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error(JSON.stringify({ summary, results }, null, 2));
    process.exitCode = 1;
  }
}

main();
