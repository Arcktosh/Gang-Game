create table if not exists "user_sessions" (
  "id" uuid primary key default gen_random_uuid() not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "session_token_hash" text not null,
  "user_agent" text,
  "ip_address" text,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null
);

create unique index if not exists "user_sessions_token_hash_unique" on "user_sessions" ("session_token_hash");
create index if not exists "user_sessions_user_expires_at_idx" on "user_sessions" ("user_id", "expires_at");
