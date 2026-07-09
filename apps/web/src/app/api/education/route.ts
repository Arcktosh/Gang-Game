import { completeCourse, listCourses } from '@drugdeal/db';
import { completeCourseSchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, parseJsonBody, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function GET() {
  const courses = await listCourses();
  return jsonOk({ courses });
}

export async function POST(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:education', auth.userId),
      windowSeconds: 60,
      maxRequests: 30,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const body = await parseJsonBody(request, completeCourseSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await completeCourse({ ...body.data, userId: auth.userId });

    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'server_error'
            ? 500
            : result.code === 'cooldown_active'
              ? 429
              : 403;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk(result.data, { status: 201 });
  });
}
