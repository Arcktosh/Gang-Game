#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const progression = read('packages/game/src/progression.ts');
for (const symbol of ['calculateExperienceForLevel', 'calculateProgressionFromExperience', 'calculateProgressionRewards', 'calculateActionExperience']) {
  if (!progression.includes(`export function ${symbol}`)) {
    errors.push(`Missing ${symbol} export in progression formulas.`);
  }
}

const transactionSafety = read('packages/db/src/queries/transaction-safety.ts');
for (const symbol of ['nextExperienceSql', 'nextLevelSql', 'nextMaxNerveSql']) {
  if (!transactionSafety.includes(`function ${symbol}`)) {
    errors.push(`Missing ${symbol} helper in transaction safety updates.`);
  }
}

for (const requiredSnippet of ['level: nextLevelSql(input.experienceGain)', 'maxNerve: nextMaxNerveSql(input.experienceGain)']) {
  const count = transactionSafety.split(requiredSnippet).length - 1;
  if (count < 2) {
    errors.push(`Expected job and crime updates to include ${requiredSnippet}. Found ${count}.`);
  }
}

const gameplayActions = read('packages/db/src/queries/gameplay-actions.ts');
if (!gameplayActions.includes('calculateActionExperience') || !gameplayActions.includes('calculateProgressionFromExperience(updatedCharacter.experience)')) {
  errors.push('Reusable gameplay action services do not return deterministic action experience and progression snapshots.');
}

const jobsRoute = read('apps/web/src/app/api/jobs/route.ts');
if (!jobsRoute.includes('runJobAction')) {
  errors.push('Jobs route does not delegate to the reusable job action service.');
}

const crimesRoute = read('apps/web/src/app/api/crimes/route.ts');
if (!crimesRoute.includes('runCrimeAction')) {
  errors.push('Crimes route does not delegate to the reusable crime action service.');
}

const profilePage = [
  read('apps/web/src/app/(game)/profile/page.tsx'),
  read('apps/web/src/features/profile/profile-section-page.tsx'),
].join('\n');
for (const snippet of ['calculateProgressionFromExperience(character.experience)', 'experienceIntoLevel', 'experienceForNextLevel', 'Current reward']) {
  if (!profilePage.includes(snippet)) {
    errors.push(`Profile page does not expose progression snippet: ${snippet}`);
  }
}

const tests = read('packages/game/src/__tests__/economy-progress.test.ts');
for (const snippet of ['calculateProgressionFromExperience', 'calculateExperienceForLevel', 'calculateActionExperience']) {
  if (!tests.includes(snippet)) {
    errors.push(`Game formula tests do not cover ${snippet}.`);
  }
}

if (errors.length > 0) {
  console.error('MVP gameplay validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('MVP gameplay validation passed: XP curve, progression rewards, route progression snapshots, and profile XP display are wired.');
