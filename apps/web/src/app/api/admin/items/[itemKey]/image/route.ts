import { createHash } from 'node:crypto';
import { deleteItemImage, upsertItemImage } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { requireAdminCapability } from '@/lib/admin-access';
import { withApiObservability } from '@/lib/observability';
import {
  isValidProductItemKey,
  MAX_PRODUCT_IMAGE_BYTES,
  normalizeProductImageAltText,
  validateProductImageBytes,
} from '@/lib/product-images';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_MULTIPART_REQUEST_BYTES = MAX_PRODUCT_IMAGE_BYTES + 256 * 1024;

async function authorizeImageMutation(request: NextRequest) {
  const admin = await requireAdminCapability(request, 'manage_config');

  if (!admin.ok) {
    return admin;
  }

  const limit = await assertRateLimit({
    key: rateLimitKey(request, 'api:admin:item-image', admin.session.user.id),
    windowSeconds: 60,
    maxRequests: 30,
  });

  if (!limit.ok) {
    return { ok: false as const, response: limit.response };
  }

  return admin;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemKey: string }> },
) {
  return withApiObservability(request, async () => {
    const admin = await authorizeImageMutation(request);

    if (!admin.ok) {
      return admin.response;
    }

    const { itemKey } = await params;

    if (!isValidProductItemKey(itemKey)) {
      return jsonError('bad_request', 'Invalid product key.', 400);
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0);

    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_REQUEST_BYTES) {
      return jsonError('bad_request', 'Product image upload is too large.', 413, {
        maxBytes: MAX_PRODUCT_IMAGE_BYTES,
      });
    }

    const formData = await request.formData().catch(() => null);
    const image = formData?.get('image');

    if (!(image instanceof File) || image.size === 0) {
      return jsonError('bad_request', 'Select a product image to upload.', 400);
    }

    if (image.size > MAX_PRODUCT_IMAGE_BYTES) {
      return jsonError('bad_request', 'Product image upload is too large.', 413, {
        maxBytes: MAX_PRODUCT_IMAGE_BYTES,
      });
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    const validation = validateProductImageBytes(image.type.toLowerCase(), bytes);

    if (!validation.ok) {
      return jsonError('bad_request', validation.message, 400);
    }

    const result = await upsertItemImage({
      itemKey,
      contentType: validation.contentType,
      byteSize: bytes.byteLength,
      altText: normalizeProductImageAltText(formData?.get('altText'), itemKey),
      imageData: bytes,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      updatedByUserId: admin.session.user.id,
    });

    if (!result) {
      return jsonError('not_found', 'Product not found.', 404);
    }

    return jsonOk({ image: result }, { status: 201 });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemKey: string }> },
) {
  return withApiObservability(request, async () => {
    const admin = await authorizeImageMutation(request);

    if (!admin.ok) {
      return admin.response;
    }

    const { itemKey } = await params;

    if (!isValidProductItemKey(itemKey)) {
      return jsonError('bad_request', 'Invalid product key.', 400);
    }

    const deleted = await deleteItemImage(itemKey);

    if (!deleted) {
      return jsonError('not_found', 'Product image not found.', 404);
    }

    return jsonOk({ deleted });
  });
}
