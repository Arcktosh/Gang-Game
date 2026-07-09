import { cancelBounty } from '@drugdeal/db';
import { cancelBountySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bountyId: string }> },
) {
  return withApiObservability(request, async () => {
    const { bountyId } = await params;
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:bounties:id:cancel', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, cancelBountySchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await cancelBounty({ ...body.data, bountyId, userId: auth.userId });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result);
  });
}
