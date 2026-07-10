#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

export const routeContracts = [
  {
    name: 'auth-register',
    group: 'auth',
    path: 'apps/web/src/app/api/auth/register/route.ts',
    requires: ['POST', 'withApiObservability', 'assertRateLimit', 'parseJsonBody', 'registerSchema', 'hashPassword', 'createSessionResponse'],
  },
  {
    name: 'auth-login',
    group: 'auth',
    path: 'apps/web/src/app/api/auth/login/route.ts',
    requires: ['POST', 'withApiObservability', 'assertRateLimit', 'parseJsonBody', 'loginSchema', 'verifyPassword', 'createSessionResponse'],
  },
  {
    name: 'jobs-work-action',
    group: 'jobs',
    path: 'apps/web/src/app/api/jobs/route.ts',
    requires: ['GET', 'POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'startJobSchema', 'withIdempotency', 'completeJobCharacterUpdate'],
  },
  {
    name: 'crimes-attempt-action',
    group: 'crimes',
    path: 'apps/web/src/app/api/crimes/route.ts',
    requires: ['GET', 'POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'commitCrimeSchema', 'withIdempotency', 'resolveCrimeCharacterUpdate'],
  },
  {
    name: 'market-buy-sell',
    group: 'market',
    path: 'apps/web/src/app/api/market/route.ts',
    requires: ['GET', 'POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'marketActionSchema', 'withIdempotency', 'buyMarketItem', 'sellMarketItem'],
  },
  {
    name: 'shop-listing-management',
    group: 'shops',
    path: 'apps/web/src/app/api/shops/listings/route.ts',
    requires: ['POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'createShopListingSchema', 'withIdempotency', 'createShopListing'],
  },
  {
    name: 'shop-purchase',
    group: 'shops',
    path: 'apps/web/src/app/api/shops/purchase/route.ts',
    requires: ['POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'purchaseShopListingSchema', 'withIdempotency', 'purchaseShopListing'],
  },
  {
    name: 'contract-create',
    group: 'contracts',
    path: 'apps/web/src/app/api/contracts/route.ts',
    requires: ['GET', 'POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'createContractSchema', 'withIdempotency', 'createContract'],
  },
  {
    name: 'contract-complete',
    group: 'contracts',
    path: 'apps/web/src/app/api/contracts/[contractId]/complete/route.ts',
    requires: ['POST', 'withApiObservability', 'requireRequestUserId', 'assertRateLimit', 'parseJsonBody', 'contractCharacterActionSchema', 'withIdempotency', 'completeContract'],
  },
  {
    name: 'admin-search',
    group: 'admin',
    path: 'apps/web/src/app/api/admin/search/route.ts',
    requires: ['GET', 'withApiObservability', 'requireAdminCapability', 'search_players', 'assertRateLimit', 'adminSearchQuerySchema', 'invalid_query'],
  },
  {
    name: 'admin-balance-adjust',
    group: 'admin',
    path: 'apps/web/src/app/api/admin/characters/[characterId]/adjust/route.ts',
    requires: ['POST', 'withApiObservability', 'requireAdminCapability', 'manage_economy', 'assertRateLimit', 'parseJsonBody', 'adjustSchema', 'withIdempotency', 'adjustCharacterCash', 'adjustCharacterBank'],
  },
  {
    name: 'admin-enforcement-lift',
    group: 'admin',
    path: 'apps/web/src/app/api/admin/enforcements/[enforcementId]/lift/route.ts',
    requires: ['POST', 'withApiObservability', 'requireAdminCapability', 'enforce_players', 'assertRateLimit', 'parseJsonBody', 'liftSchema', 'withIdempotency', 'liftCharacterEnforcement'],
  },
];

export function auditRouteContracts({ rootDir = root } = {}) {
  const failures = [];

  for (const contract of routeContracts) {
    const fullPath = join(rootDir, contract.path);

    if (!existsSync(fullPath)) {
      failures.push(`${contract.name}: missing route file ${contract.path}`);
      continue;
    }

    const source = readFileSync(fullPath, 'utf8');

    for (const required of contract.requires) {
      if (!source.includes(required)) {
        failures.push(`${contract.name}: ${contract.path} is missing required contract token ${required}`);
      }
    }
  }

  const representativeGroups = new Set(routeContracts.map((contract) => contract.group));
  const requiredGroups = ['auth', 'jobs', 'crimes', 'market', 'shops', 'contracts', 'admin'];

  for (const group of requiredGroups) {
    if (!representativeGroups.has(group)) {
      failures.push(`missing representative route contract group: ${group}`);
    }
  }

  return { failures, count: routeContracts.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = auditRouteContracts();

  if (result.failures.length > 0) {
    console.error('Route contract audit failed:');
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Route contract audit passed: ${result.count} representative route contracts checked.`);
}
