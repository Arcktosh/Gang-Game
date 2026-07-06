import { resolveModerationReport } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const resolveReportSchema = z.object({
  kind: z.enum(['message', 'article']),
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
  note: z.string().min(5).max(500).optional(),
  hideArticle: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'moderate_content');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:moderation:reports:id', session.user.id), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, resolveReportSchema);

    if (!body.ok) {
      return body.response;
    }

    try {
      const { reportId } = await params;
      const result = await resolveModerationReport({ adminUserId: session.user.id, reportId, ...body.data });
      return jsonOk(result);
    } catch (caught) {
      return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not resolve report.', 400);
    }
  });
}
