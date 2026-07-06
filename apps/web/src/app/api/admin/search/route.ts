import { searchAdminCharacters } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { requireAdminCapability } from '@/lib/admin-access';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const adminSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'search_players');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:search', session.user.id), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = adminSearchQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid admin search query.', 400, query.error.flatten());
    }

    try {
      return jsonOk(await searchAdminCharacters({ query: query.data.q, limit: query.data.limit }));
    } catch (error) {
      return jsonError('bad_request', error instanceof Error ? error.message : 'Unable to search characters.', 400);
    }
  });
}
