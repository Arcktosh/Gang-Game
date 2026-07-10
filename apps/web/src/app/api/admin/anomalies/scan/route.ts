import { runOperationalAnomalyScan } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const scanSchema = z.object({
  scanWindowHours: z.coerce.number().int().min(1).max(720).optional(),
  highNetWorth: z.coerce.number().int().min(1).max(100_000_000).optional(),
  transactionVolume: z.coerce.number().int().min(1).max(100_000_000).optional(),
  transactionCount: z.coerce.number().int().min(1).max(10_000).optional(),
  inventoryQuantity: z.coerce.number().int().min(1).max(10_000_000).optional(),
  sessionIpCount: z.coerce.number().int().min(1).max(1_000).optional(),
}).optional().default({});

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:anomalies:scan', admin.session.user.id), windowSeconds: 300, maxRequests: 10 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, scanSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const result = await runOperationalAnomalyScan({ thresholds: body.data });
      return jsonOk({ result });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not run anomaly scan.', 400);
    }
  });
}
