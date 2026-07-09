import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createIntegrationCharacter,
  createIntegrationUser,
  db,
  resetMvpIntegrationState,
  shouldRunDbIntegrationTests,
} from '@drugdeal/db';
import { calculateProgressionFromExperience } from '@drugdeal/game';

const integrationEnabled = shouldRunDbIntegrationTests();

test('MVP database integration scaffold is explicitly opt-in', () => {
  assert.equal(typeof integrationEnabled, 'boolean');
});

test(
  'MVP flow persists a user, character, and progression-ready state',
  { skip: !integrationEnabled },
  async () => {
    await resetMvpIntegrationState();

    const user = await createIntegrationUser({});
    const character = await createIntegrationCharacter({ userId: user.id });
    const progression = calculateProgressionFromExperience(character.experience);

    assert.equal(user.email, 'mvp-test-player@example.test');
    assert.equal(character.userId, user.id);
    assert.equal(progression.level, character.level);

    const persistedCharacter = await db.query.characters.findFirst();
    assert.equal(persistedCharacter?.id, character.id);
  },
);
