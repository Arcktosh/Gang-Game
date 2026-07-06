import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredPages = [
  ['profile', 'apps/web/src/app/(game)/profile/page.tsx'],
  ['jobs', 'apps/web/src/app/(game)/jobs/page.tsx'],
  ['crimes', 'apps/web/src/app/(game)/crimes/page.tsx'],
  ['legal', 'apps/web/src/app/(game)/legal/page.tsx'],
  ['market', 'apps/web/src/app/(game)/market/page.tsx'],
  ['shops', 'apps/web/src/app/(game)/shops/page.tsx'],
  ['messages', 'apps/web/src/app/(game)/messages/page.tsx'],
  ['newspaper', 'apps/web/src/app/(game)/newspaper/page.tsx'],
  ['factions', 'apps/web/src/app/(game)/factions/page.tsx'],
];

const errors = [];
const shellPath = path.join(root, 'apps/web/src/features/game/game-page.tsx');
const sideMenuPath = path.join(root, 'apps/web/src/features/game/game-side-menu.tsx');

if (!existsSync(shellPath)) {
  errors.push('Missing shared MVP game page shell at apps/web/src/features/game/game-page.tsx.');
}

if (!existsSync(sideMenuPath)) {
  errors.push('Missing shared MVP side menu at apps/web/src/features/game/game-side-menu.tsx.');
}

const shell = existsSync(shellPath) ? readFileSync(shellPath, 'utf8') : '';
const sideMenu = existsSync(sideMenuPath) ? readFileSync(sideMenuPath, 'utf8') : '';
const navigationSource = `${shell}
${sideMenu}`;

for (const [slug, relativePath] of requiredPages) {
  const absolutePath = path.join(root, relativePath);

  if (!existsSync(absolutePath)) {
    errors.push(`Missing MVP page for ${slug}: ${relativePath}`);
    continue;
  }

  const source = readFileSync(absolutePath, 'utf8');
  if (!source.includes('GamePageShell')) {
    errors.push(`MVP page ${slug} does not use GamePageShell.`);
  }
  if (!source.includes('getActiveGameContext')) {
    errors.push(`MVP page ${slug} does not enforce authenticated active-character context.`);
  }
  if (!navigationSource.includes(`/${slug}`)) {
    errors.push(`MVP navigation does not link to /${slug}.`);
  }
}

if (!navigationSource.includes('/dashboard')) {
  errors.push('MVP navigation does not link back to /dashboard.');
}

if (errors.length > 0) {
  console.error('MVP page validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`MVP page validation passed: ${requiredPages.length} dedicated player pages are present and linked.`);
