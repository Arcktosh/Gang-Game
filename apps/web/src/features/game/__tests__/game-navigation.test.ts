import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_NAV_GROUPS, resolveActiveGameHref } from '../game-navigation';

test('game navigation groups routes by gameplay domain without duplicate links', () => {
  assert.deepEqual(
    GAME_NAV_GROUPS.map((group) => group.label),
    ['Overview', 'Character', 'Actions', 'Economy', 'Inventory', 'Community', 'World'],
  );

  const hrefs = GAME_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(hrefs.includes('/dashboard/actions'), true);
  assert.equal(hrefs.includes('/profile/history'), true);
  assert.equal(hrefs.includes('/inventory/transfers'), true);
});

test('active navigation uses the most specific matching route', () => {
  assert.equal(resolveActiveGameHref('/dashboard'), '/dashboard');
  assert.equal(resolveActiveGameHref('/dashboard/activity'), '/dashboard/activity');
  assert.equal(resolveActiveGameHref('/dashboard/activity/archive'), '/dashboard/activity');
  assert.equal(resolveActiveGameHref('/profile/achievements'), '/profile/achievements');
  assert.equal(resolveActiveGameHref('/inventory/items/example'), '/inventory/items');
  assert.equal(resolveActiveGameHref('/unknown'), undefined);
});
