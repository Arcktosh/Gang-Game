import { and, asc, desc, eq, lte, sql } from 'drizzle-orm';
import {
  calculateTimedProgressionPlan,
  evaluateCourseRequirements,
  summarizeProgressionQueue,
} from '@drugdeal/game';
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
type Tx = any;

type CharacterRow = typeof characters.$inferSelect;
type TrainingSessionRow = typeof trainingSessions.$inferSelect;
type CourseEnrollmentRow = typeof courseEnrollments.$inferSelect;

function isTrainableStat(value: string): value is TrainableStat {
  return trainableStats.includes(value as TrainableStat);
}

function isCourseStat(value: string): value is CourseStat {
  return courseStats.includes(value as CourseStat);
}

function statValue(character: CharacterRow, stat: TrainableStat | CourseStat) {
  return Math.max(0, Number(character[stat] ?? 0));
}

function nextExperienceSql(experienceGain: number) {
  return sql`greatest(0, ${characters.experience} + ${Math.max(0, Math.floor(experienceGain))})`;
}

function nextLevelSql(experienceGain: number) {
  return sql`greatest(1, floor(sqrt((${nextExperienceSql(experienceGain)}) / 100.0))::integer + 1)`;
}

function nextMaxNerveSql(experienceGain: number) {
  return sql`greatest(${characters.maxNerve}, 20 + (${nextLevelSql(experienceGain)} - 1))`;
}

export async function listTrainingActivities() {
  return db.query.trainingActivities.findMany();
}

export async function listCourses() {
  return db.query.courseDefinitions.findMany();
}

export async function completeTraining(input: {
  userId: string;
  characterId: string;
  activityKey: string;
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const refreshedCharacter = await refreshCharacterResources(tx, character);

    if (refreshedCharacter.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available for training.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'training');

    if (!cooldown.ok) {
      return cooldown;
    }

    const activity = await tx.query.trainingActivities.findFirst({
      where: eq(trainingActivities.key, input.activityKey),
    });

    if (!activity) {
      return { ok: false as const, code: 'not_found', message: 'Training activity not found.' };
    }

    if (!isTrainableStat(activity.stat)) {
      return { ok: false as const, code: 'server_error', message: 'Unsupported training stat.' };
    }

    const plan = calculateTimedProgressionPlan({
      baseEnergyCost: activity.energyCost,
      baseCashCost: activity.cashCost,
      baseDurationSeconds: activity.durationSeconds,
      currentStat: statValue(refreshedCharacter, activity.stat),
    });

    if (refreshedCharacter.energy < plan.energyCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough energy.' };
    }

    if (refreshedCharacter.cash < plan.cashCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const [session] = await tx
      .insert(trainingSessions)
      .values({
        characterId: refreshedCharacter.id,
        activityKey: activity.key,
        status: 'scheduled',
        stat: activity.stat,
        statGain: activity.statGain,
        energyCost: plan.energyCost,
        cashCost: plan.cashCost,
        dueAt: plan.dueAt,
      })
      .returning();

    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        cash: refreshedCharacter.cash - plan.cashCost,
        energy: refreshedCharacter.energy - plan.energyCost,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, refreshedCharacter.id))
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: 'training_started',
      payload: {
        activityKey: activity.key,
        activityName: activity.name,
        stat: activity.stat,
        statGain: activity.statGain,
        energyCost: plan.energyCost,
        cashCost: plan.cashCost,
        dueAt: plan.dueAt.toISOString(),
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: refreshedCharacter.id,
      actionType: 'training',
      cooldownSeconds: plan.durationSeconds,
      metadata: {
        activityKey: activity.key,
        sessionId: session.id,
        dueAt: plan.dueAt.toISOString(),
      },
    });

    return {
      ok: true as const,
      data: { session, character: updatedCharacter, lock, dueAt: plan.dueAt },
    };
  });
}

export async function completeCourse(input: {
  userId: string;
  characterId: string;
  courseKey: string;
}) {
  return db.transaction(async (tx) => {
    const character = await tx.query.characters.findFirst({
      where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
    });

    if (!character) {
      return { ok: false as const, code: 'not_found', message: 'Character not found.' };
    }

    const refreshedCharacter = await refreshCharacterResources(tx, character);

    if (refreshedCharacter.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available for education.',
      };
    }

    const cooldown = await assertActionUnlocked(tx, refreshedCharacter.id, 'education');

    if (!cooldown.ok) {
      return cooldown;
    }

    const course = await tx.query.courseDefinitions.findFirst({
      where: eq(courseDefinitions.key, input.courseKey),
    });

    if (!course) {
      return { ok: false as const, code: 'not_found', message: 'Course not found.' };
    }

    if (!isCourseStat(course.stat)) {
      return { ok: false as const, code: 'server_error', message: 'Unsupported course stat.' };
    }

    const completedCourses = await tx.query.courseEnrollments.findMany({
      where: and(
        eq(courseEnrollments.characterId, refreshedCharacter.id),
        eq(courseEnrollments.status, 'completed'),
      ),
    });
    const requirement = evaluateCourseRequirements({
      characterLevel: refreshedCharacter.level,
      completedCourseKeys: completedCourses.map(
        (enrollment: CourseEnrollmentRow) => enrollment.courseKey,
      ),
      requiredLevel: course.requiredLevel,
      prerequisiteCourseKey: course.prerequisiteCourseKey,
    });

    if (!requirement.ok) {
      return { ok: false as const, code: requirement.code, message: requirement.message };
    }

    const plan = calculateTimedProgressionPlan({
      baseEnergyCost: course.energyCost,
      baseCashCost: course.cashCost,
      baseDurationSeconds: course.durationSeconds,
      currentStat: statValue(refreshedCharacter, course.stat),
    });

    if (refreshedCharacter.energy < plan.energyCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough energy.' };
    }

    if (refreshedCharacter.cash < plan.cashCost) {
      return { ok: false as const, code: 'forbidden', message: 'Not enough cash.' };
    }

    const [enrollment] = await tx
      .insert(courseEnrollments)
      .values({
        characterId: refreshedCharacter.id,
        courseKey: course.key,
        status: 'scheduled',
        stat: course.stat,
        statGain: course.statGain,
        cashCost: plan.cashCost,
        energyCost: plan.energyCost,
        dueAt: plan.dueAt,
      })
      .returning();

    const [updatedCharacter] = await tx
      .update(characters)
      .set({
        cash: refreshedCharacter.cash - plan.cashCost,
        energy: refreshedCharacter.energy - plan.energyCost,
        updatedAt: sql`now()`,
      })
      .where(eq(characters.id, refreshedCharacter.id))
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: refreshedCharacter.id,
      type: 'course_started',
      payload: {
        courseKey: course.key,
        courseName: course.name,
        stat: course.stat,
        statGain: course.statGain,
        energyCost: plan.energyCost,
        cashCost: plan.cashCost,
        dueAt: plan.dueAt.toISOString(),
      },
    });

    const lock = await setActionCooldown({
      tx,
      characterId: refreshedCharacter.id,
      actionType: 'education',
      cooldownSeconds: plan.durationSeconds,
      metadata: {
        courseKey: course.key,
        enrollmentId: enrollment.id,
        dueAt: plan.dueAt.toISOString(),
      },
    });

    return {
      ok: true as const,
      data: { enrollment, character: updatedCharacter, lock, dueAt: plan.dueAt },
    };
  });
}

async function completeTrainingSession(tx: Tx, session: TrainingSessionRow) {
  if (!isTrainableStat(session.stat)) {
    await tx
      .update(trainingSessions)
      .set({ status: 'cancelled' })
      .where(eq(trainingSessions.id, session.id));
    return null;
  }

  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, session.characterId),
  });

  if (!character) {
    await tx
      .update(trainingSessions)
      .set({ status: 'cancelled' })
      .where(eq(trainingSessions.id, session.id));
    return null;
  }

  const [updatedCharacter] = await tx
    .update(characters)
    .set({
      [session.stat]: sql`${characters[session.stat]} + ${session.statGain}`,
      experience: nextExperienceSql(Math.max(1, session.statGain * 2)),
      level: nextLevelSql(Math.max(1, session.statGain * 2)),
      maxNerve: nextMaxNerveSql(Math.max(1, session.statGain * 2)),
      nerve: sql`least(${characters.nerve}, ${nextMaxNerveSql(Math.max(1, session.statGain * 2))})`,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, session.characterId))
    .returning();

  const [updatedSession] = await tx
    .update(trainingSessions)
    .set({ status: 'completed', completedAt: sql`now()` })
    .where(and(eq(trainingSessions.id, session.id), eq(trainingSessions.status, 'scheduled')))
    .returning();

  if (updatedCharacter && updatedSession) {
    await tx.insert(playerEvents).values({
      userId: character.userId,
      characterId: character.id,
      type: 'training_completed',
      payload: {
        activityKey: session.activityKey,
        stat: session.stat,
        statGain: session.statGain,
        sessionId: session.id,
      },
    });
  }

  return updatedSession ?? null;
}

async function completeCourseEnrollment(tx: Tx, enrollment: CourseEnrollmentRow) {
  if (!isCourseStat(enrollment.stat)) {
    await tx
      .update(courseEnrollments)
      .set({ status: 'cancelled' })
      .where(eq(courseEnrollments.id, enrollment.id));
    return null;
  }

  const [character, course] = await Promise.all([
    tx.query.characters.findFirst({ where: eq(characters.id, enrollment.characterId) }),
    tx.query.courseDefinitions.findFirst({
      where: eq(courseDefinitions.key, enrollment.courseKey),
    }),
  ]);

  if (!character || !course) {
    await tx
      .update(courseEnrollments)
      .set({ status: 'cancelled' })
      .where(eq(courseEnrollments.id, enrollment.id));
    return null;
  }

  const experienceGain = Math.max(1, course.experienceGain);
  const [updatedCharacter] = await tx
    .update(characters)
    .set({
      [enrollment.stat]: sql`${characters[enrollment.stat]} + ${enrollment.statGain}`,
      experience: nextExperienceSql(experienceGain),
      level: nextLevelSql(experienceGain),
      maxNerve: nextMaxNerveSql(experienceGain),
      nerve: sql`least(${characters.nerve}, ${nextMaxNerveSql(experienceGain)})`,
      updatedAt: sql`now()`,
    })
    .where(eq(characters.id, enrollment.characterId))
    .returning();

  const [updatedEnrollment] = await tx
    .update(courseEnrollments)
    .set({ status: 'completed', completedAt: sql`now()` })
    .where(and(eq(courseEnrollments.id, enrollment.id), eq(courseEnrollments.status, 'scheduled')))
    .returning();

  if (updatedCharacter && updatedEnrollment) {
    await tx.insert(playerEvents).values({
      userId: character.userId,
      characterId: character.id,
      type: 'course_completed',
      payload: {
        courseKey: enrollment.courseKey,
        courseName: course.name,
        stat: enrollment.stat,
        statGain: enrollment.statGain,
        enrollmentId: enrollment.id,
      },
    });
  }

  return updatedEnrollment ?? null;
}

export async function completeDueProgression(limit = 50) {
  return db.transaction(async (tx) => {
    const batchSize = Math.max(1, Math.min(250, Math.floor(limit)));
    const [trainingDue, coursesDue] = await Promise.all([
      tx.query.trainingSessions.findMany({
        where: and(
          eq(trainingSessions.status, 'scheduled'),
          lte(trainingSessions.dueAt, sql`now()`),
        ),
        orderBy: asc(trainingSessions.dueAt),
        limit: batchSize,
      }),
      tx.query.courseEnrollments.findMany({
        where: and(
          eq(courseEnrollments.status, 'scheduled'),
          lte(courseEnrollments.dueAt, sql`now()`),
        ),
        orderBy: asc(courseEnrollments.dueAt),
        limit: batchSize,
      }),
    ]);

    let completedTraining = 0;
    let completedCourses = 0;

    for (const session of trainingDue as TrainingSessionRow[]) {
      const completed = await completeTrainingSession(tx, session);
      if (completed) {
        completedTraining += 1;
      }
    }

    for (const enrollment of coursesDue as CourseEnrollmentRow[]) {
      const completed = await completeCourseEnrollment(tx, enrollment);
      if (completed) {
        completedCourses += 1;
      }
    }

    return {
      completedTraining,
      completedCourses,
      processed: completedTraining + completedCourses,
    };
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

  return { training, courses, queue: summarizeProgressionQueue({ training, courses }) };
}
