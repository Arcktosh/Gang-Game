import { listAdminInventoryAudit, type AdminInventoryAuditItem } from '@drugdeal/db';
import { adminInventoryAuditQuerySchema } from '@drugdeal/validators';
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

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:audit:inventory', admin.session.user.id), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = adminInventoryAuditQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      itemKey: request.nextUrl.searchParams.get('itemKey') ?? undefined,
      minQuantity: request.nextUrl.searchParams.get('minQuantity') ?? undefined,
      maxQuantity: request.nextUrl.searchParams.get('maxQuantity') ?? undefined,
      format: request.nextUrl.searchParams.get('format') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid inventory audit query.', 400, query.error.flatten());
    }

    const result = await listAdminInventoryAudit(query.data);

    if (query.data.format === 'csv') {
      const csv = toCsv(
        ['id', 'characterId', 'characterName', 'userEmail', 'itemKey', 'itemName', 'quantity', 'estimatedValue', 'updatedAt'],
        result.items.map((item: AdminInventoryAuditItem) => [item.id, item.characterId, item.characterName, item.userEmail, item.itemKey, item.itemName, item.quantity, item.estimatedValue, item.updatedAt]),
      );
      return csvResponse('inventory-audit.csv', csv);
    }

    return jsonOk(result);
  });
}
