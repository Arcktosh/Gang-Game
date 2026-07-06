INSERT INTO users (id, email, password_hash, display_name, is_admin)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@example.com', 'scrypt:00000000000000000000000000000000:daf8dad923aea3307e8f6b421e8d94f2fabd7f61e5ea3004b36da21dc6a8088d95b15c15857698b2a7b08ba5c194c5cb48b4757e206e7a7f7b90ba359e36cdf2', 'Dev Player', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (key, name, description, police_pressure, market_volatility)
VALUES
  ('starter-city', 'Starter City', 'A balanced starting city with average opportunity and moderate enforcement.', 1, 1),
  ('harbor-district', 'Harbor District', 'Cheaper imports, higher travel risk, and volatile black-market pricing.', 2, 3),
  ('uptown', 'Uptown', 'High payouts, expensive shops, and aggressive policing.', 3, 2)
ON CONFLICT (key) DO NOTHING;

INSERT INTO item_definitions (key, name, category, description, base_price, base_risk, is_illegal)
VALUES
  ('burner-phone', 'Burner Phone', 'gear', 'Disposable phone used for safer messages and contracts.', 150, 0, false),
  ('lockpick-set', 'Lockpick Set', 'tool', 'Basic toolset for low-level theft crimes.', 300, 1, true),
  ('first-aid-kit', 'First Aid Kit', 'medical', 'Restores a small amount of health.', 120, 0, false),
  ('street-sample', 'Street Sample', 'drug', 'Low-grade product used by beginners.', 80, 2, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO job_definitions (key, name, description, required_labour, required_intelligence, energy_cost, base_wage, duration_seconds)
VALUES
  ('dishwasher', 'Dishwasher Shift', 'Low-risk starter work for early cash.', 1, 1, 10, 80, 1800),
  ('warehouse-loader', 'Warehouse Loader', 'Physical labour with better pay.', 2, 1, 16, 140, 3600),
  ('night-security', 'Night Security', 'Uses endurance and discipline. Good for early reputation.', 2, 2, 18, 180, 7200)
ON CONFLICT (key) DO NOTHING;

INSERT INTO crime_definitions (key, name, description, required_level, required_nerve, difficulty, min_reward, max_reward, heat_gain, jail_risk)
VALUES
  ('shoplift', 'Shoplift', 'Small theft with low payout and low risk.', 1, 2, 1, 20, 90, 1, 1),
  ('pickpocket', 'Pickpocket', 'Dexterity-based street crime with moderate variance.', 1, 4, 2, 80, 250, 2, 2),
  ('warehouse-theft', 'Warehouse Theft', 'Higher payout theft requiring more nerve.', 2, 8, 4, 300, 900, 5, 4)
ON CONFLICT (key) DO NOTHING;

INSERT INTO travel_routes (from_location, to_location, cost, duration_seconds, risk)
VALUES
  ('starter-city', 'harbor-district', 75, 900, 2),
  ('harbor-district', 'starter-city', 75, 900, 2),
  ('starter-city', 'uptown', 120, 1200, 1),
  ('uptown', 'starter-city', 120, 1200, 1),
  ('harbor-district', 'uptown', 200, 1800, 3),
  ('uptown', 'harbor-district', 200, 1800, 3)
ON CONFLICT (from_location, to_location) DO NOTHING;
