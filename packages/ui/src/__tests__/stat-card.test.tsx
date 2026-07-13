import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactElement } from 'react';

import { StatCard } from '../stat-card';

test('StatCard preserves its semantic structure and supplied values', () => {
  const card = StatCard({ label: 'Cash', value: 1_250 });
  const children = card.props.children as ReactElement<{ children: unknown }>[];

  assert.equal(card.type, 'article');
  assert.equal(children.length, 2);
  assert.equal(children[0]?.type, 'h2');
  assert.equal(children[0]?.props.children, 'Cash');
  assert.equal(children[1]?.type, 'p');
  assert.equal(children[1]?.props.children, 1_250);
});

test('StatCard accepts string values without transforming display content', () => {
  const card = StatCard({ label: 'Status', value: 'Ready' });
  const children = card.props.children as ReactElement<{ children: unknown }>[];

  assert.equal(children[1]?.props.children, 'Ready');
});
