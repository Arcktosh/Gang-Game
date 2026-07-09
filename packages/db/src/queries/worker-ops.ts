import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { workerDeadLetters } from '../schema';

export type WorkerDeadLetterInput = {
  tickName: string;
  attempts: number;
  errorName?: string;
  errorMessage: string;
  errorStack?: string | null;
  payload?: Record<string, unknown>;
};

export async function recordWorkerDeadLetter(input: WorkerDeadLetterInput) {
  const [row] = await db
    .insert(workerDeadLetters)
    .values({
      tickName: input.tickName,
      attempts: input.attempts,
      errorName: input.errorName ?? 'Error',
      errorMessage: input.errorMessage,
      errorStack: input.errorStack ?? null,
      payload: input.payload ?? {},
    })
    .returning();

  return row;
}

export async function listOpenWorkerDeadLetters(limit = 50) {
  return db.query.workerDeadLetters.findMany({
    where: eq(workerDeadLetters.status, 'open'),
    orderBy: desc(workerDeadLetters.createdAt),
    limit,
  });
}

export async function resolveWorkerDeadLetter(id: string) {
  const [row] = await db
    .update(workerDeadLetters)
    .set({ status: 'resolved', resolvedAt: sql`now()` })
    .where(eq(workerDeadLetters.id, id))
    .returning();

  return row ?? null;
}
