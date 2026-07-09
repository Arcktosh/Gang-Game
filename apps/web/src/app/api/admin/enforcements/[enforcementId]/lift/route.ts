import { liftCharacterEnforcement } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const liftSchema = z.object({ reason: z.string().trim().min(5).max(500) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ enforcementId: string }> },
) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'enforce_players');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:admin:enforcements:id:lift', session.user.id),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, liftSchema);

    if (!body.ok) {
      return body.response;
    }

    const { enforcementId } = await params;

    return withIdempotency({
      request,
      userId: session.user.id,
      routeScope: 'admin:enforcements:lift',
      fingerprint: { enforcementId, ...body.data },
      handler: async () => {
        try {
          const result = await liftCharacterEnforcement({
            adminUserId: session.user.id,
            enforcementId,
            reason: body.data.reason,
          });
          return jsonOk(result);
        } catch (caught) {
          return jsonError(
            'bad_request',
            caught instanceof Error ? caught.message : 'Could not lift enforcement.',
            400,
          );
        }
      },
    });
  });
}
