-- Feature Pass 103: persistent product image assets.
-- Product media is stored in PostgreSQL so uploads survive immutable and
-- horizontally scaled web deployments without relying on local disk state.

CREATE TABLE IF NOT EXISTS item_images (
  item_key text PRIMARY KEY REFERENCES item_definitions(key) ON DELETE CASCADE,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  image_data bytea NOT NULL,
  sha256 text NOT NULL,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_images_content_type_check
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT item_images_byte_size_check
    CHECK (byte_size BETWEEN 1 AND 2097152),
  CONSTRAINT item_images_alt_text_check
    CHECK (char_length(alt_text) <= 160),
  CONSTRAINT item_images_sha256_check
    CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS item_images_updated_at_idx
  ON item_images (updated_at DESC);
