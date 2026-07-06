CREATE TYPE admin_role AS ENUM ('none', 'support', 'moderator', 'economy_manager', 'game_master', 'owner');

ALTER TABLE users
  ADD COLUMN admin_role admin_role NOT NULL DEFAULT 'none';

UPDATE users
SET admin_role = 'owner'
WHERE is_admin = true AND admin_role = 'none';

CREATE INDEX users_admin_role_idx ON users(admin_role);
