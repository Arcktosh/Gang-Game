import { listAdminSessionAudit, type AdminSessionAuditSession } from '@drugdeal/db';
import { adminSessionAuditQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { csvResponse, toCsv } from '../csv';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'search_players');

    if (!admin.ok) {
      return admin.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:audit:sessions', admin.session.user.id), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = adminSessionAuditQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      ipAddress: request.nextUrl.searchParams.get('ipAddress') ?? undefined,
      days: request.nextUrl.searchParams.get('days') ?? undefined,
      format: request.nextUrl.searchParams.get('format') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid session audit query.', 400, query.error.flatten());
    }

    const result = await listAdminSessionAudit(query.data);

    if (query.data.format === 'csv') {
      const csv = toCsv(
        ['id', 'userId', 'email', 'displayName', 'ipAddress', 'userAgent', 'characterCount', 'lastSeenAt', 'expiresAt'],
        result.sessions.map((session: AdminSessionAuditSession) => [session.id, session.userId, session.email, session.displayName, session.ipAddress, session.userAgent, session.characterCount, session.lastSeenAt, session.expiresAt]),
      );
      return csvResponse('session-audit.csv', csv);
    }

    return jsonOk(result);
  });
}
