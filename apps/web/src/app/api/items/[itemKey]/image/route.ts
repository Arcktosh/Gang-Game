import { getItemImageAsset } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { isValidProductItemKey } from '@/lib/product-images';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function imageHeaders(asset: { contentType: string; byteSize: number; sha256: string }) {
  return {
    'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    'content-length': String(asset.byteSize),
    'content-type': asset.contentType,
    'cross-origin-resource-policy': 'same-origin',
    etag: `"${asset.sha256}"`,
    'x-content-type-options': 'nosniff',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemKey: string }> },
) {
  return withApiObservability(request, async () => {
    const { itemKey } = await params;

    if (!isValidProductItemKey(itemKey)) {
      return jsonError('bad_request', 'Invalid product key.', 400);
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:item-image'),
      windowSeconds: 60,
      maxRequests: 240,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const asset = await getItemImageAsset(itemKey);

    if (!asset) {
      return jsonError('not_found', 'Product image not found.', 404);
    }

    const headers = imageHeaders(asset);
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch?.split(',').map((value) => value.trim()).includes(headers.etag)) {
      return new Response(null, { status: 304, headers });
    }

    const body = Uint8Array.from(asset.imageData).buffer;
    return new Response(body, { status: 200, headers });
  });
}
