-- Feature Pass 93: admin audit workbench indexes.
-- These indexes support filtered economy, inventory, and session investigations
-- without requiring direct production database access.

CREATE INDEX IF NOT EXISTS financial_transactions_created_at_idx
  ON financial_transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS financial_transactions_type_created_at_idx
  ON financial_transactions (type, created_at DESC);

CREATE INDEX IF NOT EXISTS financial_transactions_amount_created_at_idx
  ON financial_transactions ((abs(amount::numeric)), created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_items_quantity_idx
  ON inventory_items (quantity DESC, updated_at DESC)
  WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS inventory_items_item_quantity_idx
  ON inventory_items (item_key, quantity DESC, updated_at DESC)
  WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS user_sessions_last_seen_at_idx
  ON user_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS user_sessions_ip_last_seen_at_idx
  ON user_sessions (ip_address, last_seen_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_action_logs_created_at_idx
  ON admin_action_logs (created_at DESC);
