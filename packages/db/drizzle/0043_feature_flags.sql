-- Feature Pass 91: operational feature flags / kill switches.
-- Values intentionally live in game_config_entries so operators can toggle without a redeploy.

INSERT INTO game_config_entries (key, label, description, value, category, is_public)
VALUES
  ('feature.messages', 'Messages', 'Allows players to send direct, group, and faction messages.', '{"enabled":true,"disabledMessage":"Messages are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.newspaper', 'Newspaper submissions', 'Allows player-submitted newspaper articles, comments, reactions, and reports.', '{"enabled":true,"disabledMessage":"Newspaper actions are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.shops', 'Player shops', 'Allows player shop creation, listings, purchases, reviews, and advertisements.', '{"enabled":true,"disabledMessage":"Shop actions are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.trades', 'Player trades', 'Allows player-to-player private trade offers and trade actions.', '{"enabled":true,"disabledMessage":"Player trades are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.gambling', 'Gambling', 'Allows wager placement for casino-style fictional games.', '{"enabled":true,"disabledMessage":"Gambling actions are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.finance', 'Finance trading', 'Allows fictional asset buy and sell orders.', '{"enabled":true,"disabledMessage":"Finance trading is temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.market', 'Market actions', 'Allows location market buy and sell actions.', '{"enabled":true,"disabledMessage":"Market actions are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.contracts', 'Contracts', 'Allows player-created contracts and contract lifecycle actions.', '{"enabled":true,"disabledMessage":"Contracts are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.factions', 'Factions', 'Allows faction creation, membership, bank, armory, and member operations.', '{"enabled":true,"disabledMessage":"Faction actions are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true),
  ('feature.pvp', 'PvP attacks', 'Allows local player-versus-player attack actions.', '{"enabled":true,"disabledMessage":"PvP attacks are temporarily unavailable while the game team completes maintenance."}'::jsonb, 'feature_flags', true)
ON CONFLICT (key) DO NOTHING;
