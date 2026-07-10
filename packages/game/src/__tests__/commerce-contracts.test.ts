import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateContractCooldownSeconds,
  calculateContractEscrow,
  calculateContractPostingFee,
  calculateContractRisk,
  calculateShopListingLimit,
  calculateShopSale,
  canCompleteContract,
} from '../index';

test('shop sales normalize input and calculate platform fees', () => {
  assert.deepEqual(calculateShopSale({ quantity: 2.8, priceEach: 100.9, sellerReputation: 0 }), {
    quantity: 2,
    priceEach: 100,
    gross: 200,
    platformFee: 16,
    sellerPayout: 184,
    platformFeeRate: 0.08,
  });

  const veteranSale = calculateShopSale({ quantity: 10, priceEach: 100, sellerReputation: 2500 });
  assert.equal(veteranSale.platformFeeRate, 0.04);
  assert.equal(veteranSale.platformFee, 40);
  assert.equal(veteranSale.sellerPayout, 960);
});

test('shop listing limits scale from reputation', () => {
  assert.equal(calculateShopListingLimit(-50), 5);
  assert.equal(calculateShopListingLimit(0), 5);
  assert.equal(calculateShopListingLimit(100), 9);
});

test('contract economics normalize fees, escrow, cooldown, and risk', () => {
  assert.equal(calculateContractPostingFee(100), 10);
  assert.equal(calculateContractPostingFee(1000), 30);
  assert.equal(calculateContractEscrow(-50), 0);
  assert.equal(calculateContractEscrow(99.9), 99);
  assert.equal(calculateContractCooldownSeconds(5000), 60);
  assert.equal(calculateContractCooldownSeconds(1000), 30);
  assert.equal(calculateContractCooldownSeconds(999), 10);
  assert.equal(calculateContractRisk({ reward: 2500, quantity: 20, type: 'delivery' }), 6);
  assert.equal(calculateContractRisk({ reward: 100000, quantity: 999, type: 'bounty' }), 10);
});

test('contract completion gates location and required delivery inventory', () => {
  assert.deepEqual(
    canCompleteContract({ contractType: 'delivery', characterLocation: 'downtown', targetLocation: 'harbor' }),
    { ok: false, message: 'Travel to harbor to complete this contract.' },
  );

  assert.deepEqual(
    canCompleteContract({
      contractType: 'delivery',
      characterLocation: 'harbor',
      targetLocation: 'harbor',
      itemKey: 'product',
      requiredQuantity: 3,
      inventoryQuantity: 2,
    }),
    { ok: false, message: 'You need 3x product to complete this delivery.' },
  );

  assert.deepEqual(
    canCompleteContract({
      contractType: 'delivery',
      characterLocation: 'harbor',
      targetLocation: 'harbor',
      itemKey: 'product',
      requiredQuantity: 3,
      inventoryQuantity: 3,
    }),
    { ok: true },
  );
});

test('faction armory actions normalize quantity and gate withdrawals by rank', async () => {
  const { calculateFactionInventoryAction, canManageFactionArmory } = await import('../index');

  assert.equal(canManageFactionArmory('runner'), false);
  assert.equal(canManageFactionArmory('lieutenant'), true);
  assert.deepEqual(calculateFactionInventoryAction({ action: 'deposit', role: 'recruit', quantity: 2.8, availableQuantity: 5 }), {
    quantity: 2,
    cooldownSeconds: 20,
    contributionPoints: 2,
    hasPermission: true,
    canAttempt: true,
  });
  assert.deepEqual(calculateFactionInventoryAction({ action: 'withdraw', role: 'soldier', quantity: 2, availableQuantity: 5 }), {
    quantity: 2,
    cooldownSeconds: 45,
    contributionPoints: 0,
    hasPermission: false,
    canAttempt: false,
  });
  assert.equal(calculateFactionInventoryAction({ action: 'withdraw', role: 'captain', quantity: 6, availableQuantity: 5 }).canAttempt, false);
  assert.equal(calculateFactionInventoryAction({ action: 'withdraw', role: 'captain', quantity: 5, availableQuantity: 5 }).canAttempt, true);
});
