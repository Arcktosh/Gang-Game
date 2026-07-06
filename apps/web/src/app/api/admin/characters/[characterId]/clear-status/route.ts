import { clearCharacterStatus } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const clearStatusSchema = z.object({ reason: z.string().min(5).max(500) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ characterId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'enforce_players');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:characters:id:clear-status', session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, clearStatusSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { characterId } = await params;
      const character = await clearCharacterStatus({ adminUserId: session.user.id, characterId, reason: body.data.reason });
      return jsonOk({ character });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not clear character status.', 400);
    }
  });
}
