import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredPages = [
  { label: 'dashboard overview', href: '/dashboard', path: 'apps/web/src/app/(game)/dashboard/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard actions', href: '/dashboard/actions', path: 'apps/web/src/app/(game)/dashboard/actions/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard messages', href: '/dashboard/messages', path: 'apps/web/src/app/(game)/dashboard/messages/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard activity', href: '/dashboard/activity', path: 'apps/web/src/app/(game)/dashboard/activity/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard economy', href: '/dashboard/economy', path: 'apps/web/src/app/(game)/dashboard/economy/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard progression', href: '/dashboard/progression', path: 'apps/web/src/app/(game)/dashboard/progression/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard crew', href: '/dashboard/crew', path: 'apps/web/src/app/(game)/dashboard/crew/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'dashboard news', href: '/dashboard/news', path: 'apps/web/src/app/(game)/dashboard/news/page.tsx', implementation: 'apps/web/src/features/dashboard/dashboard-section-page.tsx' },
  { label: 'profile overview', href: '/profile', path: 'apps/web/src/app/(game)/profile/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'profile status', href: '/profile/status', path: 'apps/web/src/app/(game)/profile/status/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'profile titles', href: '/profile/titles', path: 'apps/web/src/app/(game)/profile/titles/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'profile rewards', href: '/profile/rewards', path: 'apps/web/src/app/(game)/profile/rewards/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'profile achievements', href: '/profile/achievements', path: 'apps/web/src/app/(game)/profile/achievements/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'profile history', href: '/profile/history', path: 'apps/web/src/app/(game)/profile/history/page.tsx', implementation: 'apps/web/src/features/profile/profile-section-page.tsx' },
  { label: 'inventory summary', href: '/inventory', path: 'apps/web/src/app/(game)/inventory/page.tsx', implementation: 'apps/web/src/features/inventory/inventory-section-page.tsx' },
  { label: 'inventory items', href: '/inventory/items', path: 'apps/web/src/app/(game)/inventory/items/page.tsx', implementation: 'apps/web/src/features/inventory/inventory-section-page.tsx' },
  { label: 'inventory transfers', href: '/inventory/transfers', path: 'apps/web/src/app/(game)/inventory/transfers/page.tsx', implementation: 'apps/web/src/features/inventory/inventory-section-page.tsx' },
  { label: 'jobs', href: '/jobs', path: 'apps/web/src/app/(game)/jobs/page.tsx' },
  { label: 'crimes', href: '/crimes', path: 'apps/web/src/app/(game)/crimes/page.tsx' },
  { label: 'legal', href: '/legal', path: 'apps/web/src/app/(game)/legal/page.tsx' },
  { label: 'market', href: '/market', path: 'apps/web/src/app/(game)/market/page.tsx' },
  { label: 'shops', href: '/shops', path: 'apps/web/src/app/(game)/shops/page.tsx' },
  { label: 'contracts', href: '/contracts', path: 'apps/web/src/app/(game)/contracts/page.tsx' },
  { label: 'trades', href: '/trades', path: 'apps/web/src/app/(game)/trades/page.tsx' },
  { label: 'messages', href: '/messages', path: 'apps/web/src/app/(game)/messages/page.tsx' },
  { label: 'newspaper', href: '/newspaper', path: 'apps/web/src/app/(game)/newspaper/page.tsx' },
  { label: 'factions', href: '/factions', path: 'apps/web/src/app/(game)/factions/page.tsx' },
];

const errors = [];
const shellPath = path.join(root, 'apps/web/src/features/game/game-page.tsx');
const sideMenuPath = path.join(root, 'apps/web/src/features/game/game-side-menu.tsx');
const navigationPath = path.join(root, 'apps/web/src/features/game/game-navigation.ts');

function requireTerms(relativePath, terms) {
  const absolutePath = path.join(root, relativePath);

  if (!existsSync(absolutePath)) {
    errors.push(`Missing required production UX file: ${relativePath}`);
    return;
  }

  const source = readFileSync(absolutePath, 'utf8');
  for (const term of terms) {
    if (!source.includes(term)) {
      errors.push(`${relativePath} must include ${term}.`);
    }
  }
}

if (!existsSync(shellPath)) {
  errors.push('Missing shared MVP game page shell at apps/web/src/features/game/game-page.tsx.');
}

if (!existsSync(sideMenuPath)) {
  errors.push('Missing shared MVP side menu at apps/web/src/features/game/game-side-menu.tsx.');
}

const shell = existsSync(shellPath) ? readFileSync(shellPath, 'utf8') : '';
const sideMenu = existsSync(sideMenuPath) ? readFileSync(sideMenuPath, 'utf8') : '';
const gameNavigation = existsSync(navigationPath) ? readFileSync(navigationPath, 'utf8') : '';
const navigationSource = `${shell}
${sideMenu}
${gameNavigation}`;

for (const page of requiredPages) {
  const absolutePath = path.join(root, page.path);

  if (!existsSync(absolutePath)) {
    errors.push(`Missing MVP page for ${page.label}: ${page.path}`);
    continue;
  }

  const pageSource = readFileSync(absolutePath, 'utf8');
  const implementationPath = page.implementation ? path.join(root, page.implementation) : null;
  const implementationSource = implementationPath && existsSync(implementationPath)
    ? readFileSync(implementationPath, 'utf8')
    : '';
  const source = `${pageSource}
${implementationSource}`;

  if (page.implementation && !implementationSource) {
    errors.push(`Missing shared implementation for ${page.label}: ${page.implementation}`);
  }
  if (!source.includes('GamePageShell')) {
    errors.push(`MVP page ${page.label} does not use GamePageShell directly or through its shared implementation.`);
  }
  const usesActiveContext = source.includes('getActiveGameContext');
  const usesDashboardContext =
    source.includes('getCurrentSession') &&
    source.includes('listCharactersForUser') &&
    source.includes("redirect('/create-character')");
  if (!usesActiveContext && !usesDashboardContext) {
    errors.push(`MVP page ${page.label} does not enforce authenticated active-character context.`);
  }
  if (!navigationSource.includes(`href: '${page.href}'`)) {
    errors.push(`MVP navigation does not link to ${page.href}.`);
  }
}

const productionUxChecks = [
  [
    'apps/web/src/app/(game)/layout.tsx',
    ['getCurrentSession', 'listCharactersForUser', "redirect('/login')", "redirect('/create-character')"],
  ],
  [
    'apps/web/src/app/(auth)/create-character/page.tsx',
    ['CharacterCreationForm', 'listCharactersForUser', "redirect('/dashboard')"],
  ],
  [
    'apps/web/src/features/auth/character-creation-form.tsx',
    ["fetch('/api/characters'", "router.replace('/dashboard')", 'setIsSubmitting(false)'],
  ],
  [
    'apps/web/src/features/game/collapsible-card.tsx',
    ['<details', '<summary', 'open={open}', 'onToggle', 'if (!visible)', 'return null', 'collapsible-card__body'],
  ],
  [
    'apps/web/src/features/game/game-navigation.ts',
    [
      "label: 'Overview'",
      "label: 'Character'",
      "label: 'Actions'",
      "label: 'Economy'",
      "label: 'Inventory'",
      "label: 'Community'",
      "label: 'World'",
      'resolveActiveGameHref',
    ],
  ],
  [
    'apps/web/src/features/game/game-side-menu.tsx',
    ['GAME_NAV_GROUPS', 'aria-controls={contentId}', 'aria-current={active'],
  ],
  [
    'apps/web/src/features/game/__tests__/game-navigation.test.ts',
    ['most specific matching route', "'/dashboard/activity'", "'/inventory/items'"],
  ],
  [
    'apps/web/src/features/profile/profile-section-page.tsx',
    [
      "export type ProfileSection",
      "section === 'overview'",
      "section === 'history'",
      'CollapsibleCard',
    ],
  ],
  [
    'apps/web/src/features/inventory/inventory-section-page.tsx',
    [
      "export type InventorySection",
      "section === 'summary'",
      "section === 'transfers'",
      'CollapsibleCard',
    ],
  ],
  [
    'apps/web/src/features/dashboard/character-panel.tsx',
    [
      'activeSection: DashboardSectionId',
      '<CollapsibleCard',
      "activeSection !== 'dashboard-activity'",
      "activeSection !== 'dashboard-messages'",
      'ProductImage',
      'SupplyDemandGraph',
      'purchasableShopListings',
      'dashboardAvailableContracts.length > 0',
      'dashboardOwnContracts.length > 0',
      'canPostDashboardFactionContract',
    ],
  ],
  [
    'apps/web/src/app/(game)/market/page.tsx',
    ['ProductImage', 'SupplyDemandGraph', 'className="product-grid"', 'className="product-details"'],
  ],
  [
    'apps/web/src/app/(game)/shops/page.tsx',
    [
      'ProductImage',
      'SupplyDemandGraph',
      'purchasableListings.length > 0',
      'ownShops.length > 0',
      'className="product-details"',
    ],
  ],
  [
    'apps/web/src/app/(game)/contracts/page.tsx',
    [
      'canCreateFactionContract',
      'recipientOptions.length > 0',
      'canPostFactionContract',
      'actionableOpenContracts.length > 0',
      'contracts.mine.length > 0',
    ],
  ],
  [
    'apps/web/src/app/(game)/factions/page.tsx',
    [
      'canWithdrawFactionFunds',
      'showArmoryOperations',
      'showArmoryStocking',
      'manageableMembers.length > 0',
      'ownFactionId && territories.length > 0',
    ],
  ],
  [
    'packages/db/drizzle/0048_item_product_images.sql',
    ['CREATE TABLE IF NOT EXISTS item_images', 'image_data bytea NOT NULL', '2097152', 'updated_by_user_id'],
  ],
  [
    'packages/db/src/schema/index.ts',
    ["const bytea = customType", "export const itemImages", "imageData: bytea('image_data').notNull()"],
  ],
  [
    'apps/web/src/app/api/items/[itemKey]/image/route.ts',
    ['getItemImageAsset', "etag: `\"${asset.sha256}\"`", "'x-content-type-options': 'nosniff'", 'status: 304'],
  ],
  [
    'apps/web/src/app/api/admin/items/[itemKey]/image/route.ts',
    ['requireAdminCapability', "'manage_config'", 'validateProductImageBytes', 'upsertItemImage', 'deleteItemImage'],
  ],
  [
    'apps/web/src/features/admin/admin-panel.tsx',
    ['handleProductImageUpload', 'handleProductImageDelete', 'Product images', 'accept="image/jpeg,image/png,image/webp"'],
  ],
  [
    'apps/web/src/lib/__tests__/product-images.test.ts',
    ['validateProductImageBytes', 'getProductImageUrl', 'normalizeProductImageAltText'],
  ],
];

for (const [relativePath, terms] of productionUxChecks) {
  requireTerms(relativePath, terms);
}

if (errors.length > 0) {
  console.error('MVP page validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `MVP page validation passed: ${requiredPages.length} routable player pages plus ${productionUxChecks.length} production UX/media contracts are present.`,
);
