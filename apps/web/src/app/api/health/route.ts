import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@drugdeal/db';
import { jsonError, jsonOk } from '@/lib/api';
import { getEnvironmentStatus } from '@/lib/env';
import { requestMetadata, runtimeDiagnostics, withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async (context) => {
    const environment = getEnvironmentStatus();
    const runtime = runtimeDiagnostics();

    if (!environment.ok) {
      return jsonError(
        'server_error',
        'Server environment is not valid.',
        500,
        environment.issues,
        requestMetadata(context),
      );
    }

    await db.execute(sql`select 1`);
    return jsonOk(
      {
        status: 'ok',
        service: 'web-api',
        environment,
        runtime,
      },
      undefined,
      requestMetadata(context),
    );
  });
}
