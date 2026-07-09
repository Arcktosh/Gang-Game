import { listCharacterLoans, repayCharacterLoan, requestCharacterLoan } from '@drugdeal/db';
import { loanActionSchema, loanCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:economy:loans', auth.userId),
      windowSeconds: 60,
      maxRequests: 60,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const query = loanCenterQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid loan query.', 400, query.error.flatten());
    }

    const result = await listCharacterLoans({ ...query.data, userId: auth.userId });

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

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:economy:loans:action', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, loanActionSchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'economy:loan',
      fingerprint: body.data,
      handler: async () => {
        const result =
          body.data.action === 'request'
            ? await requestCharacterLoan({
                userId: auth.userId,
                characterId: body.data.characterId,
                offerKey: body.data.offerKey,
              })
            : await repayCharacterLoan({
                userId: auth.userId,
                characterId: body.data.characterId,
                loanId: body.data.loanId,
                amount: body.data.amount,
              });

        if (!result.ok) {
          const status = result.code === 'not_found' ? 404 : result.code === 'conflict' ? 409 : 403;
          return jsonError(result.code, result.message, status);
        }

        return jsonOk(result.data, { status: 201 });
      },
    });
  });
}
