import fs from 'node:fs';

const requiredFiles = [
  'packages/observability/src/index.ts',
  'packages/observability/src/__tests__/observability.test.ts',
  'apps/web/src/lib/observability.ts',
  'apps/worker/src/observability.ts',
  'docs/observability-runbook.md',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing observability foundation file: ${file}`);
}

const shared = fs.readFileSync('packages/observability/src/index.ts', 'utf8');
const web = fs.readFileSync('apps/web/src/lib/observability.ts', 'utf8');
const worker = fs.readFileSync('apps/worker/src/tick-runner.ts', 'utf8');
const health = fs.readFileSync('apps/web/src/app/api/health/route.ts', 'utf8');
const env = fs.readFileSync('.env.example', 'utf8');

const checks = [
  [shared.includes('redactTelemetryValue'), 'recursive telemetry redaction'],
  [shared.includes('createHttpTelemetryTransport'), 'HTTP telemetry transport'],
  [shared.includes('telemetryConfigurationStatus'), 'safe configuration status'],
  [web.includes("api.request.completed"), 'API completion telemetry'],
  [web.includes("api.unhandled_error"), 'API critical alert'],
  [worker.includes("worker.tick_exhausted"), 'worker retry exhaustion alert'],
  [health.includes('runtimeDiagnostics'), 'health observability diagnostics'],
  [env.includes('OBSERVABILITY_HTTP_ENDPOINT'), 'observability environment template'],
];

const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
if (missing.length) throw new Error(`Observability foundation validation failed: ${missing.join(', ')}`);
console.log('Observability foundation validation passed.');
