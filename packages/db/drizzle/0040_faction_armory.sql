create table if not exists faction_inventory_items (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions(id) on delete cascade,
  item_key text not null references item_definitions(key) on delete restrict,
  quantity integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faction_inventory_items_quantity_nonnegative check (quantity >= 0)
);

create unique index if not exists faction_inventory_items_faction_item_unique
  on faction_inventory_items (faction_id, item_key);

create index if not exists faction_inventory_items_faction_updated_idx
  on faction_inventory_items (faction_id, updated_at desc);

create index if not exists faction_inventory_items_item_idx
  on faction_inventory_items (item_key);
