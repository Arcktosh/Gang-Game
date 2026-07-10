import { listAdminEconomyAudit, type AdminEconomyAuditTransaction } from '@drugdeal/db';
import { adminEconomyAuditQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { csvResponse, toCsv } from '../csv';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:audit:economy', admin.session.user.id), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = adminEconomyAuditQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      type: request.nextUrl.searchParams.get('type') ?? undefined,
      minAmount: request.nextUrl.searchParams.get('minAmount') ?? undefined,
      maxAmount: request.nextUrl.searchParams.get('maxAmount') ?? undefined,
      days: request.nextUrl.searchParams.get('days') ?? undefined,
      format: request.nextUrl.searchParams.get('format') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid economy audit query.', 400, query.error.flatten());
    }

    const result = await listAdminEconomyAudit(query.data);

    if (query.data.format === 'csv') {
      const csv = toCsv(
        ['id', 'characterId', 'characterName', 'userEmail', 'type', 'amount', 'description', 'createdAt'],
        result.transactions.map((transaction: AdminEconomyAuditTransaction) => [transaction.id, transaction.characterId, transaction.characterName, transaction.userEmail, transaction.type, transaction.amount, transaction.description, transaction.createdAt]),
      );
      return csvResponse('economy-audit.csv', csv);
    }

    return jsonOk(result);
  });
}
