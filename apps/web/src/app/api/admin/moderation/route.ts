import { listModerationQueue } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'moderate_content');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const status = request.nextUrl.searchParams.get('status') ?? 'open';
    if (!['open', 'reviewed', 'dismissed', 'actioned'].includes(status)) {
      return jsonError('bad_request', 'Invalid moderation status.', 400);
    }

    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)));
    return jsonOk(await listModerationQueue({ status: status as 'open' | 'reviewed' | 'dismissed' | 'actioned', limit }));
  });
}
