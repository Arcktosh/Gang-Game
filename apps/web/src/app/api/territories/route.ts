import { NextRequest } from 'next/server';
import { listTerritories } from '@drugdeal/db';
import { jsonOk } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const territories = await listTerritories();
    return jsonOk({ territories });
  });
}
