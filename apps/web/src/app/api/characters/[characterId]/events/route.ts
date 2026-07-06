import { listCharacterEvents } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, paginationMeta, parsePagination, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest, context: { params: Promise<{ characterId: string }> }) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const pagination = parsePagination(request);

    if (!pagination.ok) {
      return pagination.response;
    }

    const { characterId } = await context.params;
    const events = await listCharacterEvents(characterId, auth.userId, pagination.pagination.limit, pagination.pagination.offset);

    if (!events) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk({ events, pagination: paginationMeta({ ...pagination.pagination, count: events.length }) });
  });
}
