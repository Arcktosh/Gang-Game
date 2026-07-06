import { applyCharacterEnforcement } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const enforcementSchema = z.object({
  actionType: z.enum(['warning', 'social_mute', 'shop_restriction', 'temporary_suspension', 'cash_penalty']),
  reason: z.string().trim().min(5).max(500),
  severity: z.coerce.number().int().min(1).max(5).default(1),
  durationHours: z.coerce.number().int().min(1).max(720).optional(),
  cashPenalty: z.coerce.number().int().min(0).max(100000000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ characterId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'enforce_players');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:characters:id:enforce', session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, enforcementSchema);

    if (!body.ok) {
      return body.response;
    }

    const { characterId } = await params;

    return withIdempotency({
      request,
      userId: session.user.id,
      routeScope: 'admin:character-enforce',
      fingerprint: { characterId, ...body.data },
      handler: async () => {
        try {
          const result = await applyCharacterEnforcement({ adminUserId: session.user.id, characterId, ...body.data });
          return jsonOk(result, { status: 201 });
        } catch (caught) {
          return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not apply enforcement.', 400);
        }
      },
    });
  });
}
