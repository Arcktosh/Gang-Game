#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing ${relativePath}.`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

const actionForm = read('apps/web/src/features/game/action-form.tsx');
for (const snippet of ['use client', 'fetch(endpoint', 'idempotency-key', 'router.refresh()', 'omitWhenEmpty']) {
  if (!actionForm.includes(snippet)) {
    errors.push(`Playable action form is missing ${snippet}.`);
  }
}

const requiredPageActions = [
  ['jobs', 'apps/web/src/app/(game)/jobs/page.tsx', ['/api/jobs', "action: 'apply'", "action: 'work'", "action: 'resign'"]],
  ['crimes', 'apps/web/src/app/(game)/crimes/page.tsx', ['/api/crimes', 'Attempt crime']],
  ['legal', 'apps/web/src/app/(game)/legal/page.tsx', ['/api/legal/lawyer', '/api/legal/bribe', '/api/legal/hospital']],
  ['market', 'apps/web/src/app/(game)/market/page.tsx', ['/api/market', "action: 'buy'", "action: 'sell'"]],
  ['shops', 'apps/web/src/app/(game)/shops/page.tsx', ['/api/shops/purchase', '/api/shops/actions', '/api/shops/listings']],
  ['messages', 'apps/web/src/app/(game)/messages/page.tsx', ['/api/messages', "action: 'send'", 'recipientCharacterId']],
  ['factions', 'apps/web/src/app/(game)/factions/page.tsx', ['/api/factions', '/join', '/leave']],
];

for (const [slug, relativePath, snippets] of requiredPageActions) {
  const source = read(relativePath);

  if (!source.includes('GameActionForm')) {
    errors.push(`${slug} page does not use GameActionForm.`);
  }

  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      errors.push(`${slug} page is missing playable action wiring snippet: ${snippet}`);
    }
  }
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['validate:playable-actions']) {
  errors.push('package.json is missing validate:playable-actions script.');
}
if (!packageJson.scripts?.['validate:static']?.includes('pnpm validate:playable-actions')) {
  errors.push('validate:static does not include validate:playable-actions.');
}

if (errors.length > 0) {
  console.error('Playable action validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Playable action validation passed: ${requiredPageActions.length} MVP pages expose authenticated POST action forms.`);
