CREATE TABLE IF NOT EXISTS newspaper_article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES newspaper_articles(id) ON DELETE CASCADE,
  author_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  body text NOT NULL,
  visibility event_visibility NOT NULL DEFAULT 'public',
  is_hidden boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newspaper_article_comments_article_created_at_idx
  ON newspaper_article_comments(article_id, created_at);

CREATE INDEX IF NOT EXISTS newspaper_article_comments_author_created_at_idx
  ON newspaper_article_comments(author_character_id, created_at);

CREATE TABLE IF NOT EXISTS newspaper_article_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES newspaper_articles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newspaper_article_reactions_article_character_reaction_unique
  ON newspaper_article_reactions(article_id, character_id, reaction_type);

CREATE INDEX IF NOT EXISTS newspaper_article_reactions_article_reaction_idx
  ON newspaper_article_reactions(article_id, reaction_type);

CREATE TABLE IF NOT EXISTS newspaper_article_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES newspaper_articles(id) ON DELETE CASCADE,
  reporter_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'Needs moderation review.',
  status message_report_status NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS newspaper_article_reports_article_created_at_idx
  ON newspaper_article_reports(article_id, created_at);

CREATE INDEX IF NOT EXISTS newspaper_article_reports_reporter_created_at_idx
  ON newspaper_article_reports(reporter_character_id, created_at);

CREATE INDEX IF NOT EXISTS newspaper_article_reports_status_created_at_idx
  ON newspaper_article_reports(status, created_at);
