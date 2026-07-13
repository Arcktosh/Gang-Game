import assert from 'node:assert/strict';
import test from 'node:test';
import { createTelemetry, redactTelemetryValue } from '../index';

test('redacts nested secrets and private content without mutating safe fields', () => {
  const value = redactTelemetryValue({
    characterId: 'char_1',
    password: 'hunter2',
    nested: { authorization: 'Bearer x', count: 3, message: 'private' },
  });

  assert.deepEqual(value, {
    characterId: 'char_1',
    password: '[redacted]',
    nested: { authorization: '[redacted]', count: 3, message: '[redacted]' },
  });
});

test('emits structured events and alerts to console and transport', async () => {
  const lines: string[] = [];
  const events: unknown[] = [];
  const alerts: unknown[] = [];
  const telemetry = createTelemetry({
    service: 'test',
    environment: 'test',
    now: () => new Date('2026-07-12T00:00:00.000Z'),
    console: { log: (line) => lines.push(String(line)), warn: (line) => lines.push(String(line)), error: (line) => lines.push(String(line)) },
    transport: { sendEvent: (event) => { events.push(event); }, sendAlert: (alert) => { alerts.push(alert); } },
  });

  telemetry.info('request.completed', { requestId: 'req_12345678', durationMs: 12, context: { token: 'secret', status: 200 } });
  telemetry.alert('critical', 'worker.dead_letter', 'A worker tick exhausted retries.', { context: { tick: 'market' } });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(lines.length, 2);
  assert.equal(events.length, 1);
  assert.equal(alerts.length, 1);
  assert.equal((events[0] as any).context.token, '[redacted]');
});
