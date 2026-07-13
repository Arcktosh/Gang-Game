import assert from 'node:assert/strict';
import test from 'node:test';

import { executeWorkerTick, positiveIntegerOrDefault, retryDelayMs, serializeError } from '../tick-runner';

test('worker retry succeeds after deterministic exponential backoff', async () => {
  let runs = 0;
  const delays: number[] = [];
  const warnings: unknown[][] = [];

  const result = await executeWorkerTick(
    {
      name: 'retry-success',
      intervalMs: 1_000,
      maxAttempts: 3,
      retryBaseMs: 25,
      retryMaxMs: 100,
      run: () => {
        runs += 1;
        if (runs < 3) {
          throw new Error(`failure-${runs}`);
        }
      },
    },
    {
      sleep: async (ms) => {
        delays.push(ms);
      },
      writeDeadLetter: async () => {
        assert.fail('successful retry must not write a dead letter');
      },
      warn: (...values) => warnings.push(values),
      error: () => assert.fail('successful retry must not log a terminal error'),
    },
  );

  assert.deepEqual(result, { ok: true, attempts: 3 });
  assert.equal(runs, 3);
  assert.deepEqual(delays, [25, 50]);
  assert.equal(warnings.length, 2);
});

test('worker retry writes one dead letter after attempts are exhausted', async () => {
  const delays: number[] = [];
  const deadLetters: Array<{ attempts: number; error: unknown }> = [];

  const result = await executeWorkerTick(
    {
      name: 'retry-failure',
      intervalMs: 1_000,
      maxAttempts: 4,
      retryBaseMs: 20,
      retryMaxMs: 30,
      run: () => {
        throw 'permanent failure';
      },
    },
    {
      sleep: async (ms) => {
        delays.push(ms);
      },
      writeDeadLetter: async (_options, attempts, error) => {
        deadLetters.push({ attempts, error });
      },
      warn: () => undefined,
      error: () => undefined,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.attempts, 4);
  assert.deepEqual(delays, [20, 30, 30]);
  assert.deepEqual(deadLetters, [{ attempts: 4, error: 'permanent failure' }]);
});

test('worker retry helpers normalize values and errors', () => {
  assert.equal(positiveIntegerOrDefault(2.9, 7), 2);
  assert.equal(positiveIntegerOrDefault(0, 7), 7);
  assert.equal(positiveIntegerOrDefault(Number.NaN, 7), 7);
  assert.equal(retryDelayMs(1, 100, 250), 100);
  assert.equal(retryDelayMs(2, 100, 250), 200);
  assert.equal(retryDelayMs(3, 100, 250), 250);
  assert.deepEqual(serializeError('failed'), { name: 'Error', message: 'failed' });
});
