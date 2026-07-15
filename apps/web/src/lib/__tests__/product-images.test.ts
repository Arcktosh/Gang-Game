import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getProductImageUrl,
  isValidProductItemKey,
  MAX_PRODUCT_IMAGE_ALT_TEXT_LENGTH,
  normalizeProductImageAltText,
  validateProductImageBytes,
} from '../product-images';

test('product image validation accepts supported file signatures', () => {
  assert.equal(validateProductImageBytes('image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).ok, true);
  assert.equal(validateProductImageBytes('image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])).ok, true);
  assert.equal(validateProductImageBytes('image/webp', Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])).ok, true);
});

test('product image validation rejects mismatched or unsupported content', () => {
  assert.equal(validateProductImageBytes('image/png', Uint8Array.from([0xff, 0xd8, 0xff])).ok, false);
  assert.equal(validateProductImageBytes('image/svg+xml', Uint8Array.from([0x3c, 0x73, 0x76, 0x67])).ok, false);
});

test('product image helpers constrain keys, alt text, and cache-busting URLs', () => {
  assert.equal(isValidProductItemKey('starter-medkit'), true);
  assert.equal(isValidProductItemKey('../secrets'), false);
  assert.equal(normalizeProductImageAltText('', 'Medkit'), 'Medkit product image');
  assert.equal(normalizeProductImageAltText('x'.repeat(500), 'Medkit').length, MAX_PRODUCT_IMAGE_ALT_TEXT_LENGTH);
  assert.equal(getProductImageUrl('starter medkit', new Date('2026-07-15T00:00:00.000Z')), '/api/items/starter%20medkit/image?v=1784073600000');
});
