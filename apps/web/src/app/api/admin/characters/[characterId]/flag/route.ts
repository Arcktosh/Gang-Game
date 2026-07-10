import { addCharacterFlag } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const flagSchema = z.object({
  flagType: z.enum(['watchlist', 'suspected_alt', 'market_abuse', 'chat_abuse', 'botting', 'exploit_review', 'suspended']),
  reason: z.string().min(5).max(500),
  severity: z.coerce.number().int().min(1).max(5).default(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ characterId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'moderate_content');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:characters:id:flag', session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, flagSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { characterId } = await params;
      const flag = await addCharacterFlag({ adminUserId: session.user.id, characterId, ...body.data });
      return jsonOk({ flag });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not flag character.', 400);
    }
  });
}
