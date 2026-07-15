export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_ALT_TEXT_LENGTH = 160;
export const PRODUCT_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProductImageContentType = (typeof PRODUCT_IMAGE_CONTENT_TYPES)[number];

const ITEM_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export function isValidProductItemKey(value: string) {
  return ITEM_KEY_PATTERN.test(value);
}

export function normalizeProductImageAltText(value: unknown, fallbackName: string) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PRODUCT_IMAGE_ALT_TEXT_LENGTH);

  return normalized || `${fallbackName} product image`;
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function validateProductImageBytes(contentType: string, bytes: Uint8Array) {
  if (!PRODUCT_IMAGE_CONTENT_TYPES.includes(contentType as ProductImageContentType)) {
    return {
      ok: false as const,
      message: 'Product images must be JPEG, PNG, or WebP files.',
    };
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false as const,
      message: `Product images must be between 1 byte and ${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  const hasValidSignature =
    (contentType === 'image/png' && startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (contentType === 'image/jpeg' && startsWithBytes(bytes, [0xff, 0xd8, 0xff])) ||
    (contentType === 'image/webp' &&
      startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      startsWithBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8));

  if (!hasValidSignature) {
    return {
      ok: false as const,
      message: 'The uploaded file contents do not match the declared image type.',
    };
  }

  return {
    ok: true as const,
    contentType: contentType as ProductImageContentType,
  };
}

export function getProductImageUrl(
  itemKey: string,
  imageUpdatedAt?: string | Date | null,
) {
  const base = `/api/items/${encodeURIComponent(itemKey)}/image`;

  if (!imageUpdatedAt) {
    return base;
  }

  const version = imageUpdatedAt instanceof Date
    ? imageUpdatedAt.getTime()
    : Date.parse(imageUpdatedAt);

  return Number.isFinite(version) ? `${base}?v=${version}` : base;
}
