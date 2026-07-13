import { recordWorkerDeadLetter } from '@drugdeal/db';
import { workerTelemetry } from './observability';

type WorkerTickPayload = Record<string, unknown>;

export type WorkerTickOptions<T = unknown> = {
  name: string;
  intervalMs: number;
  run: () => Promise<T> | T;
  runImmediately?: boolean;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  deadLetterPayload?: WorkerTickPayload | (() => WorkerTickPayload);
};

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type WorkerTickExecutionDependencies = {
  sleep?: (ms: number) => Promise<void>;
  writeDeadLetter?: (options: WorkerTickOptions, attempts: number, error: unknown) => Promise<void>;
  warn?: (...values: unknown[]) => void;
  error?: (...values: unknown[]) => void;
};

const DEFAULT_MAX_ATTEMPTS = positiveIntegerOrDefault(Number(process.env.WORKER_TICK_MAX_ATTEMPTS), 3);
const DEFAULT_RETRY_BASE_MS = positiveIntegerOrDefault(Number(process.env.WORKER_TICK_RETRY_BASE_MS), 1_000);
const DEFAULT_RETRY_MAX_MS = positiveIntegerOrDefault(Number(process.env.WORKER_TICK_RETRY_MAX_MS), 30_000);
const DEAD_LETTER_DISABLED = process.env.WORKER_DEAD_LETTER_DISABLED === 'true';

export function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function retryDelayMs(attempt: number, baseMs: number, maxMs: number) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Worker tick failed.',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }

  try {
    return { name: 'Error', message: JSON.stringify(error) ?? 'Unknown worker tick error.' };
  } catch {
    return { name: 'Error', message: 'Unknown worker tick error.' };
  }
}

function resolvePayload(payload: WorkerTickOptions['deadLetterPayload']) {
  if (!payload) {
    return {};
  }

  return typeof payload === 'function' ? payload() : payload;
}

async function writeWorkerDeadLetter(options: WorkerTickOptions, attempts: number, error: unknown) {
  if (DEAD_LETTER_DISABLED) {
    return;
  }

  const serialized = serializeError(error);

  try {
    await recordWorkerDeadLetter({
      tickName: options.name,
      attempts,
      errorName: serialized.name,
      errorMessage: serialized.message,
      errorStack: serialized.stack,
      payload: resolvePayload(options.deadLetterPayload),
    });
  } catch (deadLetterError) {
    workerTelemetry.error('worker.dead_letter_write_failed', { context: { tickName: options.name, error: serializeError(deadLetterError) } });
  }
}

export async function executeWorkerTick(
  options: WorkerTickOptions,
  dependencies: WorkerTickExecutionDependencies = {},
) {
  const maxAttempts = positiveIntegerOrDefault(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  const retryBaseMs = positiveIntegerOrDefault(options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS, DEFAULT_RETRY_BASE_MS);
  const retryMaxMs = positiveIntegerOrDefault(options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS, DEFAULT_RETRY_MAX_MS);
  const sleep = dependencies.sleep ?? delay;
  const writeDeadLetter = dependencies.writeDeadLetter ?? writeWorkerDeadLetter;
  const warn = dependencies.warn ?? console.warn;
  const error = dependencies.error ?? console.error;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      const startedAt = Date.now();
      await options.run();
      workerTelemetry.info('worker.tick.completed', { durationMs: Date.now() - startedAt, context: { tickName: options.name, attempts: attempt } });
      return { ok: true as const, attempts: attempt };
    } catch (runError) {
      lastError = runError;
      const serialized = serializeError(runError);

      if (attempt >= maxAttempts) {
        error(`[worker:${options.name}] failed after ${attempt} attempt(s)`, serialized);
        workerTelemetry.error('worker.tick.failed', { context: { tickName: options.name, attempts: attempt, error: serialized } });
        workerTelemetry.alert('critical', 'worker.tick_exhausted', 'A worker tick exhausted all retry attempts.', { context: { tickName: options.name, attempts: attempt, error: serialized } });
        break;
      }

      const backoffMs = retryDelayMs(attempt, retryBaseMs, retryMaxMs);
      warn(`[worker:${options.name}] attempt ${attempt} failed; retrying in ${backoffMs}ms`, serialized);
      workerTelemetry.warn('worker.tick.retrying', { context: { tickName: options.name, attempt, backoffMs, error: serialized } });
      await sleep(backoffMs);
    }
  }

  await writeDeadLetter(options, attempt, lastError);
  return { ok: false as const, attempts: attempt, error: lastError };
}

export function scheduleWorkerTick<T = unknown>(options: WorkerTickOptions<T>) {
  let inFlight = false;

  async function runOnce() {
    if (inFlight) {
      console.warn(`[worker:${options.name}] previous tick still running; skipping overlapping tick`);
      workerTelemetry.warn('worker.tick.overlap_skipped', { context: { tickName: options.name, intervalMs: options.intervalMs } });
      return;
    }

    inFlight = true;

    try {
      await executeWorkerTick(options);
    } finally {
      inFlight = false;
    }
  }

  console.log(`worker tick "${options.name}" scheduled every ${options.intervalMs}ms`);
  workerTelemetry.info('worker.tick.scheduled', { context: { tickName: options.name, intervalMs: options.intervalMs, runImmediately: Boolean(options.runImmediately) } });

  if (options.runImmediately) {
    void runOnce();
  }

  return setInterval(() => void runOnce(), options.intervalMs);
}
