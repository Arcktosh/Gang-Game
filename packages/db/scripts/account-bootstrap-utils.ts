import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

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

    const assignment = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
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

export function loadMonorepoRootEnv(scriptUrl: string) {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const scriptDir = dirname(fileURLToPath(scriptUrl));
  const monorepoRoot = resolve(scriptDir, '../../..');
  const envFiles = [
    `.env.${nodeEnv}.local`,
    nodeEnv === 'test' ? null : '.env.local',
    `.env.${nodeEnv}`,
    '.env',
  ];

  for (const envFile of envFiles) {
    if (envFile) {
      loadEnvFileIfPresent(resolve(monorepoRoot, envFile));
    }
  }
}

export function parseBoolean(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

export function normalizeBootstrapEmail(value: string | undefined, fallback?: string) {
  const email = String(value ?? fallback ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error('A valid bootstrap email address is required.');
  }

  return email;
}

export function requireStrongBootstrapPassword(
  value: string | undefined,
  variableName: string,
  minimumLength: number,
) {
  const password = String(value ?? '');
  const missingClasses = [
    /[a-z]/.test(password) ? null : 'lowercase letter',
    /[A-Z]/.test(password) ? null : 'uppercase letter',
    /\d/.test(password) ? null : 'number',
    /[^A-Za-z0-9]/.test(password) ? null : 'symbol',
  ].filter(Boolean);

  if (password.length < minimumLength || missingClasses.length > 0) {
    throw new Error(
      `${variableName} must contain at least ${minimumLength} characters, including an uppercase letter, lowercase letter, number, and symbol.`,
    );
  }

  return password;
}

export async function hashBootstrapPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}
