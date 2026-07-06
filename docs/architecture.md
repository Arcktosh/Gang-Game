# Architecture

## Core principle

The web app handles user interaction. The worker handles time-based simulation.

## Services

### Web app

- Next.js App Router
- Server components for read-heavy pages
- Server actions or route handlers for game actions
- API routes for health checks, notifications, admin tools, and mobile clients

### Worker app

- Runs scheduled ticks and queue jobs
- Handles delayed actions like travel completion, jail release, recovery, training completion, and market updates
- Must be safe to restart
- Jobs should be idempotent

### PostgreSQL

The source of truth for permanent game state.

### Redis

Used for queues, cooldowns, rate limits, live presence, temporary locks, and notifications.

## Recommended data flow

1. Player clicks an action.
2. Server validates current state and requirements.
3. Server performs the action in a database transaction.
4. Server writes an event log entry.
5. Server schedules a queue job if the action resolves later.
6. UI refreshes or receives a notification.
7. Worker completes delayed work and writes another event.

## Non-negotiable rules

- Every money or item transfer must be transactional.
- Every important action must create an event log record.
- Worker jobs must be idempotent.
- Never trust client-side state for rewards, costs, cooldowns, or success chances.
- Keep game formulas in `packages/game`, not directly inside pages.

## API conventions

Initial API routes return one of two shapes:

```json
{ "data": {} }
```

or:

```json
{ "error": { "code": "bad_request", "message": "Invalid request body.", "details": {} } }
```

During the skeleton phase, routes use an `x-user-id` request header as a temporary auth shim. Replace this with proper session auth before production.

Business rules should not live directly in page components. Keep the flow as:

```txt
Route Handler -> validator -> DB query / game rule package -> event log -> response
```

Every meaningful player action should insert a `player_events` record. This supports audit logs, anti-cheat review, newspaper generation, player history, and admin tools.

## Auth/session slice

The web app now uses database-backed first-party sessions.

- Passwords are hashed with Node `scrypt`.
- Login/register create a random session token.
- The browser receives the raw session token as an `httpOnly` cookie named `dd_session`.
- PostgreSQL stores only the SHA-256 hash of that token in `user_sessions`.
- API routes resolve the active user through `requireRequestUserId()`.
- Local development keeps an `x-user-id` fallback for API testing, but production does not.

Auth routes live in `apps/web/src/app/api/auth/*`.
Session helpers live in `apps/web/src/lib/auth.ts` and `apps/web/src/lib/server-session.ts`.

## Gameplay action pass

The first playable loop is now split across three layers:

- API routes validate ownership/session and delegate to DB query functions.
- `packages/db/src/queries/progression.ts` owns transactional training and education updates.
- `apps/worker/src/ticks/travel-tick.ts` completes due travel plans independently of page requests.

Current action resolution is intentionally simple for speed of development. Jobs, crimes, training, and education resolve immediately; travel is time-based and completed by the worker. The next architecture step is a generic action/cooldown table so these actions all use a common lock, timer, and anti-spam model.

## Action locks and cooldowns

Gameplay APIs should check `character_action_locks` inside the same transaction that mutates character state. Locks prevent duplicate submissions and give every major action a balancing lever. The current implementation uses per-character action types, so a job lock does not block market trading unless later design requires global busy states.

## Resource regeneration

Energy and nerve regeneration lives in `packages/game/src/resources.ts`. APIs refresh resources before spending them, while the worker periodically catches up idle characters. This avoids relying only on background ticks and keeps request-time state accurate.


## Hospital/Jail Status Flow

Failed crimes may set `characters.status` to `hospitalized` or `jailed`, write an active row to `hospital_stays` or `jail_sentences`, and set `status_until`/`status_reason` on the character. The worker status release tick completes due rows, sets the character back to `free`, and writes a release event.


## Faction and territory architecture

Factions are persistent social organizations with roles, bank balances, reputation, power, and member contribution points. All faction bank movements must write to `faction_ledger_entries`; no direct bank mutation should be added without ledger/audit records.

Territories are persistent world-control records. Territory actions mutate `territories.control_score` and `territories.controlled_by_faction_id`, write `territory_actions`, increase member contribution, and write public player events. The worker pays territory income into the faction bank through ledger entries.

Future faction systems should build on these primitives instead of creating parallel faction-bank or territory-control concepts.


## Player shop architecture

System markets and player shops are intentionally separate.

- `market_prices` represents location-level system liquidity.
- `shops` represents player-owned storefronts.
- `shop_listings` represents item lots listed by shop owners.
- `shop_ledger_entries` is the shop-level audit trail.
- `financial_transactions` remains the character-level money audit trail.
- `player_events` remains the activity stream used for moderation, analytics, and newspaper hooks.

Purchases should always update buyer cash, seller cash, listing quantity, buyer inventory, shop reputation, shop ledger, financial transactions, and player events inside one database transaction.

## Newspaper architecture

The newspaper is stored in `newspaper_articles`, not only generated from event logs. Articles can be system-generated or player-submitted. Event logs can still be used later for automatic summaries, weekly recaps, faction war reports, arrest records, market rumors, and editorials.


## Finance market architecture

Finance assets are fictional in-game stocks and crypto tokens. PostgreSQL stores the asset catalog, price history, positions, and orders. The worker owns price ticks through `tickAssetPrices`, while the web app only reads latest prices and posts validated buy/sell actions. Player-facing trades write `asset_orders`, `financial_transactions`, and `player_events` for auditability.


## Gambling/casino actions

Casino actions are resolved through the shared game package and persisted through `gambling_wagers`, `financial_transactions`, and `player_events`. Large wins can emit public newspaper articles. This keeps gambling auditable, tunable, and visible to the wider game world without embedding odds directly in the UI.


## Contracts architecture

Contracts are implemented as a player-generated task economy. The `contracts` table stores the lifecycle state and escrow, while `contract_events` acts as the immutable ledger for creation, acceptance, completion, cancellation, and expiry. Posting a contract deducts reward escrow plus a posting fee from the creator. Completion pays the escrow to the assigned player. Cancellation and expiry refund only open contract escrow to the creator.

The worker owns expiry processing so stale work does not remain on the public board forever. Future faction-funded contracts should debit and credit `faction_ledger_entries` rather than character cash.


## Progression and retention layer

Feature pass 11 adds achievements, titles, and recurring objectives. Objective progress is derived from canonical gameplay tables and events where possible, so feature endpoints do not need to duplicate counter-update logic. Claim actions are explicit because they grant cash, experience, and title rewards.


## Season and prestige architecture

Seasons are implemented as durable state rather than temporary UI. `seasons` defines the active arc, `season_reward_tiers` defines rewards, and `character_season_progress` stores per-character points and claimed tiers. Prestige writes a permanent `legacy_records` snapshot before resetting the active character state, then grants `legacy_perks` that can be used by later systems.

Season points are currently derived from character level, experience, net worth, profile score, achievement points, objective points, and reputation signals. Future systems should add to this calculation through shared game formulas rather than hard-coded route logic.


## Admin operations and balance control

Feature pass 13 adds an operational layer separate from the normal player game loop. Admin actions are intentionally routed through dedicated `/api/admin/*` endpoints and persisted to `admin_action_logs` so moderation and economy adjustments remain auditable.

Balance configuration is stored in `game_config_entries` as JSON. This allows future worker ticks and formula modules to read tuning values without requiring a schema migration for every multiplier or threshold.

System announcements are stored separately from player newspaper articles. Announcements are operational messages from staff; newspaper articles are in-world content and player/player-event media.


## Equipment layer

Gear is modeled as inventory-backed equipment records. Item definitions define the slot, max durability, and JSON stat modifiers. `character_equipment` records which item is equipped in each slot and tracks durability. Shared formulas in `packages/game/src/equipment.ts` normalize modifiers, scale them by durability, and calculate repair costs. Combat now reads equipped modifiers before resolving PvP power, while future passes can reuse the same modifier summary for crimes, travel, markets, and faction actions.


## Vehicle and travel logistics layer

Vehicles are modeled as equipment in the `vehicle` slot, with additional installed upgrades stored separately. Travel plans persist effective cost, duration, risk score, cargo value, and the vehicle used so worker outcomes and future audits can reason from immutable trip data.


## Crafting and workshops

Crafting and workshop actions are handled through `packages/game/src/crafting.ts`, `packages/db/src/queries/crafting.ts`, and `/api/crafting`. Recipes define inputs, output item, workshop type, duration, energy cost, cash cost, and risk. Crafting jobs are queued in the database and completed by the worker through `crafting-tick`, keeping production asynchronous and auditable.


## Contacts and crews

Contacts are owned NPC helpers tied to a character. They are not direct characters and should not bypass player action limits. The first implementation treats contacts as passive assignments resolved by the worker. Future passes can feed contact modifiers into travel, crime, legal, shop, faction, and market systems.


## Notification architecture

Player-facing notifications are separate from source-of-truth player events. Game systems continue to write `player_events`; the notifications worker converts important events into `notifications` and `activity_feed_entries`. This prevents gameplay code from needing to know every inbox/display concern while still giving players a central feed of completed travel, contracts, sales, combat, crew assignments, crafting jobs, faction events, and admin alerts.

## Messaging and social safety

Direct messaging is separate from public events and newspaper content. Message threads store participant state such as read timestamps, mute state, and soft-leave state. Blocking and reporting are explicit tables so moderation can reason about social abuse without mutating message content immediately.

Message actions should always check ownership, active character state, block state, and active social mute enforcement before sending. Full message deletion/hiding should be implemented as a moderated state transition rather than a hard delete so auditability is preserved.

## Newspaper interaction layer

Newspaper articles support comments, reactions, and reports. Article reactions are per-character toggles; comments can notify authors; reports enter the admin moderation queue. Future newspaper pages should add archive/search/category views without changing the article storage model.

## Shop operations layer

Player shops now have operational controls beyond the original listing/purchase loop: owner close/reopen, listing cancellation, ads, reviews, and shop restrictions. Shop owner mutations should continue to check ownership, active listing state, shop status, and admin shop restrictions before changing inventory or money.

## Admin moderation and enforcement

Moderation is a two-step model:

1. Reports are reviewed and resolved through the moderation queue.
2. Enforcement is applied, appealed, expired, or lifted through enforcement records.

This separation keeps report history intact and allows enforcement to apply across systems such as messaging, shops, and temporary suspension. All admin enforcement decisions should write admin audit logs and notify affected players where appropriate.

## Live notification and message streams

The current live updates use authenticated Server-Sent Events endpoints that periodically emit compact snapshots. This is suitable for local development and early testing. Production scale should replace polling-style snapshots with Redis or PostgreSQL-backed fan-out so the system does not query too aggressively for every connected client.

Current live endpoints:

- `GET /api/notifications/stream`
- `GET /api/messages/stream?characterId=<characterId>`

Browser notifications are opt-in through the standard browser permission API and should remain advisory UI only. Gameplay state must still be read from the server.

## Notification preferences

Notification preferences are character-scoped. Muted categories suppress event-generated notifications, and digest settings control worker-generated summaries. Future per-device preferences should not replace character preferences; they should layer on top for delivery-channel choices such as browser, email, or mobile push.

## Current hardening priorities

The architecture already assumes stronger guarantees than the early implementation consistently enforces. The next hardening passes should focus on:

- database transactions for all money and inventory mutation flows
- idempotency keys for retry-safe actions
- pagination on all list endpoints
- route-level rate limits
- environment validation
- worker idempotency and retry/dead-letter handling
- tests for formula modules and representative route handlers
