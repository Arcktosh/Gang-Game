import { resolveOperationalAnomaly } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const resolveSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']).optional().default('resolved'),
  note: z.string().trim().min(5).max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ anomalyId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:anomalies:id', admin.session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, resolveSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { anomalyId } = await params;
      const anomaly = await resolveOperationalAnomaly({ adminUserId: admin.session.user.id, anomalyId, status: body.data.status, note: body.data.note });
      return jsonOk({ anomaly });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not update anomaly.', 400);
    }
  });
}
