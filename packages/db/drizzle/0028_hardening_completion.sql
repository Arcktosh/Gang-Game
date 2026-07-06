-- Feature Pass 38: MVP hardening completion guardrails.
-- Adds database-level invariant checks and operational indexes for high-volume/retry-prone tables.
-- Constraints are added NOT VALID so existing pre-hardening data can be audited and repaired separately;
-- PostgreSQL still enforces these checks for new or updated rows.

DO $$
DECLARE
  constraint_def record;
BEGIN
  FOR constraint_def IN
    SELECT * FROM (VALUES
      ('characters', 'characters_non_negative_balances_check', 'cash >= 0 AND bank >= 0'),
      ('characters', 'characters_progression_floor_check', 'level >= 1 AND experience >= 0 AND prestige_level >= 0 AND legacy_points >= 0 AND season_points >= 0'),
      ('characters', 'characters_core_stats_floor_check', 'intelligence >= 0 AND labour >= 0 AND endurance >= 0 AND strength >= 0 AND stamina >= 0 AND defense >= 0 AND dexterity >= 0'),
      ('characters', 'characters_resource_bounds_check', 'health >= 0 AND energy >= 0 AND max_energy >= 1 AND energy <= max_energy AND nerve >= 0 AND max_nerve >= 1 AND nerve <= max_nerve'),
      ('characters', 'characters_reputation_heat_floor_check', 'heat >= 0 AND legal_reputation >= 0 AND gambling_reputation >= 0'),
      ('inventory_items', 'inventory_items_quantity_floor_check', 'quantity >= 0'),
      ('inventory_items', 'inventory_items_durability_bounds_check', 'durability IS NULL OR (durability >= 0 AND durability <= 100)'),
      ('market_prices', 'market_prices_positive_state_check', 'price >= 1 AND supply >= 0 AND demand >= 0'),
      ('job_runs', 'job_runs_payout_floor_check', 'payout >= 0'),
      ('crime_attempts', 'crime_attempts_reward_heat_floor_check', 'reward >= 0 AND heat_gained >= 0'),
      ('travel_routes', 'travel_routes_positive_state_check', 'cost >= 0 AND duration_seconds >= 0 AND risk >= 0'),
      ('shops', 'shops_reputation_floor_check', 'reputation >= 0'),
      ('shop_listings', 'shop_listings_positive_state_check', 'quantity >= 0 AND price_each >= 1'),
      ('training_activities', 'training_activities_positive_state_check', 'energy_cost >= 0 AND cash_cost >= 0 AND duration_seconds >= 0 AND stat_gain >= 0'),
      ('training_sessions', 'training_sessions_non_negative_costs_check', 'cash_cost >= 0 AND energy_cost >= 0 AND stat_gain >= 0'),
      ('course_definitions', 'course_definitions_positive_state_check', 'cash_cost >= 0 AND energy_cost >= 0 AND duration_seconds >= 0 AND stat_gain >= 0'),
      ('course_enrollments', 'course_enrollments_non_negative_costs_check', 'cash_cost >= 0 AND energy_cost >= 0 AND stat_gain >= 0'),
      ('hospital_stays', 'hospital_stays_non_negative_state_check', 'severity >= 0 AND health_lost >= 0 AND bill >= 0'),
      ('jail_sentences', 'jail_sentences_non_negative_state_check', 'severity >= 0 AND fine >= 0'),
      ('factions', 'factions_non_negative_state_check', 'bank >= 0 AND reputation >= 0'),
      ('territories', 'territories_positive_state_check', 'income_per_tick >= 0 AND defense_rating >= 0 AND control_score >= 0'),
      ('territory_actions', 'territory_actions_positive_state_check', 'power >= 0 AND cash_cost >= 0'),
      ('financial_assets', 'financial_assets_positive_state_check', 'base_price >= 1 AND volatility >= 0'),
      ('asset_prices', 'asset_prices_positive_state_check', 'price >= 1 AND volume >= 0'),
      ('character_asset_positions', 'character_asset_positions_non_negative_state_check', 'quantity >= 0 AND average_cost >= 0'),
      ('asset_orders', 'asset_orders_positive_state_check', 'quantity >= 1 AND price_each >= 1 AND gross_amount >= 0 AND fee >= 0'),
      ('gambling_games', 'gambling_games_positive_state_check', 'min_wager >= 1 AND max_wager >= min_wager AND house_edge_basis_points >= 0 AND variance >= 0'),
      ('gambling_wagers', 'gambling_wagers_positive_state_check', 'wager >= 1 AND payout >= 0'),
      ('contracts', 'contracts_positive_state_check', 'quantity >= 0 AND reward >= 0 AND escrow_amount >= 0 AND risk >= 0'),
      ('contract_events', 'contract_events_amount_floor_check', 'amount >= 0'),
      ('bounties', 'bounties_reward_floor_check', 'reward >= 0'),
      ('vehicle_upgrade_definitions', 'vehicle_upgrade_definitions_positive_state_check', 'cash_cost >= 0 AND required_level >= 1'),
      ('travel_cargo', 'travel_cargo_quantity_floor_check', 'quantity >= 0 AND risk_added >= 0 AND cargo_value >= 0'),
      ('crafting_recipe_definitions', 'crafting_recipe_definitions_positive_state_check', 'cash_cost >= 0 AND energy_cost >= 0 AND duration_seconds >= 0 AND output_quantity >= 0 AND required_level >= 1 AND required_intelligence >= 0 AND required_labour >= 0'),
      ('crafting_jobs', 'crafting_jobs_positive_state_check', 'cash_cost >= 0 AND output_quantity >= 0'),
      ('crafting_job_inputs', 'crafting_job_inputs_quantity_floor_check', 'quantity >= 0'),
      ('notification_digests', 'notification_digests_non_negative_counts_check', 'notification_count >= 0 AND unread_count >= 0'),
      ('api_idempotency_keys', 'api_idempotency_completion_state_check', '(status = ''completed'' AND response_status IS NOT NULL AND response_body IS NOT NULL AND completed_at IS NOT NULL) OR status <> ''completed''')
    ) AS checks(table_name, constraint_name, check_sql)
  LOOP
    IF to_regclass(constraint_def.table_name) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = constraint_def.constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        constraint_def.table_name,
        constraint_def.constraint_name,
        constraint_def.check_sql
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS characters_status_until_idx ON characters(status, status_until) WHERE status_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS player_events_user_created_at_idx ON player_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_created_at_idx ON messages(sender_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_reports_status_created_at_idx ON message_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS newspaper_article_reports_status_created_at_idx ON newspaper_article_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_listings_status_created_at_idx ON shop_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS financial_transactions_character_created_at_idx ON financial_transactions(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_status_expires_at_idx ON contracts(status, expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS character_enforcements_active_ends_at_idx ON character_enforcements(character_id, is_active, ends_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS enforcement_appeals_status_created_at_idx ON enforcement_appeals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_character_unread_created_at_idx ON notifications(character_id, read_at, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_digests_created_at_idx ON notification_digests(created_at DESC);
