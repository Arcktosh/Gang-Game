import { listNewspaperCenter } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import {
  Card,
  EmptyState,
  formatDate,
  GamePageShell,
  getActiveGameContext,
  Grid,
} from '@/features/game/game-page';

const categoryOptions = [
  { label: 'Player blog', value: 'player_blog' },
  { label: 'Business', value: 'business' },
  { label: 'Market', value: 'market' },
  { label: 'Factions', value: 'factions' },
  { label: 'Community', value: 'community' },
];

export default async function NewspaperPage() {
  const { session, character } = await getActiveGameContext();
  const articles = await listNewspaperCenter({
    userId: session.user.id,
    characterId: character.id,
    location: character.location,
    limit: 30,
  });
  const categories = Array.from(new Set(articles.map((article) => article.category))).sort();
  const systemArticles = articles.filter((article) => !article.author);
  const playerArticles = articles.filter((article) => article.author);

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Newspaper"
      eyebrow={character.location}
      description="Read local stories, submit player reports, react to articles, join comments, and report unsafe content for moderation."
    >
      <Grid>
        <Card title="Submit an article" meta="Public local post">
          <GameActionForm
            endpoint="/api/newspaper"
            label="Submit article"
            payload={{ characterId: character.id, action: 'submit_article' }}
            fields={[
              { name: 'title', label: 'Title', placeholder: 'Warehouse prices spike downtown' },
              { name: 'category', label: 'Category', type: 'select', options: categoryOptions },
              {
                name: 'excerpt',
                label: 'Excerpt',
                type: 'textarea',
                placeholder: 'Short summary for the front page',
                omitWhenEmpty: true,
              },
              {
                name: 'body',
                label: 'Body',
                type: 'textarea',
                placeholder: 'Write the full article body.',
              },
            ]}
            successMessage="Article published."
          />
        </Card>

        <Card title="Archive filters" meta={`${articles.length} latest`}>
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            First-pass archive view grouped by category and author source, with room for richer
            client filters.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.length ? (
              categories.map((category) => (
                <span key={category} className="nav-pill">
                  {category}
                </span>
              ))
            ) : (
              <span className="nav-pill">No categories yet</span>
            )}
          </div>
          <div style={{ height: 12 }} />
          <p>
            System posts: {systemArticles.length} · Player posts: {playerArticles.length}
          </p>
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      {articles.length > 0 ? (
        <Grid min={340}>
          {articles.map((article) => (
            <Card key={article.id} title={article.title} meta={formatDate(article.createdAt)}>
              <p style={{ color: '#a1a1aa', marginTop: 0 }}>
                {article.category} · By {article.author?.name ?? 'System'} ·{' '}
                {article.comments.length} comments
              </p>
              <p style={{ color: '#d4d4d8' }}>{article.excerpt}</p>
              <StatLine
                label="Reactions"
                value={
                  Object.entries(article.reactionCounts)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' · ') || 'None'
                }
              />
              {article.myReports.length ? (
                <p style={{ color: '#facc15' }}>
                  You reported this article. Status: {article.myReports[0]?.status}
                </p>
              ) : null}

              <div className="action-grid">
                <GameActionForm
                  endpoint="/api/newspaper"
                  label="React"
                  payload={{ characterId: character.id, articleId: article.id, action: 'react' }}
                  fields={[
                    {
                      name: 'reactionType',
                      label: 'Reaction',
                      type: 'select',
                      options: [
                        { label: 'Like', value: 'like' },
                        { label: 'Insightful', value: 'insightful' },
                        { label: 'Funny', value: 'funny' },
                        { label: 'Boost', value: 'boost' },
                      ],
                    },
                  ]}
                  successMessage="Reaction saved."
                  idempotent={false}
                />
                <GameActionForm
                  endpoint="/api/newspaper"
                  label="Comment"
                  payload={{ characterId: character.id, articleId: article.id, action: 'comment' }}
                  fields={[
                    {
                      name: 'body',
                      label: 'Comment',
                      type: 'textarea',
                      placeholder: 'Add to the discussion',
                    },
                  ]}
                  successMessage="Comment added."
                  idempotent={false}
                />
                <GameActionForm
                  endpoint="/api/newspaper"
                  label="Report"
                  payload={{ characterId: character.id, articleId: article.id, action: 'report' }}
                  fields={[
                    {
                      name: 'reason',
                      label: 'Reason',
                      type: 'textarea',
                      placeholder: 'Why should moderation review this?',
                      omitWhenEmpty: true,
                    },
                  ]}
                  successMessage="Article report submitted."
                  idempotent={false}
                />
              </div>

              {article.comments.length > 0 ? (
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  <strong>Recent comments</strong>
                  {article.comments.map((comment) => (
                    <p
                      key={comment.id}
                      style={{ borderTop: '1px solid #27272a', margin: 0, paddingTop: 8 }}
                    >
                      {comment.body}
                      <br />
                      <span style={{ color: '#a1a1aa' }}>
                        By {comment.author?.name ?? 'Unknown'} · {formatDate(comment.createdAt)}
                      </span>
                    </p>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </Grid>
      ) : (
        <Card>
          <EmptyState>No local newspaper articles have been published yet.</EmptyState>
        </Card>
      )}
    </GamePageShell>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ color: '#a1a1aa' }}>
      <strong style={{ color: '#e4e4e7' }}>{label}:</strong> {value}
    </p>
  );
}
