#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const adminRouteRoot = path.join(repoRoot, 'apps/web/src/app/api/admin');
const adminPagePath = path.join(repoRoot, 'apps/web/src/app/(admin)/admin/page.tsx');
const authQueryPath = path.join(repoRoot, 'packages/db/src/queries/auth.ts');
const schemaPath = path.join(repoRoot, 'packages/db/src/schema/index.ts');
const migrationPath = path.join(repoRoot, 'packages/db/drizzle/0029_admin_roles.sql');
const packageJsonPath = path.join(repoRoot, 'packages/db/package.json');

const validCapabilities = new Set([
  'view_admin',
  'search_players',
  'manage_config',
  'manage_announcements',
  'moderate_content',
  'enforce_players',
  'manage_economy',
]);

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walkRouteFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRouteFiles(fullPath, results);
    } else if (entry.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results.sort();
}

const errors = [];
const routeFiles = walkRouteFiles(adminRouteRoot);
const capabilityUsage = new Map();

for (const filePath of routeFiles) {
  const relative = path.relative(repoRoot, filePath);
  const source = read(filePath);

  if (!source.includes('requireAdminCapability')) {
    errors.push(`${relative} does not use requireAdminCapability.`);
  }

  if (source.includes('getSessionFromRequest')) {
    errors.push(`${relative} still imports or calls getSessionFromRequest directly instead of capability auth.`);
  }

  if (source.includes('session.user.isAdmin')) {
    errors.push(`${relative} still checks session.user.isAdmin directly.`);
  }

  const matches = [...source.matchAll(/requireAdminCapability\(request, '([a-z_]+)'\)/g)].map((match) => match[1]);
  if (matches.length === 0) {
    errors.push(`${relative} does not declare a literal admin capability.`);
  }

  for (const capability of matches) {
    if (!validCapabilities.has(capability)) {
      errors.push(`${relative} uses unknown admin capability ${capability}.`);
    }
    capabilityUsage.set(capability, (capabilityUsage.get(capability) ?? 0) + 1);
  }
}

const requiredCapabilities = ['view_admin', 'search_players', 'manage_config', 'manage_announcements', 'moderate_content', 'enforce_players', 'manage_economy'];
for (const capability of requiredCapabilities) {
  if (!capabilityUsage.has(capability)) {
    errors.push(`No admin route declares required capability ${capability}.`);
  }
}

const adminPage = read(adminPagePath);
if (!adminPage.includes('hasAdminCapability')) {
  errors.push('Admin page does not gate access through hasAdminCapability.');
}
if (adminPage.includes('session.user.isAdmin')) {
  errors.push('Admin page still checks session.user.isAdmin directly.');
}

const authQuery = read(authQueryPath);
if (!authQuery.includes('adminRole')) {
  errors.push('Auth session query does not expose adminRole.');
}

const schema = read(schemaPath);
if (!schema.includes("pgEnum('admin_role'") || !schema.includes("adminRole: adminRole('admin_role')")) {
  errors.push('Database schema does not declare the admin_role enum and users.adminRole column.');
}

const migration = read(migrationPath);
if (!migration.includes('CREATE TYPE admin_role') || !migration.includes('ALTER TABLE users') || !migration.includes('UPDATE users')) {
  errors.push('Admin-role migration is missing enum creation, users column, or legacy is_admin backfill.');
}

const packageJson = JSON.parse(read(packageJsonPath));
if (!String(packageJson.scripts?.['db:apply:admin-roles'] ?? '').includes('0029_admin_roles.sql')) {
  errors.push('packages/db/package.json is missing db:apply:admin-roles for 0029_admin_roles.sql.');
}

const result = {
  adminRoutes: routeFiles.length,
  capabilityUsage: Object.fromEntries([...capabilityUsage.entries()].sort()),
  errors,
  ok: errors.length === 0,
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
