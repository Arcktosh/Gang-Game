import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const API_ROOT = join(ROOT, 'apps', 'web', 'src', 'app', 'api');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const METHOD_PATTERN = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
const PUBLIC_UNSAFE_ROUTES = new Set([
  'api/auth/login/route.ts',
  'api/auth/register/route.ts',
  'api/auth/logout/route.ts',
  'api/auth/password-reset/request/route.ts',
  'api/auth/password-reset/confirm/route.ts',
  'api/auth/email-verification/request/route.ts',
  'api/auth/email-verification/confirm/route.ts',
]);
const STREAM_ROUTES = /\/stream\/route\.ts$/;
const HIGH_RISK_MUTATION_ROUTES =
  /(market|finance|gambling|shops\/purchase|contracts|admin\/.*balance|admin\/.*adjust|enforcement)/;
const LIST_STYLE_GET_ROUTES =
  /(events|notifications|newspaper|shops|audit|search|messages|contracts|finance|bounties|faction-wars|equipment|vehicles|crafting|contacts)/;

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walkFiles(path, files);
      continue;
    }

    if (entry === 'route.ts') {
      files.push(path);
    }
  }

  return files;
}

function unique(values) {
  return [...new Set(values)];
}

function hasUnsafeMethods(methods) {
  return methods.some((method) => !SAFE_METHODS.has(method));
}

function auditRoute(path) {
  const source = readFileSync(path, 'utf8');
  const route = relative(join(ROOT, 'apps', 'web', 'src', 'app'), path).replace(/\\/g, '/');
  const methods = unique([...source.matchAll(METHOD_PATTERN)].map((match) => match[1]));
  const unsafeMethods = methods.filter((method) => !SAFE_METHODS.has(method));
  const isPublicUnsafeRoute = PUBLIC_UNSAFE_ROUTES.has(route);
  const isStreamRoute = STREAM_ROUTES.test(route);
  const hasAuthGuard =
    /requireRequestUserId|getSessionFromRequest|requireAdmin|isAdmin/.test(source) ||
    isPublicUnsafeRoute;
  const hasAdminGuard = /isAdmin|Admin access required|requireAdmin/.test(source);
  const hasRateLimit = /assertRateLimit|checkRateLimit|rateLimitKey/.test(source);
  const hasIdempotency = /withIdempotency|Idempotency-Key/.test(source);
  const hasPagination =
    /parsePagination|paginationMeta|limit\s*=|offset\s*=/.test(source) || isStreamRoute;
  const hasObservability = /withApiObservability|requestMetadata|x-request-id/.test(source);
  const notes = [];

  if (unsafeMethods.length > 0 && !hasAuthGuard) {
    notes.push({ severity: 'error', message: 'unsafe route without obvious auth/session guard' });
  }

  if (unsafeMethods.length > 0 && !hasRateLimit) {
    notes.push({
      severity: 'error',
      message: 'unsafe route without route-level rate-limit helper',
    });
  }

  if (!hasObservability) {
    notes.push({ severity: 'error', message: 'route without request observability wrapper' });
  }

  if (unsafeMethods.length > 0 && HIGH_RISK_MUTATION_ROUTES.test(route) && !hasIdempotency) {
    notes.push({ severity: 'warning', message: 'high-risk mutation without idempotency helper' });
  }

  if (methods.includes('GET') && LIST_STYLE_GET_ROUTES.test(route) && !hasPagination) {
    notes.push({
      severity: 'warning',
      message: 'list-style GET route without obvious pagination helper',
    });
  }

  return {
    route,
    methods,
    unsafeMethods,
    hasAuthGuard,
    hasAdminGuard,
    hasRateLimit,
    hasIdempotency,
    hasPagination,
    hasObservability,
    notes,
  };
}

function main() {
  const routes = walkFiles(API_ROOT)
    .map(auditRoute)
    .sort((a, b) => a.route.localeCompare(b.route));
  const unsafeRoutes = routes.filter((route) => hasUnsafeMethods(route.methods));
  const notedRoutes = routes.filter((route) => route.notes.length > 0);
  const errorRoutes = notedRoutes.filter((route) =>
    route.notes.some((note) => note.severity === 'error'),
  );
  const warningRoutes = notedRoutes.filter((route) =>
    route.notes.some((note) => note.severity === 'warning'),
  );
  const summary = {
    auditedAt: new Date().toISOString(),
    totalRoutes: routes.length,
    unsafeRoutes: unsafeRoutes.length,
    routesWithRateLimit: routes.filter((route) => route.hasRateLimit).length,
    routesWithIdempotency: routes.filter((route) => route.hasIdempotency).length,
    routesWithPagination: routes.filter((route) => route.hasPagination).length,
    routesWithObservabilityWrapper: routes.filter((route) => route.hasObservability).length,
    notedRoutes: notedRoutes.length,
    errorRoutes: errorRoutes.length,
    warningRoutes: warningRoutes.length,
    ok: errorRoutes.length === 0,
  };

  console.log(JSON.stringify({ summary, notedRoutes }, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main();
