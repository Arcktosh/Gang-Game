import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  characters,
  courseDefinitions,
  courseEnrollments,
  playerEvents,
  trainingActivities,
  trainingSessions,
} from '../schema';
import { assertActionUnlocked, refreshCharacterResources, setActionCooldown } from './action-state';

const trainableStats = ['strength', 'stamina', 'defense', 'dexterity', 'endurance'] as const;
const courseStats = ['intelligence', 'labour', 'endurance'] as const;

type TrainableStat = (typeof trainableStats)[number];
type CourseStat = (typeof courseStats)[number];

function isTrainableStat(value: string): value is TrainableStat {
  return trainableStats.includes(value as TrainableStat);
}

function isCourseStat(value: string): value is CourseStat {
  return courseStats.includes(value as CourseStat);
}

export async function listTrainingActivities() {
  return db.query.trainingActivities.findMany();
}

export async function listCourses() {
  return db.query.courseDefinitions.findMany();
}

export async function completeTraining(input: { userId: string; characterId: string; activityKey: string }) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const refreshedCharacter = await refreshCharacterResources(tx, character);

    if (refreshedCharacter.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for training.' };
    }

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'training');

    if (!cooldown.ok) {
      return cooldown;
    }

    const activity = await tx.query.trainingActivities.findFirst({ where: eq(trainingActivities.key, input.activityKey) });

    if (!activity) {
      return { ok: false as const, code: 'not_found', message: 'Training activity not found.' };
    }

    if (refreshedCharacter.energy < activity.energyCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough energy.' };
    }

    if (refreshedCharacter.cash < activity.cashCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    if (!isTrainableStat(activity.stat)) {
      return { ok: false as const, code: 'server_error', message: 'Unsupported training stat.' };
    }

    const [session] = await tx
      .insert(trainingSessions)
      .values({
        characterId: refreshedCharacter.id,
        activityKey: activity.key,
        stat: activity.stat,
        statGain: activity.statGain,
        energyCost: activity.energyCost,
        cashCost: activity.cashCost,
        completedAt: sql`now()`,
      })
      .returning();

    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        [activity.stat]: refreshedCharacter[activity.stat] + activity.statGain,
        cash: refreshedCharacter.cash - activity.cashCost,
        energy: refreshedCharacter.energy - activity.energyCost,
        experience: refreshedCharacter.experience + activity.experienceGain,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, refreshedCharacter.id))
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: 'training_completed',
      payload: {
        activityKey: activity.key,
        activityName: activity.name,
        stat: activity.stat,
        statGain: activity.statGain,
        energyCost: activity.energyCost,
        cashCost: activity.cashCost,
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: refreshedCharacter.id,
      actionType: 'training',
      cooldownSeconds: activity.durationSeconds,
      metadata: { activityKey: activity.key },
    });

    return { ok: true as const, data: { session, character: updatedCharacter, lock } };
  });
}

export async function completeCourse(input: { userId: string; characterId: string; courseKey: string }) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const refreshedCharacter = await refreshCharacterResources(tx, character);

    if (refreshedCharacter.status !== 'free') {
      return { ok: false as const, code: 'forbidden', message: 'Character is not available for education.' };
    }

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'education');

    if (!cooldown.ok) {
      return cooldown;
    }

    const course = await tx.query.courseDefinitions.findFirst({ where: eq(courseDefinitions.key, input.courseKey) });

    if (!course) {
      return { ok: false as const, code: 'not_found', message: 'Course not found.' };
    }

    if (refreshedCharacter.energy < course.energyCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough energy.' };
    }

    if (refreshedCharacter.cash < course.cashCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    if (!isCourseStat(course.stat)) {
      return { ok: false as const, code: 'server_error', message: 'Unsupported course stat.' };
    }

    const [enrollment] = await tx
      .insert(courseEnrollments)
      .values({
        characterId: refreshedCharacter.id,
        courseKey: course.key,
        stat: course.stat,
        statGain: course.statGain,
        cashCost: course.cashCost,
        energyCost: course.energyCost,
        completedAt: sql`now()`,
      })
      .returning();

    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        [course.stat]: refreshedCharacter[course.stat] + course.statGain,
        cash: refreshedCharacter.cash - course.cashCost,
        energy: refreshedCharacter.energy - course.energyCost,
        experience: refreshedCharacter.experience + course.experienceGain,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, refreshedCharacter.id))
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: 'course_completed',
      payload: {
        courseKey: course.key,
        courseName: course.name,
        stat: course.stat,
        statGain: course.statGain,
        energyCost: course.energyCost,
        cashCost: course.cashCost,
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: refreshedCharacter.id,
      actionType: 'education',
      cooldownSeconds: course.durationSeconds,
      metadata: { courseKey: course.key },
    });

    return { ok: true as const, data: { enrollment, character: updatedCharacter, lock } };
  });
}

export async function listCharacterProgression(characterId: string) {
  const [training, courses] = await Promise.all([
    db.query.trainingSessions.findMany({
      where: eq(trainingSessions.characterId, characterId),
      orderBy: desc(trainingSessions.startedAt),
      limit: 20,
    }),
    db.query.courseEnrollments.findMany({
      where: eq(courseEnrollments.characterId, characterId),
      orderBy: desc(courseEnrollments.startedAt),
      limit: 20,
    }),
  ]);

  return { training, courses };
}
