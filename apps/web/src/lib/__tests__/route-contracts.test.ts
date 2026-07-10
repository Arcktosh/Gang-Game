import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

type RouteContract = {
  name: string;
  group: string;
  path: string;
  requires: string[];
};

const repoRoot = join(process.cwd(), '..', '..');

const routeContracts: RouteContract[] = [
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

test('representative route contracts cover the required MVP groups', () => {
  const groups = new Set(routeContracts.map((contract) => contract.group));

  for (const group of ['auth', 'jobs', 'crimes', 'market', 'shops', 'contracts', 'admin']) {
    assert.equal(groups.has(group), true, `expected representative route coverage for ${group}`);
  }
});

test('representative route contracts keep auth, validation, rate-limit, idempotency, and admin controls wired', () => {
  for (const contract of routeContracts) {
    const path = join(repoRoot, contract.path);
    assert.equal(existsSync(path), true, `${contract.name} route file should exist`);

    const source = readFileSync(path, 'utf8');

    for (const token of contract.requires) {
      assert.equal(source.includes(token), true, `${contract.name} should include ${token}`);
    }
  }
});
