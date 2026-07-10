import { listMessageStreamSnapshot } from '@drugdeal/db';
import { messageCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

const encoder = new TextEncoder();
const STREAM_INTERVAL_MS = 4000;

function encodeEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const query = messageCenterQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
    });

    if (!query.success) {
      return jsonError('bad_request', 'Invalid message stream query.', 400, query.error.flatten());
    }

    const stream = new ReadableStream({
      async start(controller) {
        let lastSignature = '';
        let isClosed = false;

        const pushSnapshot = async () => {
          if (isClosed) return;

          try {
            const snapshot = await listMessageStreamSnapshot({ userId: auth.userId, characterId: query.data.characterId });

            if (!snapshot) {
              controller.enqueue(encodeEvent('error', { code: 'not_found', message: 'Character not found.' }));
              return;
            }

            const signature = JSON.stringify({
              unreadTotal: snapshot.unreadTotal,
              threadCount: snapshot.threadCount,
              latestMessageId: snapshot.latestThread?.latestMessage?.id ?? null,
              latestIncomingId: snapshot.latestIncoming?.latestMessage?.id ?? null,
            });

            if (signature !== lastSignature) {
              controller.enqueue(encodeEvent('message.snapshot', snapshot));
              lastSignature = signature;
            } else {
              controller.enqueue(encodeEvent('message.heartbeat', { checkedAt: new Date().toISOString() }));
            }
          } catch (error) {
            controller.enqueue(
              encodeEvent('error', {
                code: 'server_error',
                message: error instanceof Error ? error.message : 'Could not refresh message stream.',
              }),
            );
          }
        };

        await pushSnapshot();
        const interval = setInterval(pushSnapshot, STREAM_INTERVAL_MS);

        request.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'content-type': 'text/event-stream; charset=utf-8',
        'x-accel-buffering': 'no',
      },
    });
  });
}
