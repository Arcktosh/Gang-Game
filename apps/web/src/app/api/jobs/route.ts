import { and, eq, sql } from 'drizzle-orm';
import {
  assertActionUnlocked,
  db,
  characters,
  characterJobs,
  completeJobCharacterUpdate,
  jobDefinitions,
  jobRuns,
  playerEvents,
  refreshCharacterResources,
  setActionCooldown,
} from '@drugdeal/db';
import {
  calculateActionExperience,
  calculateJobPayout,
  calculateProgressionFromExperience,
} from '@drugdeal/game';
import { startJobSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

export async function GET() {
  const jobs = await db.query.jobDefinitions.findMany();
  return jsonOk({ jobs });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'actions:job', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, startJobSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'actions:job',
      fingerprint: body.data,
      handler: async () => {
        const result = await db.transaction(async (tx) => {
          const character = await tx.query.characters.findFirst({
            where: and(
              eq(characters.id, body.data.characterId),
              eq(characters.userId, auth.userId),
            ),
          });

          if (!character) {
            return { error: jsonError('not_found', 'Character not found.', 404) };
          }

          const refreshedCharacter = await refreshCharacterResources(tx, character);

          if (refreshedCharacter.status !== 'free') {
            return { error: jsonError('forbidden', 'Character is not available for work.', 403) };
          }

          const job = await tx.query.jobDefinitions.findFirst({
            where: eq(jobDefinitions.key, body.data.jobKey),
          });

          if (!job) {
            return { error: jsonError('not_found', 'Job not found.', 404) };
          }

          const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'job');

          if (!cooldown.ok) {
            return { error: jsonError(cooldown.code, cooldown.message, 429) };
          }

          if (
            refreshedCharacter.labour < job.requiredLabour ||
            refreshedCharacter.intelligence < job.requiredIntelligence
          ) {
            return {
              error: jsonError('forbidden', 'Character does not meet the job requirements.', 403),
            };
          }

          const activeEmployment = await tx.query.characterJobs.findFirst({
            where: and(
              eq(characterJobs.characterId, refreshedCharacter.id),
              eq(characterJobs.status, 'active'),
            ),
          });

          if (body.data.action === 'apply') {
            if (activeEmployment) {
              return { error: jsonError('conflict', 'Character already has an active job.', 409) };
            }

            const [employment] = await tx
              .insert(characterJobs)
              .values({ characterId: refreshedCharacter.id, jobKey: job.key })
              .returning();

            await tx.insert(playerEvents).values({
              userId: auth.userId,
              characterId: refreshedCharacter.id,
              type: 'job_applied',
              payload: { jobKey: job.key, jobName: job.name, rank: employment.rank },
            });

            return { data: { employment, character: refreshedCharacter } };
          }

          if (!activeEmployment || activeEmployment.jobKey !== job.key) {
            return {
              error: jsonError('forbidden', 'Apply for this job before working or resigning.', 403),
            };
          }

          if (body.data.action === 'resign') {
            const [employment] = await tx
              .update(characterJobs)
              .set({ status: 'resigned', endedAt: sql`now()`, updatedAt: sql`now()` })
              .where(
                and(eq(characterJobs.id, activeEmployment.id), eq(characterJobs.status, 'active')),
              )
              .returning();

            await tx.insert(playerEvents).values({
              userId: auth.userId,
              characterId: refreshedCharacter.id,
              type: 'job_resigned',
              payload: {
                jobKey: job.key,
                jobName: job.name,
                rank: activeEmployment.rank,
                shiftsCompleted: activeEmployment.shiftsCompleted,
              },
            });

            return { data: { employment, character: refreshedCharacter } };
          }

          if (refreshedCharacter.energy < job.energyCost) {
            return { error: jsonError('forbidden', 'Not enough energy.', 403) };
          }

          const payout = calculateJobPayout({
            baseWage: job.baseWage + activeEmployment.rank * 10,
            labour: refreshedCharacter.labour,
          });
          const experienceGain = calculateActionExperience({
            base: Math.max(1, Math.floor(payout / 10)),
            difficulty: job.requiredLabour + job.requiredIntelligence + activeEmployment.rank,
            success: true,
          });

          const [jobRun] = await tx
            .insert(jobRuns)
            .values({
              characterId: refreshedCharacter.id,
              jobKey: job.key,
              payout,
              completedAt: sql`now()`,
            })
            .returning();

          const characterUpdate = await completeJobCharacterUpdate(tx, {
            characterId: refreshedCharacter.id,
            energyCost: job.energyCost,
            payout,
            experienceGain,
          });

          if (!characterUpdate.ok || !characterUpdate.character) {
            return { error: jsonError('forbidden', 'Not enough energy.', 403) };
          }

          const updatedCharacter = characterUpdate.character;
          const nextShiftsCompleted = activeEmployment.shiftsCompleted + 1;
          const nextRank = Math.min(5, Math.floor(nextShiftsCompleted / 5) + 1);
          const promoted = nextRank > activeEmployment.rank;
          const [employment] = await tx
            .update(characterJobs)
            .set({
              rank: nextRank,
              shiftsCompleted: nextShiftsCompleted,
              totalEarned: sql`${characterJobs.totalEarned} + ${payout}`,
              promotedAt: promoted ? sql`now()` : activeEmployment.promotedAt,
              updatedAt: sql`now()`,
            })
            .where(eq(characterJobs.id, activeEmployment.id))
            .returning();

          await tx.insert(playerEvents).values({
            userId: auth.userId,
            characterId: refreshedCharacter.id,
            type: promoted ? 'job_promoted' : 'job_completed',
            payload: {
              jobKey: job.key,
              jobName: job.name,
              payout,
              energyCost: job.energyCost,
              experienceGain,
              rank: employment.rank,
              shiftsCompleted: employment.shiftsCompleted,
              progression: calculateProgressionFromExperience(updatedCharacter.experience),
            },
          });

          const lock = await setActionCooldown({
            tx,
            characterId: refreshedCharacter.id,
            actionType: 'job',
            cooldownSeconds: job.durationSeconds,
            metadata: { jobKey: job.key, rank: employment.rank },
          });

          return {
            data: {
              jobRun,
              employment,
              character: updatedCharacter,
              progression: calculateProgressionFromExperience(updatedCharacter.experience),
              lock,
            },
          };
        });

        if ('error' in result) {
          return result.error;
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
