import { getCharacterProgressionProfile } from '@drugdeal/db';
import { profileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const query = profileQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId'),
    });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid profile query.', 400, query.error.flatten());
    }

    const profile = await getCharacterProgressionProfile({
      userId: auth.userId,
      characterId: query.data.characterId,
    });

    if (!profile) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(profile);
  });
}
