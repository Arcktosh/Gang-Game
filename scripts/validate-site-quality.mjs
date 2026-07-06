#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function requireFile(relativePath) {
  if (!exists(relativePath)) {
    errors.push(`${relativePath} is missing.`);
    return '';
  }
  return read(relativePath);
}

function requireIncludes(relativePath, terms) {
  const source = requireFile(relativePath);
  for (const term of terms) {
    if (!source.includes(term)) {
      errors.push(`${relativePath} must include ${term}.`);
    }
  }
}

requireIncludes('apps/web/src/app/layout.tsx', [
  'metadataBase',
  'applicationName',
  'openGraph',
  'twitter',
  'manifest: \'/manifest.webmanifest\'',
  'export const viewport',
  'Skip to main content',
  'id="main-content"',
]);

requireIncludes('apps/web/src/app/manifest.ts', [
  'MetadataRoute.Manifest',
  'display: \'standalone\'',
  'theme_color',
  'start_url',
  'shortcuts',
  '/icons/icon.svg',
  '/icons/maskable-icon.svg',
]);

requireIncludes('apps/web/src/app/robots.ts', ['MetadataRoute.Robots', 'sitemap', 'disallow', '/api']);
requireIncludes('apps/web/src/app/sitemap.ts', ['MetadataRoute.Sitemap', '/onboarding', '/privacy', '/terms', '/rules']);

for (const relativePath of ['apps/web/public/icons/icon.svg', 'apps/web/public/icons/maskable-icon.svg', 'apps/web/public/icons/apple-touch-icon.svg', 'apps/web/public/opengraph-image.svg']) {
  requireFile(relativePath);
}

requireIncludes('apps/web/src/app/globals.css', [
  ':focus-visible',
  '.skip-link',
  '@media (max-width: 720px)',
  '@media (prefers-reduced-motion: reduce)',
  'min-height: 44px',
  '.action-form__control',
  '.nav-pill',
]);

requireIncludes('apps/web/src/features/game/game-page.tsx', [
  'aria-labelledby="game-page-title"',
  'GameSideMenu',
  'className="grid"',
]);

requireIncludes('apps/web/src/features/game/game-side-menu.tsx', [
  'aria-label="Game navigation and character stats"',
  'aria-label="Game pages"',
  'game-sidebar__link--active',
  "aria-current={active ? \'page\' : undefined}",
]);

requireIncludes('apps/web/src/features/game/action-form.tsx', [
  'useId',
  'htmlFor={fieldId}',
  'id={fieldId}',
  'aria-describedby',
  'aria-live="polite"',
  'className="action-form__control"',
]);

requireIncludes('apps/web/src/app/page.tsx', ['aria-labelledby="home-title"', 'className="button-link button-link--primary"', 'aria-label="Primary site links"']);

const packageJson = JSON.parse(requireFile('package.json'));
if (!packageJson.scripts?.['validate:site-quality']) {
  errors.push('package.json is missing validate:site-quality.');
}
if (!packageJson.scripts?.['validate:static']?.includes('pnpm validate:site-quality')) {
  errors.push('package.json validate:static must include pnpm validate:site-quality.');
}

requireIncludes('docs/site-quality.md', ['Accessibility', 'Responsive design', 'PWA', 'SEO', 'Validation']);
requireIncludes('README.md', ['Feature Pass 60', 'site-quality']);
requireIncludes('docs/project-status.md', ['Feature Pass 60', 'accessibility', 'PWA', 'SEO']);
requireIncludes('docs/remaining-work.md', ['Feature Pass 60', 'Lighthouse']);
requireIncludes('docs/feature-checklist.md', ['Feature Pass 60', 'Accessibility, responsive design, PWA, and SEO']);
requireIncludes('docs/validation-audit.md', ['validate:site-quality', 'site quality']);
requireIncludes('docs/feature-history.md', ['Pass 60', 'Site Quality', 'validate:site-quality']);

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    pwaFiles: 6,
    errors: errors.length,
    ok: errors.length === 0,
  },
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
