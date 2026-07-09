import { reviewEnforcementAppeal } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const reviewAppealSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  note: z.string().trim().min(5).max(500),
  liftEnforcement: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appealId: string }> },
) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'enforce_players');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:admin:appeals:id:review', session.user.id),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, reviewAppealSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { appealId } = await params;
      const result = await reviewEnforcementAppeal({
        adminUserId: session.user.id,
        appealId,
        ...body.data,
      });
      return jsonOk(result);
    } catch (caught) {
      return jsonError(
        'bad_request',
        caught instanceof Error ? caught.message : 'Could not review appeal.',
        400,
      );
    }
  });
}
