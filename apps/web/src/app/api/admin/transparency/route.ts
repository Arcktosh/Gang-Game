import { getModerationTransparencySummary } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { requireAdminCapability } from '@/lib/admin-access';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'view_admin');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
    return jsonOk(await getModerationTransparencySummary({ days }));
  });
}
