import { listNotificationCenter, runNotificationAction } from '@drugdeal/db';
import { notificationActionSchema, notificationCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import {
  jsonError,
  jsonOk,
  paginationMeta,
  parseJsonBody,
  parsePagination,
  requireRequestUserId,
} from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:notifications', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const pagination = parsePagination(request);

    if (!pagination.ok) {
      return pagination.response;
    }

    const query = notificationCenterQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
      category: request.nextUrl.searchParams.get('category') ?? undefined,
      priority: request.nextUrl.searchParams.get('priority') ?? undefined,
      unreadOnly: request.nextUrl.searchParams.get('unreadOnly') ?? undefined,
    });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid notification query.', 400, query.error.flatten());
    }

    const center = await listNotificationCenter({
      userId: auth.userId,
      characterId: query.data.characterId,
      category: query.data.category,
      priority: query.data.priority,
      unreadOnly: query.data.unreadOnly,
      limit: pagination.pagination.limit,
      offset: pagination.pagination.offset,
    });

    if (!center) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk({
      ...center,
      pagination: paginationMeta({ ...pagination.pagination, count: center.recent.length }),
    });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:notifications', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, notificationActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await runNotificationAction({ userId: auth.userId, ...body.data });

    if (!result.ok) {
      return jsonError(result.code, result.message, 404);
    }

    return jsonOk(result.data);
  });
}
