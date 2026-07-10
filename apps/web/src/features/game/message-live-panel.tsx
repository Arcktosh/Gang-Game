'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format';

type MessageLiveSnapshot = {
  unreadTotal: number;
  threadCount: number;
  blockedCount: number;
  blockedByCount: number;
  checkedAt: string;
  latestIncoming?: {
    latestMessage?: {
      senderName?: string | null;
      body: string;
      createdAt: string;
    } | null;
  } | null;
  latestThread?: {
    title?: string;
    unreadCount: number;
  } | null;
};

type MessageLivePanelProps = {
  characterId: string;
  initialUnreadTotal: number;
  initialThreadCount: number;
};

export function MessageLivePanel({ characterId, initialUnreadTotal, initialThreadCount }: MessageLivePanelProps) {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'closed' | 'error'>('connecting');
  const [snapshot, setSnapshot] = useState<MessageLiveSnapshot | null>(null);

  useEffect(() => {
    if (!characterId) {
      setConnectionState('closed');
      return;
    }

    setConnectionState('connecting');
    const source = new EventSource(`/api/messages/stream?characterId=${characterId}`);

    source.addEventListener('message.snapshot', (event) => {
      setSnapshot(JSON.parse((event as MessageEvent).data) as MessageLiveSnapshot);
      setConnectionState('connected');
    });

    source.addEventListener('message.heartbeat', () => {
      setConnectionState('connected');
    });

    source.onerror = () => {
      setConnectionState('error');
    };

    return () => {
      source.close();
      setConnectionState('closed');
    };
  }, [characterId]);

  const unreadTotal = snapshot?.unreadTotal ?? initialUnreadTotal;
  const threadCount = snapshot?.threadCount ?? initialThreadCount;
  const latestIncoming = snapshot?.latestIncoming?.latestMessage;

  return (
    <section className="game-card" aria-labelledby="message-live-title">
      <div className="game-card__header">
        <div>
          <p className="game-card__eyebrow">Live inbox</p>
          <h2 id="message-live-title">Message stream</h2>
        </div>
        <span className="game-card__meta">{connectionState}</span>
      </div>
      <dl className="stat-list">
        <div>
          <dt>Unread</dt>
          <dd>{unreadTotal}</dd>
        </div>
        <div>
          <dt>Threads</dt>
          <dd>{threadCount}</dd>
        </div>
        <div>
          <dt>Blocked</dt>
          <dd>{snapshot?.blockedCount ?? 0}</dd>
        </div>
        <div>
          <dt>Last checked</dt>
          <dd>{snapshot?.checkedAt ? formatDateTime(snapshot.checkedAt) : 'Waiting for stream'}</dd>
        </div>
      </dl>
      {latestIncoming ? (
        <p className="action-form__helper" aria-live="polite">
          Latest incoming from {latestIncoming.senderName ?? 'Unknown sender'}: {latestIncoming.body.length > 120 ? `${latestIncoming.body.slice(0, 117)}...` : latestIncoming.body}
        </p>
      ) : (
        <p className="action-form__helper">Live updates will appear here when new messages arrive.</p>
      )}
    </section>
  );
}
