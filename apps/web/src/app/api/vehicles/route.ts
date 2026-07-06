import { installVehicleUpgrade, listVehicleProfile } from '@drugdeal/db';
import { vehicleActionSchema, vehicleProfileQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:vehicles', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const query = vehicleProfileQuerySchema.safeParse({ characterId: request.nextUrl.searchParams.get('characterId') });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid vehicle query.', 400, query.error.flatten());
    }

    const profile = await listVehicleProfile({ userId: auth.userId, characterId: query.data.characterId });

    if (!profile) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    return jsonOk(profile);
  });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({ key: rateLimitKey(request, 'api:vehicles', auth.userId), windowSeconds: 60, maxRequests: 30 });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, vehicleActionSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await installVehicleUpgrade({
      userId: auth.userId,
      characterId: body.data.characterId,
      equipmentId: body.data.equipmentId,
      upgradeKey: body.data.upgradeKey,
    });

    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'cooldown_active' ? 429 : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data, { status: 201 });
  });
}
