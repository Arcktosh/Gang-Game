import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  characters,
  newspaperArticleComments,
  newspaperArticleReactions,
  newspaperArticleReports,
  newspaperArticles,
  notifications,
  playerEvents,
} from '../schema';

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 72);

  return `${base || 'article'}-${Date.now().toString(36)}`;
}

async function requireOwnedCharacter(tx: any, input: { userId: string; characterId: string }) {
  const character = await tx.query.characters.findFirst({
    where: and(eq(characters.id, input.characterId), eq(characters.userId, input.userId)),
  });

  if (!character) {
    return { ok: false as const, code: 'not_found', message: 'Character not found.' };
  }

  return { ok: true as const, character };
}

export async function listNewspaperArticles(input?: {
  location?: string | null;
  limit?: number;
  offset?: number;
}) {
  return listNewspaperCenter({
    location: input?.location,
    limit: input?.limit,
    offset: input?.offset,
  });
}

export async function listNewspaperCenter(input?: {
  userId?: string;
  characterId?: string;
  location?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 50);
  const offset = Math.min(Math.max(input?.offset ?? 0, 0), 5_000);
  const location = input?.location ?? null;

  const articles = await db.query.newspaperArticles.findMany({
    where: location
      ? and(eq(newspaperArticles.isPublished, true), eq(newspaperArticles.location, location))
      : eq(newspaperArticles.isPublished, true),
    with: { author: true },
    orderBy: desc(newspaperArticles.createdAt),
    limit,
    offset,
  });

  const articleIds = articles.map((article) => article.id);

  if (!articleIds.length) {
    return [];
  }

  const [comments, reactionRows, ownReactions, ownReports] = await Promise.all([
    db.query.newspaperArticleComments.findMany({
      where: and(
        inArray(newspaperArticleComments.articleId, articleIds),
        eq(newspaperArticleComments.isHidden, false),
      ),
      with: { author: true },
      orderBy: desc(newspaperArticleComments.createdAt),
      limit: 100,
    }),
    db
      .select({
        articleId: newspaperArticleReactions.articleId,
        reactionType: newspaperArticleReactions.reactionType,
        count: sql<number>`count(*)::int`,
      })
      .from(newspaperArticleReactions)
      .where(inArray(newspaperArticleReactions.articleId, articleIds))
      .groupBy(newspaperArticleReactions.articleId, newspaperArticleReactions.reactionType),
    input?.characterId
      ? db.query.newspaperArticleReactions.findMany({
          where: and(
            inArray(newspaperArticleReactions.articleId, articleIds),
            eq(newspaperArticleReactions.characterId, input.characterId),
          ),
        })
      : Promise.resolve([]),
    input?.characterId
      ? db.query.newspaperArticleReports.findMany({
          where: and(
            inArray(newspaperArticleReports.articleId, articleIds),
            eq(newspaperArticleReports.reporterCharacterId, input.characterId),
          ),
          orderBy: desc(newspaperArticleReports.createdAt),
          limit: 50,
        })
      : Promise.resolve([]),
  ]);

  return articles.map((article) => {
    const articleComments = comments
      .filter((comment) => comment.articleId === article.id)
      .slice(0, 5)
      .reverse();
    const reactionCounts = reactionRows
      .filter((reaction) => reaction.articleId === article.id)
      .reduce<Record<string, number>>((acc, reaction) => {
        acc[reaction.reactionType] = reaction.count;
        return acc;
      }, {});

    return {
      ...article,
      comments: articleComments,
      reactionCounts,
      myReactions: ownReactions
        .filter((reaction) => reaction.articleId === article.id)
        .map((reaction) => reaction.reactionType),
      myReports: ownReports.filter((report) => report.articleId === article.id),
    };
  });
}

export async function submitNewspaperArticle(input: {
  userId: string;
  characterId: string;
  title: string;
  excerpt?: string;
  body: string;
  category?: string;
}) {
  return db.transaction(async (tx) => {
    const owned = await requireOwnedCharacter(tx, input);

    if (!owned.ok) {
      return owned;
    }

    const { character } = owned;

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to submit newspaper articles.',
      };
    }

    const [article] = await tx
      .insert(newspaperArticles)
      .values({
        authorCharacterId: character.id,
        location: character.location,
        category: input.category ?? 'player_blog',
        title: input.title,
        slug: slugify(input.title),
        excerpt: input.excerpt ?? input.body.slice(0, 180),
        body: input.body,
        visibility: 'public',
        isPublished: true,
        metadata: { source: 'player_submission' },
      })
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: 'public',
      type: 'newspaper_article_submitted',
      payload: { articleId: article.id, title: article.title, category: article.category },
    });

    return { ok: true as const, article };
  });
}

export async function commentOnNewspaperArticle(input: {
  userId: string;
  characterId: string;
  articleId: string;
  body: string;
}) {
  return db.transaction(async (tx) => {
    const owned = await requireOwnedCharacter(tx, input);

    if (!owned.ok) {
      return owned;
    }

    const { character } = owned;

    if (character.status !== 'free') {
      return {
        ok: false as const,
        code: 'forbidden',
        message: 'Character is not available to comment on articles.',
      };
    }

    const article = await tx.query.newspaperArticles.findFirst({
      where: and(
        eq(newspaperArticles.id, input.articleId),
        eq(newspaperArticles.isPublished, true),
      ),
    });

    if (!article) {
      return { ok: false as const, code: 'not_found', message: 'Article not found.' };
    }

    const [comment] = await tx
      .insert(newspaperArticleComments)
      .values({ articleId: article.id, authorCharacterId: character.id, body: input.body })
      .returning();

    if (article.authorCharacterId && article.authorCharacterId !== character.id) {
      const author = await tx.query.characters.findFirst({
        where: eq(characters.id, article.authorCharacterId),
      });

      if (author) {
        await tx.insert(notifications).values({
          userId: author.userId,
          characterId: author.id,
          category: 'system',
          priority: 'normal',
          title: 'New article comment',
          body: `${character.name} commented on ${article.title}.`,
          actionUrl: '/dashboard',
          sourceType: 'newspaper_article',
          sourceId: article.id,
          metadata: { articleId: article.id, commentId: comment.id },
        });
      }
    }

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: character.id,
      visibility: 'public',
      type: 'newspaper_article_commented',
      payload: { articleId: article.id, commentId: comment.id, title: article.title },
    });

    return { ok: true as const, comment };
  });
}

export async function reactToNewspaperArticle(input: {
  userId: string;
  characterId: string;
  articleId: string;
  reactionType: string;
}) {
  return db.transaction(async (tx) => {
    const owned = await requireOwnedCharacter(tx, input);

    if (!owned.ok) {
      return owned;
    }

    const article = await tx.query.newspaperArticles.findFirst({
      where: and(
        eq(newspaperArticles.id, input.articleId),
        eq(newspaperArticles.isPublished, true),
      ),
    });

    if (!article) {
      return { ok: false as const, code: 'not_found', message: 'Article not found.' };
    }

    const existing = await tx.query.newspaperArticleReactions.findFirst({
      where: and(
        eq(newspaperArticleReactions.articleId, input.articleId),
        eq(newspaperArticleReactions.characterId, input.characterId),
        eq(newspaperArticleReactions.reactionType, input.reactionType),
      ),
    });

    if (existing) {
      await tx
        .delete(newspaperArticleReactions)
        .where(eq(newspaperArticleReactions.id, existing.id));
      return { ok: true as const, toggled: 'removed' as const };
    }

    const [reaction] = await tx
      .insert(newspaperArticleReactions)
      .values({
        articleId: input.articleId,
        characterId: input.characterId,
        reactionType: input.reactionType,
      })
      .returning();

    return { ok: true as const, toggled: 'added' as const, reaction };
  });
}

export async function reportNewspaperArticle(input: {
  userId: string;
  characterId: string;
  articleId: string;
  reason?: string;
}) {
  return db.transaction(async (tx) => {
    const owned = await requireOwnedCharacter(tx, input);

    if (!owned.ok) {
      return owned;
    }

    const article = await tx.query.newspaperArticles.findFirst({
      where: eq(newspaperArticles.id, input.articleId),
    });

    if (!article) {
      return { ok: false as const, code: 'not_found', message: 'Article not found.' };
    }

    const [report] = await tx
      .insert(newspaperArticleReports)
      .values({
        articleId: article.id,
        reporterCharacterId: input.characterId,
        reason: input.reason || 'Needs moderation review.',
      })
      .returning();

    await tx.insert(playerEvents).values({
      userId: input.userId,
      characterId: input.characterId,
      visibility: 'admin',
      type: 'newspaper_article_reported',
      payload: { articleId: article.id, reportId: report.id, reason: report.reason },
    });

    return { ok: true as const, report };
  });
}

export async function publishSystemArticle(input: {
  title: string;
  body: string;
  excerpt?: string;
  category?: string;
  location?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const [article] = await db
    .insert(newspaperArticles)
    .values({
      title: input.title,
      slug: slugify(input.title),
      excerpt: input.excerpt ?? input.body.slice(0, 180),
      body: input.body,
      category: input.category ?? 'system',
      location: input.location ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return article;
}
