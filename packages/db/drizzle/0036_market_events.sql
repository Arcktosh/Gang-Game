CREATE TABLE IF NOT EXISTS market_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  location text NOT NULL,
  item_key text NOT NULL REFERENCES item_definitions(key) ON DELETE cascade,
  status text NOT NULL DEFAULT 'scheduled',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  published_article_id uuid REFERENCES newspaper_articles(id) ON DELETE set null,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_events_status_check CHECK (status IN ('scheduled', 'published', 'expired')),
  CONSTRAINT market_events_time_window_check CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS market_events_event_location_item_starts_unique
  ON market_events(event_key, location, item_key, starts_at);
CREATE INDEX IF NOT EXISTS market_events_location_window_idx ON market_events(location, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS market_events_status_window_idx ON market_events(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS market_events_published_article_idx ON market_events(published_article_id);
