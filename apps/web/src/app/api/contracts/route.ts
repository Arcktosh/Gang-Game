import { createContract, listContracts } from '@drugdeal/db';
import { contractQuerySchema, createContractSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { requireFeatureEnabled } from '@/lib/feature-flags';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:contracts', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = contractQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') ?? undefined });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid contract query.', 400, query.error.flatten());
    }

    const result = await listContracts({ userId: auth.userId, characterId: query.data.characterId });

    if (!result) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(result);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:contracts', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const feature = await requireFeatureEnabled('feature.contracts');

    if (!feature.ok) {
      return feature.response;
    }

    const body = await parseJsonBody(request, createContractSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'contracts:create',
      fingerprint: body.data,
      handler: async () => {
        const result = await createContract({ ...body.data, userId: auth.userId });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
