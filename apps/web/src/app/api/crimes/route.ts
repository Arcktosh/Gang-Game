import { and, eq } from 'drizzle-orm';
import {
  assertActionUnlocked,
  db,
  characters,
  crimeAttempts,
  crimeDefinitions,
  financialTransactions,
  hospitalStays,
  resolveCrimeCharacterUpdate,
  jailSentences,
  playerEvents,
  refreshCharacterResources,
  setActionCooldown,
} from '@drugdeal/db';
import {
  calculateActionExperience,
  calculateCrimeSuccessChance,
  calculateFailedCrimeConsequence,
  calculateProgressionFromExperience,
} from '@drugdeal/game';
import { commitCrimeSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function GET() {
  const crimes = await db.query.crimeDefinitions.findMany();
  return jsonOk({ crimes });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'actions:crime', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, commitCrimeSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'actions:crime',
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
            return {
              error: jsonError('forbidden', 'Character cannot commit crimes right now.', 403),
            };
          }

          const crime = await tx.query.crimeDefinitions.findFirst({
            where: eq(crimeDefinitions.key, body.data.crimeKey),
          });

          if (!crime) {
            return { error: jsonError('not_found', 'Crime not found.', 404) };
          }

          const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'crime');

          if (!cooldown.ok) {
            return { error: jsonError(cooldown.code, cooldown.message, 429) };
          }

          if (
            refreshedCharacter.level < crime.requiredLevel ||
            refreshedCharacter.nerve < crime.requiredNerve
          ) {
            return {
              error: jsonError('forbidden', 'Character does not meet the crime requirements.', 403),
            };
          }

          const chance = calculateCrimeSuccessChance({
            intelligence: refreshedCharacter.intelligence,
            dexterity: refreshedCharacter.dexterity,
            heat: refreshedCharacter.heat,
            difficulty: crime.difficulty,
          });
          const success = Math.random() <= chance;
          const reward = success ? randomInt(crime.minReward, crime.maxReward) : 0;
          const consequence = success
            ? null
            : calculateFailedCrimeConsequence({
                heat: refreshedCharacter.heat,
                jailRisk: crime.jailRisk,
                difficulty: crime.difficulty,
                endurance: refreshedCharacter.endurance,
                defense: refreshedCharacter.defense,
              });
          const outcome = success
            ? 'success'
            : consequence?.type === 'jail'
              ? 'critical_failure'
              : 'failure';
          const heatGained = crime.heatGain;
          const experienceGain = calculateActionExperience({
            base: success ? crime.difficulty * 4 : 1,
            difficulty: crime.difficulty,
            success,
          });

          const [attempt] = await tx
            .insert(crimeAttempts)
            .values({
              characterId: refreshedCharacter.id,
              crimeKey: crime.key,
              outcome,
              reward,
              heatGained,
            })
            .returning();

          const statusUntil =
            consequence && consequence.type !== 'none'
              ? new Date(Date.now() + consequence.durationSeconds * 1000)
              : null;
          const nextStatus =
            consequence?.type === 'jail'
              ? 'jailed'
              : consequence?.type === 'hospital'
                ? 'hospitalized'
                : 'free';
          const nextHealth =
            consequence?.type === 'hospital'
              ? Math.max(1, refreshedCharacter.health - consequence.healthLost)
              : refreshedCharacter.health;
          const totalPenalty = (consequence?.fine ?? 0) + (consequence?.bill ?? 0);
          const characterUpdate = await resolveCrimeCharacterUpdate(tx, {
            characterId: refreshedCharacter.id,
            cashDelta: reward - totalPenalty,
            nerveCost: crime.requiredNerve,
            heatGain: heatGained,
            health: nextHealth,
            status: nextStatus,
            statusUntil,
            statusReason:
              consequence && consequence.type !== 'none'
                ? `${consequence.type}: ${crime.name}`
                : null,
            experienceGain,
          });

          if (!characterUpdate.ok || !characterUpdate.character) {
            return { error: jsonError('forbidden', 'Not enough nerve.', 403) };
          }

          const updatedCharacter = characterUpdate.character;

          if (consequence?.type === 'hospital' && statusUntil) {
            await tx.insert(hospitalStays).values({
              characterId: refreshedCharacter.id,
              reason: `Injured during ${crime.name}`,
              severity: consequence.severity,
              healthLost: consequence.healthLost,
              bill: consequence.bill,
              releasedAt: statusUntil,
            });
          }

          if (consequence?.type === 'jail' && statusUntil) {
            await tx.insert(jailSentences).values({
              characterId: refreshedCharacter.id,
              reason: `Arrested after ${crime.name}`,
              severity: consequence.severity,
              fine: consequence.fine,
              releaseAt: statusUntil,
            });
          }

          if (totalPenalty > 0) {
            await tx.insert(financialTransactions).values({
              characterId: refreshedCharacter.id,
              type: 'system',
              amount: String(-totalPenalty),
              description:
                consequence?.type === 'jail'
                  ? `Fine after ${crime.name}`
                  : `Hospital bill after ${crime.name}`,
              metadata: { crimeKey: crime.key, consequence },
            });
          }

          await tx.insert(playerEvents).values({
            userId: auth.userId,
            characterId: refreshedCharacter.id,
            type: success
              ? 'crime_succeeded'
              : consequence?.type === 'jail'
                ? 'crime_arrested'
                : consequence?.type === 'hospital'
                  ? 'crime_injury'
                  : 'crime_failed',
            payload: {
              crimeKey: crime.key,
              crimeName: crime.name,
              chance,
              reward,
              heatGained,
              consequence,
              experienceGain,
              progression: calculateProgressionFromExperience(updatedCharacter.experience),
            },
          });

          const lock = await setActionCooldown({
            tx,
            characterId: refreshedCharacter.id,
            actionType: 'crime',
            cooldownSeconds: crime.cooldownSeconds,
            metadata: { crimeKey: crime.key },
          });

          return {
            data: {
              attempt,
              character: updatedCharacter,
              chance,
              consequence,
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
