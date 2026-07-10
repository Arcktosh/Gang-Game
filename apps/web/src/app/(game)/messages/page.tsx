import { listMessageCenter } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, EmptyState, formatDate, GamePageShell, getActiveGameContext, Grid } from '@/features/game/game-page';
import { MessageLivePanel } from '@/features/game/message-live-panel';

export default async function MessagesPage() {
  const { session, character } = await getActiveGameContext();
  const center = await listMessageCenter({ userId: session.user.id, characterId: character.id });
  const threads = center?.threads ?? [];
  const recipients = center?.possibleRecipients ?? [];
  const blocked = center?.blocked ?? [];
  const reports = center?.reports ?? [];

  return (
    <GamePageShell sidebarCharacter={character} title="Messages" eyebrow={character.name} description="Review private conversations, live inbox updates, social safety controls, reports, and mutes.">
      <Grid>
        <MessageLivePanel characterId={character.id} initialThreadCount={threads.length} initialUnreadTotal={center?.unreadTotal ?? 0} />

        <Card title="Threads" meta={`${threads.length} conversations`}>
          {threads.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {threads.map((thread) => (
                <article key={thread.membership.threadId} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 10 }}>
                  <div>
                    <strong>{thread.thread?.title || 'Conversation'}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                      {thread.members.map((member) => member.name).join(', ')} - {thread.unreadCount} unread - Updated {formatDate(thread.thread?.createdAt)}
                    </p>
                  </div>
                  <div className="action-grid" aria-label={`Actions for ${thread.thread?.title || 'conversation'}`}>
                    <GameActionForm
                      endpoint="/api/messages"
                      label="Mark read"
                      payload={{ action: 'mark_thread_read', characterId: character.id, threadId: thread.membership.threadId }}
                      successMessage="Thread marked as read."
                      idempotent={false}
                    />
                    <GameActionForm
                      endpoint="/api/messages"
                      label={thread.membership.mutedAt ? 'Unmute thread' : 'Mute thread'}
                      payload={{ action: 'mute_thread', characterId: character.id, threadId: thread.membership.threadId, muted: !thread.membership.mutedAt }}
                      successMessage="Thread mute preference updated."
                      idempotent={false}
                    />
                    <GameActionForm
                      endpoint="/api/messages"
                      label="Leave thread"
                      payload={{ action: 'leave_thread', characterId: character.id, threadId: thread.membership.threadId }}
                      helper="Leaving removes this conversation from your active inbox."
                      successMessage="Thread left."
                      idempotent={false}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState>No message threads yet.</EmptyState>}
        </Card>

        <Card title="Recent messages" meta={`${threads.reduce((total, thread) => total + thread.recentMessages.length, 0)} shown`}>
          {threads.some((thread) => thread.recentMessages.length > 0) ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {threads.flatMap((thread) => thread.recentMessages.map((message) => ({ ...message, threadId: thread.membership.threadId }))).map((message) => (
                <article key={message.id} style={{ borderTop: '1px solid #27272a', display: 'grid', gap: 8, paddingTop: 10 }}>
                  <div>
                    <strong>{message.senderName ?? 'Unknown sender'}</strong>
                    <p style={{ color: '#d4d4d8', margin: '4px 0 0' }}>{message.body}</p>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>{formatDate(message.createdAt)}</p>
                  </div>
                  {message.senderCharacterId !== character.id ? (
                    <GameActionForm
                      endpoint="/api/messages"
                      label="Report message"
                      payload={{ action: 'report', characterId: character.id, messageId: message.id }}
                      fields={[{ name: 'reason', label: 'Reason', placeholder: 'Why should moderators review this message?', omitWhenEmpty: true }]}
                      successMessage="Message report submitted."
                      idempotent={false}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : <EmptyState>No recent messages.</EmptyState>}
        </Card>

        <Card title="Send message">
          <GameActionForm
            endpoint="/api/messages"
            label="Send message"
            payload={{ action: 'send', senderCharacterId: character.id }}
            fields={[
              recipients.length > 0
                ? { name: 'recipientCharacterId', label: 'Recipient', type: 'select', options: recipients.map((recipient) => ({ label: `${recipient.name} · level ${recipient.level} · ${recipient.location}`, value: recipient.id })) }
                : { name: 'recipientCharacterId', label: 'Recipient character ID', placeholder: 'Paste a character ID', omitWhenEmpty: true },
              { name: 'body', label: 'Message', placeholder: 'Write a message...' },
            ]}
            successMessage="Message sent."
            idempotent={false}
          />
        </Card>

        <Card title="Block controls" meta={`${blocked.length} blocked`}>
          <div style={{ display: 'grid', gap: 12 }}>
            {recipients.length > 0 ? (
              <GameActionForm
                endpoint="/api/messages"
                label="Block character"
                payload={{ action: 'block', characterId: character.id }}
                fields={[
                  { name: 'blockedCharacterId', label: 'Character', type: 'select', options: recipients.map((recipient) => ({ label: `${recipient.name} · level ${recipient.level}`, value: recipient.id })) },
                  { name: 'reason', label: 'Reason', placeholder: 'Optional note for yourself', omitWhenEmpty: true },
                ]}
                successMessage="Character blocked."
                idempotent={false}
              />
            ) : <EmptyState>No available characters to block.</EmptyState>}

            {blocked.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {blocked.map((block) => (
                  <article key={block.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                    <strong>{block.name}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 8px' }}>{block.reason || 'No reason recorded'} - blocked {formatDate(block.createdAt)}</p>
                    <GameActionForm
                      endpoint="/api/messages"
                      label="Unblock character"
                      payload={{ action: 'unblock', characterId: character.id, blockedCharacterId: block.id }}
                      successMessage="Character unblocked."
                      idempotent={false}
                    />
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Report history" meta={`${reports.length} recent reports`}>
          {reports.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {reports.map((report) => (
                <article key={report.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                  <strong>{report.status.replaceAll('_', ' ')}</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>{report.reason || 'No reason recorded'} - {formatDate(report.createdAt)}</p>
                </article>
              ))}
            </div>
          ) : <EmptyState>No message reports submitted.</EmptyState>}
        </Card>
      </Grid>
    </GamePageShell>
  );
}
