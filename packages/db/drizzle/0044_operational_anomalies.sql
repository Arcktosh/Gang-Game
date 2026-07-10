-- Feature Pass 92: automated operational anomaly detection.
-- Stores deduplicated economy/inventory/session signals for admin review.

CREATE TABLE IF NOT EXISTS operational_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  signal_key text NOT NULL,
  signal_category text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  summary text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_anomalies_status_check CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT operational_anomalies_severity_check CHECK (severity BETWEEN 1 AND 5),
  CONSTRAINT operational_anomalies_summary_length CHECK (char_length(summary) BETWEEN 5 AND 500),
  CONSTRAINT operational_anomalies_resolution_note_length CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_anomalies_signal_key_unique ON operational_anomalies(signal_key);
CREATE INDEX IF NOT EXISTS operational_anomalies_status_severity_idx ON operational_anomalies(status, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS operational_anomalies_character_status_idx ON operational_anomalies(character_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS operational_anomalies_user_status_idx ON operational_anomalies(user_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS operational_anomalies_category_detected_idx ON operational_anomalies(signal_category, detected_at DESC);
