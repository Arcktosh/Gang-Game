import { commentOnNewspaperArticle, listNewspaperCenter, reactToNewspaperArticle, reportNewspaperArticle, submitNewspaperArticle } from '@drugdeal/db';
import { newspaperActionSchema, submitNewspaperArticleSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, paginationMeta, parsePagination, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const pagination = parsePagination(request);

    if (!pagination.ok) {
      return pagination.response;
    }

    const location = request.nextUrl.searchParams.get('location');
    const characterId = request.nextUrl.searchParams.get('characterId') ?? undefined;
    const articles = await listNewspaperCenter({ location, characterId, limit: pagination.pagination.limit, offset: pagination.pagination.offset });
    return jsonOk({ articles, pagination: paginationMeta({ ...pagination.pagination, count: articles.length }) });
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'newspaper:mutate', auth.userId), windowSeconds: 60, maxRequests: 20 });

    if (!limit.ok) {
      return limit.response;
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = rawBody && typeof rawBody === 'object' && 'action' in rawBody
      ? newspaperActionSchema.safeParse(rawBody)
      : submitNewspaperArticleSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonError('bad_request', parsed.error.issues[0]?.message ?? 'Invalid request body.', 400);
    }

    const body = 'action' in parsed.data ? parsed.data : { action: 'submit_article' as const, ...parsed.data };
    const result = await dispatchNewspaperAction(auth.userId, body);

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result, { status: body.action === 'submit_article' || body.action === 'comment' ? 201 : 200 });
  });
}

type NewspaperAction = ReturnType<typeof newspaperActionSchema.parse>;

async function dispatchNewspaperAction(userId: string, body: NewspaperAction) {
  switch (body.action) {
    case 'submit_article':
      return submitNewspaperArticle({ ...body, userId });
    case 'comment':
      return commentOnNewspaperArticle({ ...body, userId });
    case 'react':
      return reactToNewspaperArticle({ ...body, userId });
    case 'report':
      return reportNewspaperArticle({ ...body, userId });
  }
}
