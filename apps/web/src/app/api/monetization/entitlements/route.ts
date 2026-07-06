import { listUserEntitlements } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { withApiObservability } from '@/lib/observability';
import { jsonOk, requireRequestUserId } from '@/lib/api';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const entitlements = await listUserEntitlements(auth.userId);
    return jsonOk({ entitlements });
  });
}
