import { NextRequest } from 'next/server';
import { listActiveAnnouncements } from '@drugdeal/db';
import { jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    return jsonOk({ announcements: await listActiveAnnouncements() });
  });
}
