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
