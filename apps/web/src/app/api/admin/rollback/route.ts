import { applyAdminActionRollback, listAdminRollbackCandidates } from '@drugdeal/db';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api';
import { withIdempotency } from '@/lib/idempotency';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

const rollbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
});

const rollbackBodySchema = z.object({
  actionLogId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
});

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:rollback:get', admin.session.user.id), windowSeconds: 60, maxRequests: 60 });

    if (!limit.ok) {
      return limit.response;
    }

    const parsed = rollbackQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

    if (!parsed.success) {
      return jsonError('invalid_query', 'Invalid rollback query.', 400, parsed.error.flatten());
    }

    const result = await listAdminRollbackCandidates(parsed.data);
    return jsonOk(result);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;
    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:admin:rollback:post', session.user.id), windowSeconds: 60, maxRequests: 20 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, rollbackBodySchema);

    if (!body.ok) {
      return body.response;
    }

    return withIdempotency({
      request,
      userId: session.user.id,
      routeScope: 'admin:rollback',
      fingerprint: body.data,
      handler: async () => {
        try {
          const rollback = await applyAdminActionRollback({
            adminUserId: session.user.id,
            actionLogId: body.data.actionLogId,
            reason: body.data.reason,
          });

          return jsonOk({ rollback });
        } catch (caught) {
          return jsonError('bad_request', caught instanceof Error ? caught.message : 'Could not apply rollback.', 400);
        }
      },
    });
  });
}
