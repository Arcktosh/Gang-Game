alter table factions add column if not exists power integer not null default 0;
alter table faction_members add column if not exists contribution_points integer not null default 0;

create table if not exists faction_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  entry_type text not null,
  amount integer not null default 0,
  balance_after integer not null default 0,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists faction_ledger_entries_faction_created_at_idx on faction_ledger_entries(faction_id, created_at);
create index if not exists faction_ledger_entries_character_created_at_idx on faction_ledger_entries(character_id, created_at);

create table if not exists territories (
  key text primary key,
  name text not null,
  location text not null,
  description text not null default '',
  income_per_tick integer not null default 0,
  defense_rating integer not null default 1,
  heat_modifier integer not null default 0,
  controlled_by_faction_id uuid references factions(id) on delete set null,
  control_score integer not null default 0,
  contested_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists territories_location_idx on territories(location);
create index if not exists territories_controlled_by_idx on territories(controlled_by_faction_id);

create table if not exists territory_actions (
  id uuid primary key default gen_random_uuid(),
  territory_key text not null references territories(key) on delete cascade,
  faction_id uuid not null references factions(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  action_type text not null,
  power integer not null default 0,
  cash_cost integer not null default 0,
  outcome text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists territory_actions_territory_created_at_idx on territory_actions(territory_key, created_at);
create index if not exists territory_actions_faction_created_at_idx on territory_actions(faction_id, created_at);

insert into territories (key, name, location, description, income_per_tick, defense_rating, heat_modifier)
values
  ('starter-docks', 'Starter City Docks', 'starter-city', 'Low-security docks with profitable shipping access.', 75, 2, 1),
  ('old-market', 'Old Market', 'starter-city', 'Crowded retail blocks useful for shops, rumors, and recruitment.', 50, 1, 0),
  ('east-warehouse-row', 'East Warehouse Row', 'starter-city', 'Storage units and truck yards suited to organized crews.', 100, 3, 2),
  ('north-transit-hub', 'North Transit Hub', 'starter-city', 'Bus and taxi routes that help move people and goods.', 60, 2, 1)
on conflict (key) do nothing;
