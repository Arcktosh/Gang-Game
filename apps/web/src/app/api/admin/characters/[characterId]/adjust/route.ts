import { adjustCharacterBank, adjustCharacterCash } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const adjustSchema = z.object({
  wallet: z.enum(['cash', 'bank']),
  amount: z.coerce.number().int().min(-100000000).max(100000000),
  reason: z.string().min(5).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:admin:characters:id:adjust', session.user.id),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, adjustSchema);

    if (!body.ok) {
      return body.response;
    }

    const { characterId } = await params;

    return withIdempotency({
      request,
      userId: session.user.id,
      routeScope: 'admin:character-adjust',
      fingerprint: { characterId, ...body.data },
      handler: async () => {
        try {
          const character =
            body.data.wallet === 'cash'
              ? await adjustCharacterCash({
                  adminUserId: session.user.id,
                  characterId,
                  amount: body.data.amount,
                  reason: body.data.reason,
                })
              : await adjustCharacterBank({
                  adminUserId: session.user.id,
                  characterId,
                  amount: body.data.amount,
                  reason: body.data.reason,
                });

          return jsonOk({ character });
        } catch (caught) {
          return jsonError(
            'bad_request',
            caught instanceof Error ? caught.message : 'Could not adjust character.',
            400,
          );
        }
      },
    });
  });
}
