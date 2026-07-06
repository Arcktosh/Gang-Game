import { listActiveProductCatalog } from '@drugdeal/db';
import { NextRequest } from 'next/server';
import { withApiObservability } from '@/lib/observability';
import { jsonOk } from '@/lib/api';

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const products = await listActiveProductCatalog();
    return jsonOk({ products });
  });
}
