CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  route_scope text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  CONSTRAINT api_idempotency_status_check CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS api_idempotency_user_key_scope_unique
  ON api_idempotency_keys(user_id, request_key, route_scope);

CREATE INDEX IF NOT EXISTS api_idempotency_user_created_at_idx
  ON api_idempotency_keys(user_id, created_at);

CREATE INDEX IF NOT EXISTS api_idempotency_expires_at_idx
  ON api_idempotency_keys(expires_at);
