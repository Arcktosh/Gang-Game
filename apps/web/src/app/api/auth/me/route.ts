import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return jsonError('unauthorized', 'Login required.', 401);
    }

    return jsonOk({ user: session.user });
  });
}
