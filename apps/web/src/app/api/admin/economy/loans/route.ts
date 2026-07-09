import { listAdminLoanExposure } from '@drugdeal/db';
import { adminLoanExposureQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { requireAdminCapability } from '@/lib/admin-access';
import { jsonError, jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const admin = await requireAdminCapability(request, 'manage_economy');

    if (!admin.ok) {
      return admin.response;
    }

    const session = admin.session;
    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:admin:economy:loans', session.user.id),
      windowSeconds: 60,
      maxRequests: 60,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const query = adminLoanExposureQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get('status') ?? undefined,
      q: request.nextUrl.searchParams.get('q') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });

    if (!query.success) {
      return jsonError(
        'invalid_query',
        'Invalid admin loan exposure query.',
        400,
        query.error.flatten(),
      );
    }

    const result = await listAdminLoanExposure({
      status: query.data.status,
      query: query.data.q,
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return jsonOk(result);
  });
}
