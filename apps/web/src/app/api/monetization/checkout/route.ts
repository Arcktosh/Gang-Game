import { db, productCatalog } from '@drugdeal/db';
import { checkoutIntentSchema } from '@drugdeal/validators';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { createCheckoutIntent } from '@/lib/checkout';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'monetization:checkout', auth.userId),
      windowSeconds: 60,
      maxRequests: 10,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, checkoutIntentSchema);

    if (!body.ok) {
      return body.response;
    }

    const product = await db.query.productCatalog.findFirst({
      where: eq(productCatalog.key, body.data.productKey),
    });

    if (!product || !product.isActive) {
      return jsonError('not_found', 'Product not found.', 404);
    }

    const checkout = await createCheckoutIntent({
      userId: auth.userId,
      productKey: product.key,
      characterId: body.data.characterId,
    });

    return jsonOk({ product, checkout }, { status: checkout.status === 'created' ? 201 : 200 });
  });
}
