import { listAdminAudit } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, paginationMeta, parsePagination } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'view_admin');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;

    const pagination = parsePagination(request, 'admin');

    if (!pagination.ok) {
      return pagination.response;
    }

    const audit = await listAdminAudit(pagination.pagination.limit, pagination.pagination.offset);
    return jsonOk({
      ...audit,
      pagination: paginationMeta({ ...pagination.pagination, count: audit.events.length }),
    });
  });
}
