import { listNotificationStreamSnapshot } from '@drugdeal/db';
import { notificationCenterQuerySchema } from '@drugdeal/validators';
import { NextRequest } from 'next/server';
import { jsonError, requireRequestUserId } from '@/lib/api';
import { withApiObservability } from '@/lib/observability';

const encoder = new TextEncoder();
const STREAM_INTERVAL_MS = 5000;

function encodeEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: NextRequest) {
  return withApiObservability(request, async () => {
    const auth = await requireRequestUserId(request);

    if (!auth.ok) {
      return auth.response;
    }

    const query = notificationCenterQuerySchema.safeParse({
      characterId: request.nextUrl.searchParams.get('characterId') ?? undefined,
    });

    if (!query.success) {
      return jsonError(
        'bad_request',
        'Invalid notification stream query.',
        400,
        query.error.flatten(),
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        let lastSignature = '';
        let isClosed = false;

        const pushSnapshot = async () => {
          if (isClosed) return;

          try {
            const snapshot = await listNotificationStreamSnapshot({
              userId: auth.userId,
              characterId: query.data.characterId,
            });

            if (!snapshot) {
              controller.enqueue(
                encodeEvent('error', { code: 'not_found', message: 'Character not found.' }),
              );
              return;
            }

            const signature = JSON.stringify({
              unreadCount: snapshot.unreadCount,
              highPriorityCount: snapshot.highPriorityCount,
              latestNotificationId: snapshot.latestNotification?.id ?? null,
              latestActivityId: snapshot.latestActivity?.id ?? null,
            });

            if (signature !== lastSignature) {
              controller.enqueue(encodeEvent('notification.snapshot', snapshot));
              lastSignature = signature;
            } else {
              controller.enqueue(
                encodeEvent('notification.heartbeat', { checkedAt: new Date().toISOString() }),
              );
            }
          } catch (error) {
            controller.enqueue(
              encodeEvent('error', {
                code: 'server_error',
                message:
                  error instanceof Error ? error.message : 'Could not refresh notification stream.',
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
