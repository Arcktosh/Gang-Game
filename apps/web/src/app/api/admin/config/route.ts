import { listGameConfig, upsertGameConfig } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const configSchema = z.object({
  key: z.string().min(3).max(80),
  label: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  category: z.string().min(2).max(50).optional(),
  isPublic: z.boolean().optional(),
  value: z.record(z.string(), z.unknown()),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'view_admin');

    if (!admin.ok) {
      return admin.response;
    }

    return jsonOk({ config: await listGameConfig({ includePrivate: true }) });
  });
}

export async function PATCH(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_config');

    if (!admin.ok) {
      return admin.response;
    }

    const body = await parseJsonBody(request, configSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const entry = await upsertGameConfig({ adminUserId: admin.session.user.id, ...body.data });
      return jsonOk({ entry });
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not update config.', 400);
    }
  });
}
