import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  characterBlocks,
  characters,
  messageReports,
  messages,
  messageThreadMembers,
  messageThreads,
  notifications,
  playerEvents,
} from '../schema';

type Tx = any;

export type MessageAction =
  | { action: 'send'; senderCharacterId: string; recipientCharacterId?: string; threadId?: string; body: string }
  | { action: 'mark_thread_read'; characterId: string; threadId: string }
  | { action: 'leave_thread'; characterId: string; threadId: string }
  | { action: 'mute_thread'; characterId: string; threadId: string; muted: boolean }
  | { action: 'block'; characterId: string; blockedCharacterId: string; reason?: string }
  | { action: 'unblock'; characterId: string; blockedCharacterId: string }
  | { action: 'report'; characterId: string; messageId: string; reason?: string };

async function getOwnedCharacter(userId: string, characterId: string, tx: Tx = db) {
  return tx.query.characters.findFirst({ where: and(eq(characters.id, characterId), eq(characters.userId, userId)) });
}

async function getThreadMember(threadId: string, characterId: string, tx: Tx = db) {
  return tx.query.messageThreadMembers.findFirst({
    where: and(eq(messageThreadMembers.threadId, threadId), eq(messageThreadMembers.characterId, characterId), isNull(messageThreadMembers.leftAt)),
  });
}

export async function listMessageCenter(input: { userId: string; characterId: string }) {
  const character = await getOwnedCharacter(input.userId, input.characterId);

  if (!character) {
    return null;
  }

  const memberships = await db.query.messageThreadMembers.findMany({
    where: and(eq(messageThreadMembers.characterId, input.characterId), isNull(messageThreadMembers.leftAt)),
    orderBy: desc(messageThreadMembers.joinedAt),
    limit: 30,
  });

  const threadIds = memberships.map((membership: any) => membership.threadId);
  const threads = threadIds.length
    ? await db.query.messageThreads.findMany({ where: inArray(messageThreads.id, threadIds) })
    : [];

  const threadSummaries = [];
  for (const membership of memberships as any[]) {
    const thread = (threads as any[]).find((candidate: any) => candidate.id === membership.threadId) ?? null;
    const members = await db
      .select({ id: characters.id, name: characters.name, level: characters.level, status: characters.status })
      .from(messageThreadMembers)
      .innerJoin(characters, eq(characters.id, messageThreadMembers.characterId))
      .where(and(eq(messageThreadMembers.threadId, membership.threadId), isNull(messageThreadMembers.leftAt)))
      .limit(12);
    const recentMessages = await db
      .select({
        id: messages.id,
        threadId: messages.threadId,
        senderCharacterId: messages.senderCharacterId,
        body: messages.body,
        createdAt: messages.createdAt,
        senderName: characters.name,
      })
      .from(messages)
      .innerJoin(characters, eq(characters.id, messages.senderCharacterId))
      .where(eq(messages.threadId, membership.threadId))
      .orderBy(desc(messages.createdAt))
      .limit(6);
    const unreadConditions = [
      eq(messages.threadId, membership.threadId),
      ne(messages.senderCharacterId, input.characterId),
    ];

    if (membership.lastReadAt) {
      unreadConditions.push(gt(messages.createdAt, membership.lastReadAt));
    }

    const unread = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(...unreadConditions));

    threadSummaries.push({
      membership,
      thread,
      members,
      recentMessages: recentMessages.reverse(),
      unreadCount: Number(unread[0]?.count ?? 0),
    });
  }

  const [blocked, blockedBy, possibleRecipients, reports] = await Promise.all([
    db
      .select({ id: characters.id, name: characters.name, reason: characterBlocks.reason, createdAt: characterBlocks.createdAt })
      .from(characterBlocks)
      .innerJoin(characters, eq(characters.id, characterBlocks.blockedCharacterId))
      .where(eq(characterBlocks.blockerCharacterId, input.characterId))
      .limit(50),
    db.query.characterBlocks.findMany({ where: eq(characterBlocks.blockedCharacterId, input.characterId), limit: 50 }),
    db
      .select({ id: characters.id, name: characters.name, level: characters.level, location: characters.location })
      .from(characters)
      .where(and(ne(characters.id, input.characterId), ne(characters.status, 'jailed')))
      .orderBy(desc(characters.level))
      .limit(25),
    db.query.messageReports.findMany({ where: eq(messageReports.reporterCharacterId, input.characterId), orderBy: desc(messageReports.createdAt), limit: 10 }),
  ]);

  return {
    character,
    threads: threadSummaries,
    unreadTotal: threadSummaries.reduce((total, thread) => total + thread.unreadCount, 0),
    blocked,
    blockedByCount: blockedBy.length,
    possibleRecipients: possibleRecipients.filter((candidate: any) => !(blocked as any[]).some((block) => block.id === candidate.id)),
    reports,
  };
}



export async function listMessageStreamSnapshot(input: { userId: string; characterId: string }) {
  const center = await listMessageCenter(input);

  if (!center) {
    return null;
  }

  const threads = center.threads.map((thread: any) => {
    const latestMessage = thread.recentMessages[thread.recentMessages.length - 1] ?? null;

    return {
      threadId: thread.membership.threadId,
      title: thread.thread?.title ?? (thread.members.filter((member: any) => member.id !== input.characterId).map((member: any) => member.name).join(', ') || 'Direct thread'),
      unreadCount: thread.unreadCount,
      muted: Boolean(thread.membership.mutedAt),
      memberCount: thread.members.length,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            senderCharacterId: latestMessage.senderCharacterId,
            senderName: latestMessage.senderName,
            body: latestMessage.body,
            createdAt: latestMessage.createdAt,
          }
        : null,
    };
  });

  const latestThread = [...threads]
    .filter((thread) => thread.latestMessage)
    .sort((left: any, right: any) => new Date(right.latestMessage.createdAt).getTime() - new Date(left.latestMessage.createdAt).getTime())[0] ?? null;

  const latestIncoming = [...threads]
    .filter((thread) => thread.latestMessage && thread.latestMessage.senderCharacterId !== input.characterId)
    .sort((left: any, right: any) => new Date(right.latestMessage.createdAt).getTime() - new Date(left.latestMessage.createdAt).getTime())[0] ?? null;

  return {
    characterId: input.characterId,
    unreadTotal: center.unreadTotal,
    threadCount: center.threads.length,
    blockedCount: center.blocked.length,
    blockedByCount: center.blockedByCount,
    latestThread,
    latestIncoming,
    threads,
    checkedAt: new Date().toISOString(),
  };
}

export async function runMessageAction(input: { userId: string } & MessageAction) {
  if (input.action === 'send') {
    return db.transaction(async (tx: Tx) => {
      const sender = await getOwnedCharacter(input.userId, input.senderCharacterId, tx);
      if (!sender) return { ok: false as const, code: 'not_found', message: 'Sender character not found.' };

      let threadId = input.threadId;
      let recipient: any = null;

      if (!threadId) {
        if (!input.recipientCharacterId) return { ok: false as const, code: 'bad_request', message: 'recipientCharacterId is required.' };
        if (input.recipientCharacterId === sender.id) return { ok: false as const, code: 'bad_request', message: 'You cannot send a message to yourself.' };

        recipient = await tx.query.characters.findFirst({ where: eq(characters.id, input.recipientCharacterId) });
        if (!recipient) return { ok: false as const, code: 'not_found', message: 'Recipient character not found.' };

        const block = await tx.query.characterBlocks.findFirst({
          where: or(
            and(eq(characterBlocks.blockerCharacterId, sender.id), eq(characterBlocks.blockedCharacterId, recipient.id)),
            and(eq(characterBlocks.blockerCharacterId, recipient.id), eq(characterBlocks.blockedCharacterId, sender.id)),
          ),
        });
        if (block) return { ok: false as const, code: 'forbidden', message: 'Messaging is blocked between these characters.' };

        const [thread] = await tx.insert(messageThreads).values({ type: 'direct' }).returning();
        threadId = thread.id;
        await tx.insert(messageThreadMembers).values([
          { threadId, characterId: sender.id, lastReadAt: sql`now()` as any },
          { threadId, characterId: recipient.id },
        ]);
      } else {
        const membership = await getThreadMember(threadId, sender.id, tx);
        if (!membership) return { ok: false as const, code: 'forbidden', message: 'Sender is not an active member of this thread.' };
      }

      if (!threadId) {
        throw new Error('Message thread was not resolved before sending.');
      }
      const resolvedThreadId = threadId;

      const [message] = await tx.insert(messages).values({ threadId: resolvedThreadId, senderCharacterId: sender.id, body: input.body }).returning();
      await tx.update(messageThreadMembers).set({ lastReadAt: sql`now()` }).where(and(eq(messageThreadMembers.threadId, resolvedThreadId), eq(messageThreadMembers.characterId, sender.id)));

      const recipients = await tx
        .select({ id: characters.id, userId: characters.userId, name: characters.name, mutedAt: messageThreadMembers.mutedAt })
        .from(messageThreadMembers)
        .innerJoin(characters, eq(characters.id, messageThreadMembers.characterId))
        .where(and(eq(messageThreadMembers.threadId, resolvedThreadId), ne(messageThreadMembers.characterId, sender.id), isNull(messageThreadMembers.leftAt)));

      for (const inboxRecipient of recipients as any[]) {
        if (inboxRecipient.mutedAt) continue;
        await tx.insert(notifications).values({
          userId: inboxRecipient.userId,
          characterId: inboxRecipient.id,
          category: 'system',
          priority: 'normal',
          title: `New message from ${sender.name}`,
          body: input.body.length > 140 ? `${input.body.slice(0, 137)}...` : input.body,
          actionUrl: '/dashboard',
          sourceType: 'message',
          sourceId: message.id,
          metadata: { threadId: resolvedThreadId },
        });
      }

      await tx.insert(playerEvents).values({
        userId: input.userId,
        characterId: sender.id,
        type: 'message_sent',
        payload: { threadId: resolvedThreadId, messageId: message.id, recipientCharacterId: recipient?.id },
      });
      return { ok: true as const, data: { message, threadId: resolvedThreadId } };
    });
  }

  const character = await getOwnedCharacter(input.userId, input.characterId);
  if (!character) return { ok: false as const, code: 'not_found', message: 'Character not found.' };

  if (input.action === 'mark_thread_read') {
    const membership = await getThreadMember(input.threadId, input.characterId);
    if (!membership) return { ok: false as const, code: 'not_found', message: 'Thread membership not found.' };
    const [row] = await db.update(messageThreadMembers).set({ lastReadAt: sql`now()` }).where(and(eq(messageThreadMembers.threadId, input.threadId), eq(messageThreadMembers.characterId, input.characterId))).returning();
    return { ok: true as const, data: { membership: row } };
  }

  if (input.action === 'leave_thread') {
    const [row] = await db.update(messageThreadMembers).set({ leftAt: sql`now()` }).where(and(eq(messageThreadMembers.threadId, input.threadId), eq(messageThreadMembers.characterId, input.characterId), isNull(messageThreadMembers.leftAt))).returning();
    return row ? { ok: true as const, data: { membership: row } } : { ok: false as const, code: 'not_found', message: 'Thread membership not found.' };
  }

  if (input.action === 'mute_thread') {
    const [row] = await db.update(messageThreadMembers).set({ mutedAt: input.muted ? (sql`now()` as any) : null }).where(and(eq(messageThreadMembers.threadId, input.threadId), eq(messageThreadMembers.characterId, input.characterId), isNull(messageThreadMembers.leftAt))).returning();
    return row ? { ok: true as const, data: { membership: row } } : { ok: false as const, code: 'not_found', message: 'Thread membership not found.' };
  }

  if (input.action === 'block') {
    if (input.blockedCharacterId === input.characterId) return { ok: false as const, code: 'bad_request', message: 'You cannot block yourself.' };
    const target = await db.query.characters.findFirst({ where: eq(characters.id, input.blockedCharacterId) });
    if (!target) return { ok: false as const, code: 'not_found', message: 'Blocked character not found.' };
    const [block] = await db.insert(characterBlocks).values({ blockerCharacterId: input.characterId, blockedCharacterId: input.blockedCharacterId, reason: input.reason ?? '' }).onConflictDoUpdate({ target: [characterBlocks.blockerCharacterId, characterBlocks.blockedCharacterId], set: { reason: input.reason ?? '' } }).returning();
    return { ok: true as const, data: { block } };
  }

  if (input.action === 'unblock') {
    const rows = await db.delete(characterBlocks).where(and(eq(characterBlocks.blockerCharacterId, input.characterId), eq(characterBlocks.blockedCharacterId, input.blockedCharacterId))).returning();
    return { ok: true as const, data: { deleted: rows.length } };
  }

  const message = await db.query.messages.findFirst({ where: eq(messages.id, input.messageId) });
  if (!message) return { ok: false as const, code: 'not_found', message: 'Message not found.' };
  const membership = await getThreadMember(message.threadId, input.characterId);
  if (!membership) return { ok: false as const, code: 'forbidden', message: 'You can only report messages in your own threads.' };
  const [report] = await db.insert(messageReports).values({ messageId: input.messageId, reporterCharacterId: input.characterId, reason: input.reason ?? '' }).returning();
  await db.insert(playerEvents).values({ userId: input.userId, characterId: input.characterId, visibility: 'admin', type: 'message_reported', payload: { messageId: input.messageId, reportId: report.id } });
  return { ok: true as const, data: { report } };
}
