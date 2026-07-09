import { listCharacterBankStatement } from '@drugdeal/db';
import { bankHistoryQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function bankStatementCsv(
  statement: NonNullable<Awaited<ReturnType<typeof listCharacterBankStatement>>>,
) {
  const rows = [
    ['createdAt', 'action', 'amount', 'description', 'cashAfter', 'bankAfter'],
    ...statement.transactions.map((transaction) => [
      transaction.createdAt instanceof Date
        ? transaction.createdAt.toISOString()
        : transaction.createdAt,
      transaction.metadata?.action ?? '',
      transaction.amount,
      transaction.description,
      transaction.metadata?.cashAfter ?? '',
      transaction.metadata?.bankAfter ?? '',
    ]),
  ];

  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const limit = await assertRateLimit({
      key: rateLimitKey(request, 'api:bank:history', auth.userId),
      windowSeconds: 60,
      maxRequests: 60,
    });

    if (!limit.ok) {
      return limit.response;
    }

    const query = bankHistoryQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
      action: request.nextUrl.searchParams.get('action') ?? undefined,
      format: request.nextUrl.searchParams.get('format') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
      from: request.nextUrl.searchParams.get('from') ?? undefined,
      to: request.nextUrl.searchParams.get('to') ?? undefined,
    });

    if (!query.success) {
      return jsonError('invalid_query', 'Invalid bank history query.', 400, query.error.flatten());
    }

    const statement = await listCharacterBankStatement({ ...query.data, userId: auth.userId });

    if (!statement) {
      return jsonError('not_found', 'Character not found.', 404);
    }

    if (query.data.format === 'csv') {
      return new Response(bankStatementCsv(statement), {
        headers: {
          'content-disposition': 'attachment; filename="bank-statement.csv"',
          'content-type': 'text/csv; charset=utf-8',
        },
      });
    }

    return jsonOk(statement);
  });
}
