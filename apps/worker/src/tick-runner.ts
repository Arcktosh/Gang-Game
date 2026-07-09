import { recordWorkerDeadLetter } from '@drugdeal/db';

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

const DEFAULT_MAX_ATTEMPTS = positiveIntegerOrDefault(
  Number(process.env.WORKER_TICK_MAX_ATTEMPTS),
  3,
);
const DEFAULT_RETRY_BASE_MS = positiveIntegerOrDefault(
  Number(process.env.WORKER_TICK_RETRY_BASE_MS),
  1_000,
);
const DEFAULT_RETRY_MAX_MS = positiveIntegerOrDefault(
  Number(process.env.WORKER_TICK_RETRY_MAX_MS),
  30_000,
);
const DEAD_LETTER_DISABLED = process.env.WORKER_DEAD_LETTER_DISABLED === 'true';

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, baseMs: number, maxMs: number) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

function serializeError(error: unknown): SerializedError {
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

async function writeDeadLetter(options: WorkerTickOptions, attempts: number, error: unknown) {
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
    console.error(
      `[worker:${options.name}] failed to write dead letter`,
      serializeError(deadLetterError),
    );
  }
}

async function runWithRetry(options: WorkerTickOptions) {
  const maxAttempts = positiveIntegerOrDefault(
    options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS,
  );
  const retryBaseMs = positiveIntegerOrDefault(
    options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
    DEFAULT_RETRY_BASE_MS,
  );
  const retryMaxMs = positiveIntegerOrDefault(
    options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS,
    DEFAULT_RETRY_MAX_MS,
  );
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      await options.run();
      return;
    } catch (error) {
      lastError = error;
      const serialized = serializeError(error);

      if (attempt >= maxAttempts) {
        console.error(`[worker:${options.name}] failed after ${attempt} attempt(s)`, serialized);
        break;
      }

      const backoffMs = retryDelayMs(attempt, retryBaseMs, retryMaxMs);
      console.warn(
        `[worker:${options.name}] attempt ${attempt} failed; retrying in ${backoffMs}ms`,
        serialized,
      );
      await delay(backoffMs);
    }
  }

  await writeDeadLetter(options, attempt, lastError);
}

export function scheduleWorkerTick<T = unknown>(options: WorkerTickOptions<T>) {
  let inFlight = false;

  async function runOnce() {
    if (inFlight) {
      console.warn(
        `[worker:${options.name}] previous tick still running; skipping overlapping tick`,
      );
      return;
    }

    inFlight = true;

    try {
      await runWithRetry(options);
    } finally {
      inFlight = false;
    }
  }

  console.log(`worker tick "${options.name}" scheduled every ${options.intervalMs}ms`);

  if (options.runImmediately) {
    void runOnce();
  }

  return setInterval(() => void runOnce(), options.intervalMs);
}
