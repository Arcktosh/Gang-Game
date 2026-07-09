import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

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

function loadMonorepoRootEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const monorepoRoot = resolve(process.cwd(), '../..');
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

loadMonorepoRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: ['@drugdeal/db', '@drugdeal/game', '@drugdeal/ui', '@drugdeal/validators'],
  typescript: {
    // The package build script runs `tsc --noEmit` first. Next's internal checker
    // still probes the legacy TypeScript compiler API path, which is incompatible
    // with the native TypeScript 7 package layout.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
