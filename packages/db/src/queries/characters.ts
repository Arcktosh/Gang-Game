import { and, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { characters, playerEvents } from '../schema';

export type CreateCharacterInput = {
  userId: string;
  name: string;
};

export async function createCharacter(input: CreateCharacterInput) {
  return db.transaction(async (tx) => {
    const [character] = await tx
      .insert(characters)
      .values({ name: input.name, userId: input.userId })
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      type: 'character_created',
      payload: { name: character.name, location: character.location },
    });

    return character;
  });
}

export async function listCharactersForUser(userId: string) {
  return db.query.characters.findMany({
    where: eq(characters.userId, userId),
    orderBy: desc(characters.createdAt),
  });
}

export async function getCharacterForUser(characterId: string, userId: string) {
  return db.query.characters.findFirst({
    where: and(eq(characters.id, characterId), eq(characters.userId, userId)),
  });
}

export async function listCharacterEvents(characterId: string, userId: string, limit = 50, offset = 0) {
  const character = await getCharacterForUser(characterId, userId);

  if (!character) {
    return null;
  }

  return db.query.playerEvents.findMany({
    where: eq(playerEvents.characterId, characterId),
    orderBy: desc(playerEvents.createdAt),
    limit,
    offset,
  });
}
