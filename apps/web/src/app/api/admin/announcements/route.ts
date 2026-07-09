import { createAnnouncement, listAdminAnnouncements } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const announcementSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(2000),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
  endsAt: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'view_admin');

    if (!admin.ok) {
      return admin.response;
    }

    return jsonOk({ announcements: await listAdminAnnouncements() });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_announcements');

    if (!admin.ok) {
      return admin.response;
    }

    const body = await parseJsonBody(request, announcementSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const announcement = await createAnnouncement({
        adminUserId: admin.session.user.id,
        ...body.data,
      });
      return jsonOk({ announcement });
    } catch (caught) {
      return jsonError(
        'bad_request',
        caught instanceof Error ? caught.message : 'Could not create announcement.',
        400,
      );
    }
  });
}
