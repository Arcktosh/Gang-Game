import { resolveCharacterFlag } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const resolveSchema = z.object({ reason: z.string().max(500).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ flagId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'moderate_content');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:flags:id:resolve', session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, resolveSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { flagId } = await params;
      const flag = await resolveCharacterFlag({ adminUserId: session.user.id, flagId, reason: body.data.reason });
      return jsonOk({ flag });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not resolve flag.', 400);
    }
  });
}
