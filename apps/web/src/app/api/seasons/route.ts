import { getSeasonProfile } from '@drugdeal/db';
import { seasonProfileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const query = seasonProfileQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
    });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid season profile query.', 400, query.error.flatten());
    }

    const result = await getSeasonProfile({
      userId: auth.userId,
      characterId: query.data.characterId,
    });

    if (!result) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(result);
  });
}
