import { db, runJobAction } from '@drugdeal/db';
import { startJobSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET() {
  const jobs = await db.query.jobDefinitions.findMany();
  return jsonOk({ jobs });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);
    if (!auth.ok) return auth.response;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'actions:job', auth.userId), windowSeconds: 60, maxRequests: 30 });
    if (!limit.ok) return limit.response;

    const body = await parseJsonBody(request, startJobSchema);
    if (!body.ok) return body.response;

    return withIdempotency({
      request,
      userId: auth.userId,
      routeScope: 'actions:job',
      fingerprint: body.data,
      handler: async () => {
        const result = await runJobAction({ userId: auth.userId, ...body.data });
        if (!result.ok) return jsonError(result.code, result.message, result.status);
        return jsonOk(result, { status: 201 });
      },
    });
  });
}
