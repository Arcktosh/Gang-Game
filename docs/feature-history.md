# Feature History

This file consolidates the historical implementation notes that previously lived in many `feature-pass-XX.md` files. It is an audit trail, not the current planning source of truth. Start with `docs/README.md`, `docs/current-state.md`, and `docs/next-task-brief.md` for current work.

## Quick index

- Pass 02: Feature Pass 02 - Core Gameplay Actions
- Pass 03: Feature Pass 03: Cooldowns, Regeneration, and Market Trading
- Pass 04: Feature Pass 04 - Hospital and Jail Risk Layer
- Pass 05: Feature Pass 05 - Police Heat, Legal Services, and Recovery Management
- Pass 06: Feature Pass 06 — Factions, Territory, and Social Progression
- Pass 07: Feature Pass 07 - Shops and Newspaper
- Pass 08: Feature Pass 08 — Fictional Stocks & Crypto
- Pass 09: Feature Pass 09 - Gambling and Casino Loop
- Pass 10: Feature Pass 10 - Contracts and Player Tasks
- Pass 11: Feature Pass 11 — Achievements, Titles, Objectives, and Profile Progression
- Pass 12: Feature Pass 12: Seasons, Prestige, and Legacy
- Pass 13: Feature Pass 13 - Admin operations and balance control
- Pass 14: Feature Pass 14 - PvP, bounties, and faction war groundwork
- Pass 15: Feature Pass 15 — Gear, Equipment, Durability, and Stat Modifiers
- Pass 16: Feature Pass 16 - Vehicles, travel upgrades, and smuggling capacity
- Pass 17: Feature Pass 17 - Crafting, Workshops, and Item Modification
- Pass 18: Feature Pass 18 — Contacts, NPC Crews, and Passive Assignments
- Pass 19: Feature Pass 19 - Notifications, Activity Feed, and Digest Groundwork
- Pass 20: Feature Pass 20 - Messaging and Social Safety Foundation
- Pass 21: Feature Pass 21 - Newspaper Interaction Layer
- Pass 22: Feature Pass 22 - Player Shop Operations Layer
- Pass 23: Feature Pass 23 - Admin Moderation Queue
- Pass 24: Feature Pass 24 - Enforcement and Appeals Layer
- Pass 25: Feature Pass 25 - Enforcement Operations and Admin Search
- Pass 26: Feature Pass 26 - Live Notification Stream
- Pass 27: Feature Pass 27 - Live Messages and Browser Alert UX
- Pass 28: Feature Pass 28 - Notification Preferences and Filter Controls
- Pass 30: Feature Pass 30 - MVP Hardening 1: Environment, Pagination, and Rate Limits
- Pass 31: Feature Pass 31 - MVP Hardening 2: Idempotency and Retry Safety
- Pass 32: Feature Pass 32 - MVP Hardening 3: Transaction Consistency
- Pass 33: Feature Pass 33 - MVP Hardening 4: Test Foundation
- Pass 34: Feature Pass 34 - MVP Hardening 5: Web Helper and Validator Test Coverage
- Pass 35: Feature Pass 35 - MVP Hardening 6: Browser Security Boundary
- Pass 36: Feature Pass 36 - MVP Hardening 7: Request Observability and Runtime Diagnostics
- Pass 37: Feature Pass 37 - MVP Hardening 8: Economic Mutation Safety
- Pass 38: Feature Pass 38 - MVP Hardening 9: Hardening Completion and Operational Guardrails
- Pass 39: Feature Pass 39 - Validation Readiness and Hardening Audit Tooling
- Pass 40: Feature Pass 40 - Validation Audit Remediation and Static Check Execution
- Pass 41: Feature Pass 41 - Runtime Smoke Validation Harness
- Pass 42: Feature Pass 42 - Documentation Cleanup and Drift Validation
- Pass 43: Feature Pass 43 - CI Workflow and Drift Validation
- Pass 44: Feature Pass 44 - API Observability Expansion and Audit Enforcement
- Pass 45: Feature Pass 45 - Complete API Observability Coverage
- Pass 46: Feature Pass 46 - Representative Route Contracts and Guard Tightening
- Pass 47: Feature Pass 47 - MVP Player Pages and Page Coverage Gate
- Pass 48: Feature Pass 48 - MVP Progression Loop Completion
- Pass 49: Feature Pass 49 - Admin RBAC and Capability Gate
- Pass 50: Feature Pass 50 - Job Lifecycle MVP Completion
- Pass 51: Feature Pass 51 - Legal and Hospital Recovery MVP Completion
- Pass 52: Feature Pass 52 - MVP Release Runbook and Backup Readiness
- Pass 53: Feature Pass 53 - MVP Acceptance Gate and Root Script Alignment
- Pass 54: Feature Pass 54 - Runtime Proof Orchestration
- Pass 55: Feature Pass 55 - Integration Test Readiness
- Pass 56: Feature Pass 56 - Monetization Foundation
- Pass 57: Feature Pass 57 - Playable MVP Action Forms
- Pass 58: Feature Pass 58 - Admin Operations UI Coverage
- Pass 59: Feature Pass 59 - Public Launch Polish
- Pass 60: Feature Pass 60 - Site Quality: Accessibility, Responsive Design, PWA, and SEO
- Pass 61: Feature Pass 61 - In-Progress Task Closure: Messages Page Completion
- Pass 62: Feature Pass 62 - In-Progress Task Closure: Shops, Newspaper, Profile, and Admin Visibility
- Pass 63: Feature Pass 63 - Account recovery and verification
- Pass 64: Feature Pass 64 - Documentation Retrieval Refactor
- Pass 65: Feature Pass 65 - TypeScript 6 Config Compatibility
- Pass 66: Feature Pass 66 - Docker Compose Registry Resilience
- Pass 67: Feature Pass 67 - Player Banking and Finance History
- Pass 68: Feature Pass 68 - Bank History and Finance Chart UI
- Pass 69: Feature Pass 69 - Money Sink Catalog and Dashboard Controls
- Pass 70: Feature Pass 70 - Character Loans and Bank Repayment
- Pass 71: Feature Pass 71 - Loan Overdue and Default Handling
- Pass 72: Feature Pass 72 - Partial Loan Repayment Controls
- Pass 73: Feature Pass 73 - Admin Loan Exposure Visibility

- Pass 74: Documentation File Count Consolidation

---

## Pass 02: Feature Pass 02 - Core Gameplay Actions

This pass adds the first playable action loop after authentication.

## Added

- Training catalog and training completion API.
- Education/course catalog and course completion API.
- Progression migration with starter training activities and courses.
- Character overview API combining character, event history, inventory, active travel, faction membership, and recent progression.
- Character inventory API.
- Market read API for location-specific prices.
- Dashboard action cards for jobs, crimes, travel, training, and education.
- Worker travel tick to complete due travel plans and return characters to `free` status at destination.

## Still simplified

- Jobs, training, education, and crimes complete immediately.
- Travel uses a worker tick, but no travel risk event is resolved yet.
- Courses do not yet enforce one-time completion or prerequisites.
- Training does not yet use cooldowns, fatigue scaling, or diminishing returns.
- Market API is read-only and does not yet support buy/sell actions.

## Next recommended pass

1. Add a generic action cooldown/lock system.
2. Add energy/nerve regeneration worker tick.
3. Add market buy/sell endpoints with inventory updates.
4. Add bank deposit/withdraw endpoints.
5. Add event history UI on dashboard.

---

## Pass 03: Feature Pass 03: Cooldowns, Regeneration, and Market Trading

This pass adds the first durable game-loop controls around player actions.

## Added

### Action locks / cooldowns

A new `character_action_locks` table prevents repeated spam-clicking of high-value actions.

Covered action types:

- `job`
- `crime`
- `training`
- `education`
- `travel`
- `market_buy`
- `market_sell`

The lock stores:

- character
- action type
- locked-until timestamp
- metadata payload

Routes now return HTTP `429` with `cooldown_active` when a matching lock is still active.

### Resource regeneration

Characters now have:

- `max_energy`
- `max_nerve`
- `last_resource_tick_at`

Energy and nerve regenerate from shared formulas in `packages/game/src/resources.ts`.

Regeneration is applied in two places:

1. Before action execution inside gameplay transactions.
2. Periodically by the worker `resource-tick`.

### Market buy/sell

The `/api/market` route now supports:

- `GET /api/market?location=starter-city`
- `POST /api/market` with `{ action: 'buy' | 'sell', characterId, itemKey, quantity }`

Buying:

- checks character ownership
- checks free character status
- checks cooldown
- checks market supply
- checks cash balance
- adds inventory
- reduces cash
- writes financial transaction
- writes player event
- writes a new market price row

Selling:

- checks inventory
- pays 85% of market price
- reduces inventory
- increases cash
- writes financial transaction
- writes player event
- writes a new market price row

### Dashboard additions

The dashboard now shows:

- energy and max energy
- nerve and max nerve
- local market prices
- owned inventory quantity per market item
- Buy 1 / Sell 1 buttons

### Worker additions

The worker now starts:

- market tick placeholder
- resource regeneration tick
- travel completion tick

## Migration

Apply the new migration after previous migrations:

```bash
pnpm db:apply:gameplay
```

Fresh local setup now uses:

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:apply:progression
pnpm db:seed
pnpm db:apply:gameplay
```

## Notes

The market currently uses simple local supply/demand adjustments. This is intentionally conservative so later faction territory, police pressure, events, and shop activity can feed into the price simulation.

---

## Pass 04: Feature Pass 04 - Hospital and Jail Risk Layer

This pass makes failed crimes materially risky and adds the first unavailable-character loop.

## Added

- New migration: `packages/db/drizzle/0005_jail_hospital.sql`
- New character fields:
  - `status_until`
  - `status_reason`
- New tables:
  - `hospital_stays`
  - `jail_sentences`
- New game formulas:
  - `calculateFailedCrimeConsequence`
- New DB status queries:
  - `getActiveHospitalStay`
  - `getActiveJailSentence`
  - `getCharacterStatusDetail`
- New API route:
  - `GET /api/characters/[characterId]/status`
- Worker tick:
  - releases recovered hospital patients
  - releases completed jail sentences
  - writes release events
- Dashboard:
  - displays blocked status, reason, and release/recovery time
  - disables actions while hospitalized, jailed, or traveling

## Crime consequences

Failed crimes may now result in:

- no major consequence
- hospital stay
- jail sentence

The consequence calculation currently uses:

- current heat
- crime jail risk
- crime difficulty
- character endurance
- character defense

## Worker behavior

The worker now runs:

- market tick placeholder
- resource regeneration tick
- travel completion tick
- status release tick

Run it with:

```bash
pnpm dev:worker
```

## Migration

Apply this pass after gameplay migration:

```bash
pnpm db:apply:risk
```

For a fresh database, use:

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:apply:progression
pnpm db:seed
pnpm db:apply:gameplay
pnpm db:apply:risk
```

## Next recommended pass

Add police heat and legal systems:

- heat decay
- lawyers
- bribes
- bail
- court outcomes
- probation
- asset seizure
- faction rescue mechanics

---

## Pass 05: Feature Pass 05 - Police Heat, Legal Services, and Recovery Management

This pass adds the first legal-management layer on top of failed-crime jail/hospital outcomes.

## Added

- `characters.last_heat_tick_at`
- `characters.legal_reputation`
- `legal_service_logs`
- `moderation_notes`
- Heat decay formula in `packages/game/src/legal.ts`
- Bribe formula in `packages/game/src/legal.ts`
- Lawyer formula in `packages/game/src/legal.ts`
- Hospital-care formula in `packages/game/src/legal.ts`
- `packages/db/src/queries/legal.ts`
- Heat decay worker tick

## New API endpoints

- `GET /api/legal/status?characterId=<uuid>`
- `POST /api/legal/lawyer`
- `POST /api/legal/bribe`
- `POST /api/hospital/care`
- `GET /api/admin/audit`

## Legal services

Lawyers reduce heat and can shorten active jail sentences.

Available tiers:

- `public` - low cost, small reduction
- `street` - medium cost, stronger reduction
- `firm` - high cost, strongest reduction

Bribes can reduce heat, but failed bribes increase heat and are protected by a cooldown.

## Hospital care

Hospitalized characters can buy faster treatment. Higher-tier care improves health and reduces recovery time.

## Admin audit

The first admin-only audit endpoint returns recent player events and moderation notes. This is intended as the base for moderation tooling, anti-cheat review, and support workflows.

## Next recommended pass

Add shops/listings and player-to-player marketplace transactions, then add faction bank/roles/territory primitives.

---

## Pass 06: Feature Pass 06 — Factions, Territory, and Social Progression

This pass introduces the first persistent group-competition layer. Players can now join or create factions, pool money in a faction bank, build contribution points, and interact with territory control.

## Added systems

### Faction progression

- Factions now track `power` in addition to bank and reputation.
- Faction members now track `contribution_points`.
- Faction membership roles remain hierarchical: recruit, runner, soldier, lieutenant, captain, underboss, boss.
- Boss-only role assignment API groundwork has been added.
- Underboss and boss roles can withdraw from the faction bank.

### Faction bank and ledger

New table: `faction_ledger_entries`.

Every faction bank movement is recorded with:

- faction ID
- character ID
- entry type
- amount
- balance after movement
- description
- metadata
- timestamp

Supported API actions:

- deposit character cash into faction bank
- withdraw faction cash into character cash, permission-gated by role

### Territories

New table: `territories`.

Territories include:

- location
- income per tick
- defense rating
- heat modifier
- controlling faction
- control score
- contested-until timestamp

Seeded starter territories:

- Starter City Docks
- Old Market
- East Warehouse Row
- North Transit Hub

### Territory actions

New table: `territory_actions`.

Supported actions:

- `scout` — low-cost information/action history groundwork
- `claim` — claim an uncontrolled territory
- `reinforce` — increase control score for owned territory
- `attack` — reduce enemy control score and capture if reduced to zero

Territory actions consume cash, apply cooldowns, increase member contribution, increase faction power, and write public player events.

### Worker update

New worker tick:

- `territory-income-tick`

Controlled territories periodically pay income into the controlling faction bank and create ledger entries.

## Added APIs

- `GET /api/territories`
- `POST /api/territories/actions`
- `POST /api/factions/[factionId]/bank`
- `POST /api/factions/[factionId]/leave`
- `PATCH /api/factions/[factionId]/members`

Existing APIs updated:

- `GET /api/factions` now returns factions with active member counts.

## Dashboard additions

The dashboard now includes:

- create faction form
- join faction buttons
- faction bank overview
- role, faction power, and contribution display
- deposit/withdraw faction bank buttons
- recent ledger display
- territory cards
- scout, claim, reinforce, and attack buttons

## Fresh setup addition

Run this after the previous migrations:

```bash
pnpm db:apply:factions
```

Full fresh local setup now includes:

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:apply:progression
pnpm db:seed
pnpm db:apply:gameplay
pnpm db:apply:risk
pnpm db:apply:legal
pnpm db:apply:factions
pnpm dev
```

Worker:

```bash
pnpm dev:worker
```

## Next recommended pass

Add player shops and listings on top of inventory and market trading:

1. create shop
2. list inventory item for sale
3. browse player shops by location
4. buy from another player
5. transfer cash to seller
6. create shop reputation and sales ledger
7. let factions tax shops inside controlled territory

---

## Pass 07: Feature Pass 07 - Shops and Newspaper

This pass adds the first player-to-player economy surface and a lightweight newspaper/blog surface.

## Added

- Player shops can be opened by characters.
- Shop listings can be created from character inventory.
- Other players can buy active shop listings.
- Shop sales move cash between buyer and seller.
- Shop sales write financial transactions, player events, and shop ledger entries.
- Shops gain reputation when sales complete.
- Listing limits scale with shop reputation.
- Large shop sales can auto-publish a newspaper article.
- Players can submit simple newspaper/blog articles.
- Seed newspaper content is included for new databases.

## New migration

- `packages/db/drizzle/0008_shops_newspaper.sql`

## New tables

- `shop_ledger_entries`
- `newspaper_articles`

## Updated tables

- `shops`
  - `description`
  - `is_open`
  - `updated_at`

- `shop_listings`
  - `sold_quantity`
  - `updated_at`

## New APIs

- `GET /api/shops?location=<location>`
- `POST /api/shops`
- `POST /api/shops/listings`
- `POST /api/shops/purchase`
- `GET /api/newspaper`
- `POST /api/newspaper`

## Dashboard additions

- Open a player shop.
- Create simple listings from owned inventory.
- Buy from local player shop listings.
- Read recent newspaper items.
- Submit player-written newspaper/blog content.

## Design notes

Player shops are separate from the location market. The market remains system-driven; shops are player-driven. This allows future work such as faction shop taxes, territory trade bonuses, shop raids, advertising, supplier contracts, and auction mechanics.

The newspaper is deliberately stored as structured content rather than only derived from events. This allows both system-generated articles and player-written posts.

---

## Pass 08: Feature Pass 08 — Fictional Stocks & Crypto

This pass adds the first long-term financial speculation loop.

## Added

- Fictional stock and crypto assets.
- Latest-price market view.
- Character portfolios.
- Buy/sell finance API.
- Asset order history.
- Trade fees.
- Realized and unrealized profit tracking.
- Worker-driven price ticks.
- Dashboard panel for stocks, crypto, portfolio, and last order.

## New DB migration

- `packages/db/drizzle/0009_finance_markets.sql`

## New tables

- `financial_assets`
- `asset_prices`
- `character_asset_positions`
- `asset_orders`

## New API

- `GET /api/finance?characterId=<uuid>`
- `POST /api/finance`

Example trade body:

```json
{
  "characterId": "character-uuid",
  "assetKey": "stock-safeport-logistics",
  "side": "buy",
  "quantity": 1
}
```

## Worker

The worker now starts `finance-tick`, which inserts new asset prices on an interval. Prices are intentionally fictional and formula-driven, not linked to real markets.

## Design notes

- Stocks and crypto use cash only for now.
- The system writes asset orders, financial transactions, and player events.
- The implementation is intentionally simple so later passes can connect price movement to faction wars, police pressure, hospital demand, logistics demand, rumors, and newspaper stories.

---

## Pass 09: Feature Pass 09 - Gambling and Casino Loop

This pass adds a first casino system that acts as both a recurring money sink and a high-risk/high-reward activity.

## Added database objects

- `characters.gambling_reputation`
- `gambling_games`
- `gambling_wagers`

Seeded games:

- Basement Slots
- Dice Low
- Dice High
- Backroom Blackjack

## Added game logic

- `packages/game/src/gambling.ts`
- wager resolution formulas
- table-limit calculation
- wager cooldown calculation
- outcome labels and payout multipliers

The games are intentionally fictional and simplified so odds can be tuned without recreating real casino systems in detail.

## Added DB/query logic

- `packages/db/src/queries/gambling.ts`
- active game listing
- wager placement
- wager history
- gambling summary
- cash update and financial transaction logging
- public player event and newspaper article generation for large wins

## Added API

```txt
GET  /api/gambling?characterId=<uuid>
POST /api/gambling
```

Example wager:

```json
{
  "characterId": "character-uuid",
  "gameKey": "dice-low",
  "wager": 50
}
```

## Dashboard changes

The dashboard now includes a Casino panel showing:

- available games
- min/max wager range
- current table limit
- lifetime profit
- wager count
- recent wager history
- quick wager buttons

## Design notes

- Gambling is blocked when a character is jailed, hospitalized, or traveling.
- Wagers use the shared action-lock system with a wager-size-based cooldown.
- Table limits scale with character level, gambling reputation, and available cash.
- Large wins create public newspaper content to make the world feel active.

---

## Pass 10: Feature Pass 10 - Contracts and Player Tasks

This pass adds the first player-generated task economy. Players can post contracts, escrow rewards, accept open work from the board, complete accepted work, cancel open contracts, and allow the worker to expire stale contracts.

## Added systems

- Contract board with open contracts.
- Player-created contracts.
- Escrowed rewards and posting fees.
- Contract lifecycle: `open`, `accepted`, `completed`, `cancelled`, `expired`.
- Contract event ledger for auditability.
- Delivery requirements using target location and optional item quantity.
- Contract cooldowns using the existing action-lock system.
- Financial transactions for posting, completion, cancellation, and expiry.
- Newspaper articles for high-value posted/completed contracts.
- Worker tick for expired contracts and escrow refunds.

## New migration

```bash
pnpm db:apply:contracts
```

Migration file:

```txt
packages/db/drizzle/0011_contracts.sql
```

## New tables

- `contracts`
- `contract_events`

## New APIs

```txt
GET  /api/contracts?characterId=<uuid>
POST /api/contracts
POST /api/contracts/[contractId]/accept
POST /api/contracts/[contractId]/complete
POST /api/contracts/[contractId]/cancel
```

## Contract types

- `delivery`
- `protection`
- `collection`
- `bounty`
- `faction_task`

The current implementation fully enforces target-location checks and optional item delivery requirements. Protection, collection, bounty, and faction-task contracts are currently lightweight task contracts that require the assignee to be at the target location before completion.

## Dashboard changes

The dashboard now includes a Contracts panel with:

- create contract form
- open contract board
- accept contract action
- my contracts list
- complete accepted contract action
- cancel own open contract action

## Future improvements

- Faction-funded contracts from the faction bank.
- Private contracts assigned to a specific player.
- Multi-step contracts.
- Contract reputation and trust score.
- Dispute/arbitration system.
- Contract failure penalties.
- Protection contract timers.
- Bounty/PvP integration.
- Delivery route risk and interception.

---

## Pass 11: Feature Pass 11 — Achievements, Titles, Objectives, and Profile Progression

This pass adds the first retention layer that cuts across the existing game systems.

## Added

- Achievement definitions and per-character achievement progress.
- Claimable achievement rewards:
  - cash
  - experience
  - profile points
  - unlockable titles
- Character title inventory and active title selection.
- Daily and weekly objective definitions.
- Per-character recurring objective assignment by period.
- Claimable objective rewards.
- Profile summary with score, points, claimable rewards, completed achievements, and active title.

## New migration

```bash
pnpm db:apply:achievements
```

Migration file:

```txt
packages/db/drizzle/0012_achievements_objectives.sql
```

## New tables

- `achievement_definitions`
- `character_achievements`
- `character_titles`
- `objective_definitions`
- `character_objectives`

## New API routes

- `GET /api/profile?characterId=<uuid>`
- `POST /api/profile/achievements/[achievementKey]/claim`
- `POST /api/profile/objectives/[objectiveId]/claim`
- `POST /api/profile/titles/active`

## New shared logic

- `packages/game/src/achievements.ts`
- `packages/db/src/queries/achievements.ts`

## Seeded achievements

- First Steps
- Clocked In
- Street Starter
- Gym Regular
- Book Smart
- Street Trader
- Shopkeeper
- Reliable Runner
- Colors On
- Table Regular

## Seeded objectives

Daily:

- Work Three Shifts
- Take Three Chances
- Keep Sharp
- Move Product

Weekly:

- Runner Reputation
- Shop Momentum
- Casino Circuit
- Night School

## Dashboard additions

The dashboard now includes a Goals / Profile panel showing:

- profile score
- active title
- claimable achievements
- claimable daily/weekly objectives
- owned titles
- title equip/clear actions

## Notes

The objective system derives progress from existing gameplay tables and events instead of requiring every feature endpoint to manually update objective rows. This keeps it flexible while the game loop is still evolving.

---

## Pass 12: Feature Pass 12: Seasons, Prestige, and Legacy

This pass adds the first long-term retention framework: active seasons, seasonal reward tiers, character season progress, and legacy prestige resets.

## Added

### Database

New migration:

- `packages/db/drizzle/0013_seasons_prestige.sql`

New character fields:

- `prestige_level`
- `legacy_points`
- `season_points`

New tables:

- `seasons`
- `season_reward_tiers`
- `character_season_progress`
- `legacy_records`
- `legacy_perks`

Seeded first season:

- `season-001-street-founders`
- Season title: `Street Founders`
- Active period: 2026-07-01 to 2026-09-30

Seeded reward tiers:

1. Known Face
2. Corner Regular
3. City Operator
4. Underground Name
5. Street Founder

### Shared game logic

New module:

- `packages/game/src/seasons.ts`

Added helpers:

- `calculateSeasonPoints`
- `getSeasonRankBand`
- `calculatePrestigeReadiness`
- `calculateLegacyPoints`
- `calculatePrestigeReset`
- `getPrestigePerkKey`

### DB query layer

New module:

- `packages/db/src/queries/seasons.ts`

Added functions:

- `getSeasonProfile`
- `claimSeasonReward`
- `prestigeCharacter`

### API

New endpoints:

- `GET /api/seasons?characterId=<uuid>`
- `POST /api/seasons/rewards`
- `POST /api/prestige`

Season reward body:

```json
{
  "characterId": "character-uuid",
  "tier": 1
}
```

Prestige body:

```json
{
  "characterId": "character-uuid"
}
```

### Worker

New tick:

- `apps/worker/src/ticks/season-tick.ts`

Behavior:

- Marks active seasons as completed after their end date.

### Dashboard

Added Season / Legacy panel:

- active season name
- season rank band
- season points
- season end date
- season reward claim buttons
- prestige readiness requirements
- prestige action button
- legacy perks display

## Prestige behavior

Prestige is intentionally gated to prevent early accidental resets.

Current requirements scale by prestige level:

- required level: `10 + prestigeLevel * 2`
- required profile score: `1000 + prestigeLevel * 350`
- required net worth: `50000 + prestigeLevel * 25000`

When prestige is triggered:

- creates a `legacy_records` snapshot
- awards legacy points
- increments prestige level
- resets level, experience, cash, bank, heat, and status
- keeps a better starting cash/energy/nerve baseline based on total legacy points
- grants/updates a legacy perk
- writes a public `character_prestiged` event

## Fresh setup

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:apply:progression
pnpm db:seed
pnpm db:apply:gameplay
pnpm db:apply:risk
pnpm db:apply:legal
pnpm db:apply:factions
pnpm db:apply:shops
pnpm db:apply:finance
pnpm db:apply:gambling
pnpm db:apply:contracts
pnpm db:apply:achievements
pnpm db:apply:seasons
pnpm dev
```

Worker:

```bash
pnpm dev:worker
```

## Next recommended pass

Add notifications and message improvements:

- notification inbox
- unread counts
- event-driven notifications for sales, contracts, attacks, season rewards, jail/hospital release, and faction activity
- richer direct/group/faction messaging

---

## Pass 13: Feature Pass 13 - Admin operations and balance control

This pass adds the operational layer needed before deeper PvP, raids, faction wars, and economy scaling.

## Added

- Admin operations console at `/admin`.
- Public announcement feed at `GET /api/announcements`.
- Admin announcement management at `GET/POST /api/admin/announcements`.
- Game balance configuration at `GET/PATCH /api/admin/config`.
- Character moderation flags.
- Admin balance adjustments for cash and bank.
- Admin status clearing for stuck jailed/hospitalized/traveling characters.
- Extended admin audit logs.
- Active flags included in audit responses.
- Dashboard announcement banner support.

## New database tables

- `game_config_entries`
- `admin_action_logs`
- `character_flags`
- `system_announcements`

## New enums

- `admin_action_type`
- `character_flag_type`
- `announcement_status`

## New API routes

```txt
GET    /api/announcements
GET    /api/admin/audit
GET    /api/admin/config
PATCH  /api/admin/config
GET    /api/admin/announcements
POST   /api/admin/announcements
POST   /api/admin/characters/[characterId]/flag
POST   /api/admin/characters/[characterId]/adjust
POST   /api/admin/characters/[characterId]/clear-status
POST   /api/admin/flags/[flagId]/resolve
```

## Admin console

The `/admin` page allows admins to:

- review config entries;
- create or update config entries;
- publish announcements;
- flag characters;
- adjust cash/bank balances;
- review active flags;
- review admin action logs.

## Balance configuration

Seeded config keys:

- `economy.global`
- `risk.police`
- `progression.training`
- `pvp.factions`

These are intentionally stored as JSON so the workers and game formulas can later consume them without schema changes for every tuning value.

## Notes

This pass does not yet wire every existing formula to `game_config_entries`. The data and API foundation is now present, and future passes can progressively load config values into economy, crime, progression, faction, and worker calculations.

---

## Pass 14: Feature Pass 14 - PvP, bounties, and faction war groundwork

This pass adds the first controlled competitive loop on top of factions, territory, hospital status, newspaper, and admin balance controls.

## Added

- PvP combat logs with attacker/defender power, damage, cash stolen, heat gain, and XP awards.
- Bounty board with escrowed rewards, posting fees, expiry, cancellation, and automatic claims when a target is defeated.
- Faction war declarations between factions, optional territory targets, score tracking, and worker-based resolution.
- Public player events and newspaper articles for major attacks, bounty posts, and faction wars.
- Dashboard PvP panel with local targets, bounty posting, open bounties, war declaration, and active war summaries.

## New migration

```bash
pnpm db:apply:pvp
```

## New API surfaces

- `GET /api/pvp?characterId=<uuid>`
- `POST /api/pvp/attack`
- `GET /api/bounties?characterId=<uuid>`
- `POST /api/bounties`
- `POST /api/bounties/[bountyId]/cancel`
- `GET /api/faction-wars?characterId=<uuid>`
- `POST /api/faction-wars`

## Worker behavior

- Expired bounties refund their escrow to the creator.
- Ended active faction wars resolve to the higher-score faction.
- Territory ownership transfers to the winner when the war was declared for a specific territory.

## Notes

This is intentionally a controlled first pass. Future passes can add defensive gear, safehouse protection, ambushes, faction raid windows, war chat, formal treaties, and deeper combat itemization.

---

## Pass 15: Feature Pass 15 — Gear, Equipment, Durability, and Stat Modifiers

This pass adds the first equipment system so items can affect character capability rather than only existing as inventory/market records.

## Added

- Equippable item fields on `item_definitions`:
  - `equip_slot`
  - `max_durability`
  - `stat_modifiers`
- New table:
  - `character_equipment`
- New shared game logic:
  - `packages/game/src/equipment.ts`
  - modifier normalization
  - modifier combining
  - durability-scaled modifiers
  - repair cost calculation
  - equipment slot labels
- New DB query module:
  - `packages/db/src/queries/equipment.ts`
- New API:
  - `GET /api/equipment?characterId=<uuid>`
  - `POST /api/equipment`

## Equipment actions

`POST /api/equipment` supports:

```json
{
  "action": "equip",
  "characterId": "character-uuid",
  "inventoryItemId": "inventory-item-uuid"
}
```

```json
{
  "action": "unequip",
  "characterId": "character-uuid",
  "slot": "weapon"
}
```

```json
{
  "action": "repair",
  "characterId": "character-uuid",
  "equipmentId": "equipment-uuid"
}
```

## Seeded gear

Updated starter gear:

- Rusty Knife — weapon
- Padded Jacket — armor

Added new gear:

- Burner Phone — phone
- Lockpick Set — tool
- Delivery Scooter — vehicle
- Weighted Chain — weapon
- Kevlar Vest — armor
- Encrypted Handset — phone

## Gameplay behavior

- Characters can equip one item per slot.
- Equipping a new item in a slot automatically unequips the previous item in that slot.
- Equipped items expose effective modifiers.
- Durability reduces modifier strength as equipment wears down.
- Equipment can be repaired for cash.
- PvP combat now includes equipment modifiers in combat power.
- PvP combat applies durability wear to attacker and defender gear.
- Equipment changes use the shared action-lock/cooldown system.

## Dashboard updates

The dashboard now includes a Gear / Equipment panel showing:

- equipped items
- durability
- repair costs
- available inventory gear
- effective stats
- active modifier summary
- equip, unequip, and repair actions

## Setup

Apply this pass with:

```bash
pnpm db:apply:equipment
```

---

## Pass 16: Feature Pass 16 - Vehicles, travel upgrades, and smuggling capacity

This pass adds the first dedicated vehicle layer on top of the equipment system.

## Added

- Vehicle upgrade definitions and installed vehicle upgrades.
- Equipped vehicles now provide travel speed, safety, heat-reduction, and cargo-capacity modifiers.
- Travel plans now store effective cost, effective duration, risk score, cargo value, and selected vehicle.
- Optional travel cargo support is modeled through `travel_cargo` for future smuggling/delivery contracts.
- Vehicle upgrades can be installed through `/api/vehicles`.
- Dashboard garage panel shows equipped vehicles, installed upgrades, and available upgrades.

## New API

- `GET /api/vehicles?characterId=<uuid>`
- `POST /api/vehicles`

Example body:

```json
{
  "action": "upgrade",
  "characterId": "character-uuid",
  "equipmentId": "equipped-vehicle-id",
  "upgradeKey": "hidden-compartment"
}
```

## Gameplay direction

Vehicles are now a strategic system rather than generic gear. Future passes can connect this to delivery contracts, smuggling missions, police checkpoints, vehicle impound, racing, and faction logistics.

---

## Pass 17: Feature Pass 17 - Crafting, Workshops, and Item Modification

This pass adds the first player-production loop. Players can now build workshops, upgrade them, consume materials, queue crafting jobs, and receive finished items through the worker tick.

## Added systems

- Crafting recipe definitions
- Character-owned workshops
- Workshop upgrades
- Queued crafting jobs
- Crafting job input ledger
- Crafting completion worker tick
- Crafting dashboard panel
- Crafting API
- Starter materials and crafted items

## New database migration

- `packages/db/drizzle/0018_crafting_workshops.sql`

## New tables

- `crafting_recipe_definitions`
- `character_workshops`
- `crafting_jobs`
- `crafting_job_inputs`

## New enums

- `crafting_recipe_type`
- `crafting_job_status`
- `workshop_type`

## New shared game logic

- `packages/game/src/crafting.ts`

The crafting logic includes:

- input normalization
- workshop build cost calculation
- workshop upgrade cost calculation
- crafting duration calculation
- crafting risk calculation
- crafting cooldown calculation
- recipe start eligibility checks

## New DB query module

- `packages/db/src/queries/crafting.ts`

## New API

- `GET /api/crafting?characterId=<uuid>`
- `POST /api/crafting`

Supported POST actions:

```json
{
  "action": "build_workshop",
  "characterId": "character-uuid",
  "workshopType": "garage",
  "name": "Back Alley Garage"
}
```

```json
{
  "action": "upgrade_workshop",
  "characterId": "character-uuid",
  "workshopId": "workshop-uuid"
}
```

```json
{
  "action": "start_recipe",
  "characterId": "character-uuid",
  "recipeKey": "craft-improvised-tools",
  "workshopId": "workshop-uuid"
}
```

## Worker update

- Added `apps/worker/src/ticks/crafting-tick.ts`
- Worker completes ready crafting jobs every minute.
- Completed jobs add the output item to inventory and write a player event.

## Seeded materials

- Scrap Metal
- Electronic Parts
- Medical Supplies
- Reinforced Plates

## Seeded crafted items

- Field Medkit
- Improvised Tools
- Signal Jammer

## Seeded recipes

- Build Improvised Tools
- Assemble Field Medkit
- Cut Reinforced Plates
- Wire Signal Jammer
- Refurbish Burner Phone
- Patch Kevlar Vest

## Gameplay notes

Crafting creates a new long-term economy layer. Players can now specialize as suppliers, workshop owners, modders, or repair-focused support players. Later passes can connect this system to raids, faction armories, vehicle tuning, consumables, and shop specialization.

---

## Pass 18: Feature Pass 18 — Contacts, NPC Crews, and Passive Assignments

This pass adds the first NPC/crew-retention layer. Players can recruit contacts, improve loyalty, assign them to passive work, and collect results when the worker completes the assignment.

## Added

- NPC contact definitions seeded by migration.
- Player-owned contacts with level, experience, loyalty, upkeep, and status.
- Passive contact assignments with queued/completed/failed states.
- Contact assignment worker tick.
- Contacts API and dashboard panel.

## Gameplay loops

- Recruit contacts once the character meets level and cash requirements.
- Assign idle contacts to support work:
  - job assist
  - crime setup
  - shop shift
  - territory scout
  - market tip
  - recovery support
- Assignments complete asynchronously through the worker.
- Successful assignments pay cash, grant contact experience, and increase loyalty.
- Failed assignments reduce loyalty and can eventually make contacts inactive.
- Upkeep payments restore loyalty and reactivate inactive contacts.

## New API

```txt
GET /api/contacts?characterId=<uuid>
POST /api/contacts
```

Example recruit request:

```json
{
  "action": "recruit",
  "characterId": "character-uuid",
  "contactKey": "driver-rico"
}
```

Example assignment request:

```json
{
  "action": "assign",
  "characterId": "character-uuid",
  "contactId": "contact-uuid",
  "assignmentType": "market_tip"
}
```

## New DB objects

- `npc_contact_definitions`
- `character_contacts`
- `contact_assignments`
- `contact_specialty`
- `contact_status`
- `contact_assignment_type`
- `contact_assignment_status`

## Worker

The worker now runs `contacts-tick`, which completes ready assignments and applies rewards, loyalty changes, experience, and player events.

---

## Pass 19: Feature Pass 19 - Notifications, Activity Feed, and Digest Groundwork

This pass adds a central player notification layer so every long-running system can surface results in one place instead of leaving players to hunt through separate panels.

## Added

- Notification center data model
- Character-scoped notifications
- Public/private activity feed entries
- Notification preferences
- Digest history groundwork
- Worker-generated notifications from recent player events
- Dashboard inbox/activity panel

## New database objects

- `notification_category` enum
- `notification_priority` enum
- `activity_feed_scope` enum
- `notifications`
- `activity_feed_entries`
- `notification_preferences`
- `notification_digests`

## New API

### `GET /api/notifications?characterId=<uuid>`

Returns:

- unread count
- high-priority count
- recent notifications
- unread notifications
- activity feed entries
- preferences
- recent digests

### `POST /api/notifications`

Supported actions:

- `mark_read`
- `archive`
- `mark_all_read`
- `archive_read`
- `preferences`

## Worker behavior

The new `notifications-tick` worker scans recent `player_events` and creates matching notifications and activity feed entries.

Examples:

- travel completion
- hospital release
- jail release
- contract completion
- shop sales
- crafting completion
- crew assignment outcomes
- bounty claims
- faction war events

The worker also includes daily digest groundwork through `notification_digests`.

## Dashboard behavior

The dashboard now includes an **Inbox / Activity** panel showing:

- unread alert count
- high-priority alert count
- unread notification cards
- recent activity feed
- recent digest summaries
- mark all read action
- archive read action

## Design notes

Notifications are intentionally separate from `player_events`:

- `player_events` remain the audit/event source of truth.
- `notifications` are player-facing inbox items.
- `activity_feed_entries` are presentation-ready timeline records.
- digests can later be emailed, messaged, or displayed on login.

This gives the game a scalable communication layer for future wars, raids, auctions, seasonal events, faction diplomacy, and moderation notices.

---

## Pass 20: Feature Pass 20 - Messaging and Social Safety Foundation

This pass expands the early messaging endpoint into a playable social layer with inbox state, read tracking, blocking, reporting, and dashboard controls.

## Added

- Character message center query
- Direct-message thread summaries
- Recent message previews per thread
- Thread unread counts and total unread count
- Per-thread read tracking
- Thread mute/unmute
- Soft leave for message threads
- Character blocking and unblocking
- Message reporting groundwork for moderation
- Recipient notifications for new messages
- Dashboard **Messages / Social** panel

## New database objects

- `message_report_status` enum
- `message_reports`
- `character_blocks`

## Changed database objects

`message_thread_members` now includes:

- `last_read_at`
- `muted_at`
- `left_at`

These fields allow read receipts, muted conversations, and soft thread exits without deleting historical messages.

## New API behavior

### `GET /api/messages?characterId=<uuid>`

Returns:

- active message threads
- members per thread
- recent messages per thread
- per-thread unread counts
- total unread count
- possible direct-message recipients
- blocked characters
- recent reports submitted by the character

### `POST /api/messages`

Supported actions:

- `send`
- `mark_thread_read`
- `leave_thread`
- `mute_thread`
- `block`
- `unblock`
- `report`

## Dashboard behavior

The dashboard now includes a **Messages / Social** panel where players can:

- start a direct message
- reply to existing threads
- mark a thread as read
- mute or unmute a thread
- leave a thread
- report another player message
- unblock blocked characters

## Safety and moderation notes

Messages remain fictional in-game communication only. The moderation groundwork intentionally avoids automated punitive action for now: reports are stored for admin review and emit an admin-visible player event.

Blocking is enforced both directions for new direct-message threads so players cannot start fresh contact with characters that have blocked them or that they have blocked.

---

## Pass 21: Feature Pass 21 - Newspaper Interaction Layer

This pass turns the newspaper from a mostly read-only feed into a lightweight community surface with comments, reactions, reports, and richer dashboard context.

## Added

- Article comment table and query support
- Article reaction table with per-character toggles
- Article report table for moderation review
- Enriched newspaper center query with:
  - article author details
  - recent comments
  - reaction counts
  - current character reactions
  - current character reports
- Newspaper POST action dispatcher supporting:
  - `submit_article`
  - `comment`
  - `react`
  - `report`
- Comment notifications to article authors
- Admin-visible player event when an article is reported
- Dashboard newspaper controls for likes, insight reactions, comments, and reports

## New database objects

- `newspaper_article_comments`
- `newspaper_article_reactions`
- `newspaper_article_reports`

## New migration

- `packages/db/drizzle/0022_newspaper_social.sql`

## API behavior

### `GET /api/newspaper`

Returns published articles with social context when available:

- comments
- reaction counts
- author details
- current-character reaction/report state if a character is supplied

### `POST /api/newspaper`

Now accepts an explicit `action` field. The old article-submission body remains compatible and is treated as `submit_article`.

Supported action examples:

```json
{ "action": "comment", "characterId": "...", "articleId": "...", "body": "Good tip." }
```

```json
{ "action": "react", "characterId": "...", "articleId": "...", "reactionType": "like" }
```

```json
{ "action": "report", "characterId": "...", "articleId": "...", "reason": "Needs review." }
```

## Moderation notes

Reports do not automatically remove articles. They are stored for later admin review and create admin-visible events. This keeps moderation auditable and avoids destructive automated actions.

## Next recommended pass

Add a dedicated admin moderation queue that aggregates message reports and newspaper reports, with review, dismiss, actioned, and hidden-content controls.

---

## Pass 22: Feature Pass 22 - Player Shop Operations Layer

## Goal

Extend the player shop system beyond basic opening, listing, and purchasing by adding owner operations, ad visibility, review signals, and listing recovery. This gives Phase 11 a stronger management loop and safer inventory handling.

## Added

- Shop advertising support via `advertising_until` on shops.
- Shop aggregate rating fields: `rating_total` and `rating_count`.
- Shop reviews with one review per shop per character.
- Shop ad campaign ledger table.
- Owner action to close or reopen a shop.
- Owner action to cancel an active listing and return unsold inventory.
- Owner action to buy an ad campaign with cash.
- Customer action to review a shop.
- Sponsored shops are prioritized in local shop lists.
- Shop details now include average rating, ad state, recent reviews, and active ad campaigns.
- Dashboard controls for shop status, advertising, listing cancellation, and quick reviews.

## Migration

Added migration:

- `packages/db/drizzle/0023_shop_operations.sql`

This migration adds:

- `shops.advertising_until`
- `shops.rating_total`
- `shops.rating_count`
- `shop_reviews`
- `shop_ad_campaigns`

## API

Added:

- `POST /api/shops/actions`

Supported actions:

- `set_status`
- `cancel_listing`
- `advertise`
- `review`

Existing endpoints remain unchanged:

- `GET /api/shops`
- `POST /api/shops`
- `POST /api/shops/listings`
- `POST /api/shops/purchase`

## Gameplay notes

- Listing cancellation is owner-only and returns the remaining unsold quantity to inventory.
- Advertisements cost at least `$25`; each `$25` buys roughly one hour of sponsored placement, capped at 72 hours.
- Reviews are blocked for the shop owner.
- A repeated review updates the previous review and adjusts rating totals instead of creating duplicates.
- New reviews add a small reputation boost based on the rating.

## Safety / integrity notes

- All actions verify character ownership through the authenticated user.
- Shop actions are server-side validated with Zod discriminated unions.
- The quick dashboard review button is intentionally simple for the prototype; later UI should let players choose the rating and text.

## Not run

A TypeScript build was not run because dependencies are not installed in this uploaded project state.

---

## Pass 23: Feature Pass 23 - Admin Moderation Queue

## Goal

Close the loop on the social safety work added in the messaging and newspaper passes by giving admins a first-class moderation queue. Reports can now be reviewed, dismissed, or actioned from the admin console instead of remaining as raw database rows or admin-only player events.

## Added

- Admin moderation queue query for open message reports.
- Admin moderation queue query for open newspaper article reports.
- Report review metadata:
  - `reviewed_by_user_id`
  - `reviewed_at`
  - `resolution_note`
- Admin API to fetch moderation queues.
- Admin API to resolve individual reports.
- Admin console panel for:
  - message report review
  - article report review
  - dismissing reports
  - marking reports actioned
  - optionally unpublishing reported articles
- Moderation notes generated on report resolution.
- Admin audit log entries generated on every moderation resolution.

## Migration

Added migration:

- `packages/db/drizzle/0024_moderation_queue.sql`

This migration adds review metadata columns to:

- `message_reports`
- `newspaper_article_reports`

It also adds status/created-at indexes for moderation queue filtering.

## API

Added:

- `GET /api/admin/moderation`
- `POST /api/admin/moderation/reports/[reportId]`

`GET /api/admin/moderation` supports:

- `status=open|reviewed|dismissed|actioned`
- `limit=1..100`

`POST /api/admin/moderation/reports/[reportId]` accepts:

```json
{
  "kind": "message",
  "status": "reviewed",
  "note": "Reviewed by moderation team."
}
```

For article reports, admins can also pass:

```json
{
  "kind": "article",
  "status": "actioned",
  "note": "Article removed for rule violation.",
  "hideArticle": true
}
```

## Admin console

The admin page now loads the open moderation queue and passes it into `AdminPanel`. The panel shows message and article reports side-by-side with resolution controls.

## Gameplay / operations notes

- Resolving a message report does not delete or hide the message yet; it records moderation handling and leaves a note attached to the sender for future review.
- Resolving an article report can optionally unpublish the article.
- All moderation actions require an admin session.
- All moderation actions write to `admin_action_logs` using the existing `moderation_note` action type.

## Not run

A TypeScript build was not run because dependencies are not installed in this uploaded project state.

---

## Pass 24: Feature Pass 24 - Enforcement and Appeals Layer

## Goal

Turn the moderation queue into an enforceable safety system with visible player outcomes, active restrictions, auditability, and an appeal path.

## Added

- Character enforcement records with action types:
  - warning
  - social mute
  - shop restriction
  - temporary suspension
  - cash penalty
- Enforcement appeal records with open/accepted/rejected/withdrawn states.
- Admin endpoints:
  - `POST /api/admin/characters/[characterId]/enforce`
  - `POST /api/admin/enforcements/[enforcementId]/lift`
  - `POST /api/admin/appeals/[appealId]/review`
- Player endpoint:
  - `POST /api/enforcements/appeals`
- Active enforcement lookup helper for feature gates.
- Character safety profile query for dashboard visibility.
- Admin console controls for:
  - applying warnings/restrictions/suspensions/penalties
  - lifting active enforcements
  - reviewing appeals
- Dashboard safety/moderation panel for affected players.
- Social mute enforcement in `/api/messages` send actions.
- Shop restriction enforcement in shop create/listing/owner operations.
- Notifications when enforcements are applied, lifted, or appeals are reviewed.
- Admin audit log entries for enforcement and appeal decisions.
- Migration: `0025_enforcement_appeals.sql`.

## Notes

- Temporary suspension reuses the existing character `status`, `status_until`, and `status_reason` fields.
- Social mute and shop restriction are enforced at API boundaries, not just shown in the UI.
- Cash penalty records a system financial transaction and clamps cash at zero.
- Appeal submission is upserted per character/enforcement pair, allowing a revised appeal while preserving a single open review item.

## Follow-up candidates

- Add an admin search page to find characters by name/email before applying manual actions.
- Add automated enforcement recommendations from repeated open reports.
- Add enforcement expiry worker to mark expired restrictions inactive.
- Add public moderation transparency summaries without exposing private report details.

---

## Pass 25: Feature Pass 25 - Enforcement Operations and Admin Search

## Goal

Make the moderation/enforcement stack operational for daily admins by adding discoverability, automatic enforcement expiry, and aggregated transparency metrics.

## Added

- Admin character search by:
  - character name
  - character UUID
  - player email
  - player display name
- Search results include operational context:
  - current status and status reason
  - location
  - cash and bank balances
  - level, reputation, and heat
  - active flag count
  - active enforcement count
- Admin API endpoint:
  - `GET /api/admin/search?q=<query>`
- Enforcement expiry worker:
  - automatically marks timed enforcements inactive after `ends_at`
  - frees characters from temporary admin suspensions when the status reason still belongs to admin enforcement
  - notifies the affected player
  - writes an admin audit log entry for the automatic release
- Worker tick:
  - `apps/worker/src/ticks/enforcement-expiry-tick.ts`
  - registered from `apps/worker/src/index.ts`
  - configurable with `ENFORCEMENT_EXPIRY_TICK_MS`
- Moderation transparency summary:
  - report counts by kind and status
  - enforcement counts by action type
  - appeal counts by status
  - avoids exposing private report content
- Admin API endpoint:
  - `GET /api/admin/transparency?days=30`
- Admin console UI additions:
  - character search card
  - moderation transparency card
- Migration:
  - `0026_enforcement_operations.sql`
- DB script:
  - `db:apply:enforcement-ops`

## Notes

- The expiry worker uses `FOR UPDATE SKIP LOCKED` so multiple worker instances can run without double-processing the same enforcement row.
- Expired records are distinct from manually lifted records through `expired_at` and `expiry_reason`.
- Search is admin-only and intentionally returns operational fields needed for support decisions rather than full private account/session details.

## Follow-up candidates

- Add paginated admin search result pages instead of the compact console card.
- Add admin filters for active flags, active enforcements, suspended characters, high heat, and high-value accounts.
- Add public transparency page using the same aggregate summary after deciding what should be visible to all players.
- Add automated enforcement recommendations for repeat report patterns.

---

## Pass 26: Feature Pass 26 - Live Notification Stream

## Summary

This pass adds the first real-time user feedback loop to the web app through a server-sent events notification stream. The dashboard can now subscribe to notification snapshots for the active character and surface live unread/high-priority counts without requiring a full page refresh.

## Added

- `GET /api/notifications/stream`
  - Authenticated SSE endpoint.
  - Accepts optional `characterId` query parameter.
  - Emits `notification.snapshot` events when unread counts or latest entries change.
  - Emits `notification.heartbeat` events when the stream is healthy but unchanged.
  - Returns structured stream errors for invalid character access or stream refresh failures.
- `listNotificationStreamSnapshot`
  - Lightweight database query wrapper around the notification center.
  - Returns unread count, high-priority count, latest notification, latest unread notification, latest activity entry, and checked timestamp.
- Dashboard live notification subscription.
  - Uses `EventSource` for the active character.
  - Shows live connection state.
  - Shows live unread/high-priority counts.
  - Shows latest unread notification preview.

## Files changed

- `apps/web/src/app/api/notifications/stream/route.ts`
- `apps/web/src/features/dashboard/character-panel.tsx`
- `packages/db/src/queries/notifications.ts`
- `docs/feature-checklist.md`

## Notes

- This deliberately uses SSE rather than WebSockets because the current product needs low-complexity one-way notification delivery first.
- The stream polls every five seconds internally and only emits a full snapshot when the observable notification signature changes.
- No new database migration is required for this pass.

## Follow-up candidates

- Browser toast notifications for urgent alerts.
- Dedicated notification page with pagination and filters.
- Live message thread updates using the same SSE pattern.
- Production rate limiting and connection caps for stream endpoints.

---

## Pass 27: Feature Pass 27 - Live Messages and Browser Alert UX

## Summary

This pass extends the live-update foundation from Feature Pass 26 into the social layer. The dashboard can now subscribe to a lightweight message stream alongside the notification stream, while high-priority unread notifications can trigger browser-level alerts after the player explicitly grants permission.

## Added

- Authenticated message SSE endpoint:
  - `GET /api/messages/stream?characterId=<characterId>`
- Message stream snapshots containing:
  - total unread message count
  - active thread count
  - blocked / blocked-by counts
  - latest active thread
  - latest incoming message thread
  - compact thread-level unread summaries
- Dashboard live message status indicator.
- Dashboard latest incoming message preview.
- Browser notification permission control in the Inbox / Activity panel.
- Browser alerts for high/urgent unread notifications when permission is granted.
- New database query helper:
  - `listMessageStreamSnapshot`

## Files changed

- `packages/db/src/queries/messages.ts`
- `apps/web/src/app/api/messages/stream/route.ts`
- `apps/web/src/features/dashboard/character-panel.tsx`
- `docs/feature-checklist.md`

## Notes

No database migration was required. This pass uses the existing message thread, membership, message, notification, and activity feed tables.

The stream is polling-backed SSE for now. This keeps the implementation simple and deployable on the current stack, while leaving room to later move the event source to Redis pub/sub or Postgres listen/notify.

## Validation

No build was run. A targeted TypeScript parse check was run against the changed TypeScript/TSX files. The only remaining diagnostics were expected missing module/type resolution errors caused by dependencies not being installed in this uploaded project state.

---

## Pass 28: Feature Pass 28 - Notification Preferences and Filter Controls

## Goal

Make the notification system manageable for active players by adding visible inbox filters, preference controls, muted categories, and digest cadence enforcement.

## Added

- Dashboard notification category filter.
- Dashboard notification priority filter.
- Dashboard unread-only notification filter.
- Recent notification list alongside unread alerts.
- Notification preference controls for:
  - muted categories
  - digest enabled/disabled
  - digest cadence
- API query filters for `/api/notifications`:
  - `category`
  - `priority`
  - `unreadOnly`
- Notification center query filtering in the DB layer.
- Muted category suppression for event-generated notifications.
- Digest worker now respects:
  - `digest_enabled`
  - `digest_frequency_minutes`
  - recent digest cooldown windows

## Files changed

- `apps/web/src/app/api/notifications/route.ts`
- `apps/web/src/features/dashboard/character-panel.tsx`
- `packages/db/src/queries/notifications.ts`
- `packages/validators/src/index.ts`
- `docs/feature-checklist.md`
- `docs/feature-history.md#pass-28`

## Notes

No migration was required because the notification preference table already existed from pass 19. This pass wires the existing preference fields into actual player-facing controls and worker behavior.

## Follow-up candidates

- Add faction-wide notification routing.
- Add email/push delivery adapter behind the existing preferences.
- Add per-device browser alert preference storage.

---

## Pass 30: Feature Pass 30 - MVP Hardening 1: Environment, Pagination, and Rate Limits

## Goal

Start the MVP hardening phase identified in the documentation cleanup pass. This pass deliberately avoids new gameplay breadth and instead adds reusable safety primitives that can be applied across the API surface.

## Added

### Environment validation

- Added `serverEnvSchema` in `@drugdeal/validators` for shared runtime requirements.
- Added `apps/web/src/lib/env.ts` with cached server environment validation.
- Updated `/api/health` to report environment validation status and fail clearly when required variables are invalid.
- Hardened `@drugdeal/db` client initialization:
  - `DATABASE_URL` is required in production.
  - `DB_POOL_SIZE` must be an integer from 1 to 50.
- Updated `.env.example` with a safer `AUTH_SECRET` placeholder and `DB_POOL_SIZE`.

### Pagination primitives

- Added shared pagination schemas:
  - `paginationQuerySchema` for admin/internal list endpoints.
  - `publicPaginationQuerySchema` for public/player-facing list endpoints.
- Added API helpers:
  - `parsePagination(request, mode)`
  - `paginationMeta(...)`
- Added pagination metadata shape:
  - `limit`
  - `offset`
  - `count`
  - `nextOffset`
  - `previousOffset`

### Paginated endpoints

Pagination is now wired into representative high-volume list endpoints:

- `GET /api/characters/:characterId/events`
- `GET /api/notifications`
- `GET /api/newspaper`
- `GET /api/shops`
- `GET /api/admin/audit`

### Rate limiting primitives

- Added `apps/web/src/lib/rate-limit.ts`.
- Added request key helper with IP fallback and authenticated actor support.
- Added local in-memory token window enforcement for development and MVP staging.
- Returned `429` responses include retry-after detail in the JSON error payload.

### Rate-limited routes

Initial route-level rate limits now protect:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/messages`
- `POST /api/newspaper`
- `POST /api/shops`
- `POST /api/shops/listings`
- `POST /api/shops/purchase`
- `POST /api/shops/actions`
- `POST /api/crimes`
- `POST /api/jobs`
- `POST /api/market`
- `POST /api/gambling`

## Notes

The rate limiter is intentionally implemented as an in-memory fallback. It is suitable for local development and single-instance MVP testing, but production should replace or extend it with Redis/Postgres-backed counters so limits are shared across app instances.

## Validation

No build was run. Only targeted TypeScript parse checks were run against the changed TypeScript and TSX files. Dependency/module-resolution diagnostics are expected in this uploaded project state because dependencies are not installed.

---

## Pass 31: Feature Pass 31 - MVP Hardening 2: Idempotency and Retry Safety

## Goal

Reduce duplicate side effects when clients retry high-risk mutation requests after a network timeout, browser refresh, mobile reconnect, or serverless retry.

This pass focuses on reusable request idempotency before deeper transaction consistency and test coverage work.

## Added

### API idempotency key storage

Added `api_idempotency_keys` via `packages/db/drizzle/0027_idempotency_keys.sql`.

The table stores:

- `user_id`
- `request_key`
- `route_scope`
- `request_hash`
- processing/completed/failed status
- completed JSON response body
- completed HTTP status
- expiry timestamp

A unique index on `(user_id, request_key, route_scope)` prevents duplicate processing for the same user and route scope.

### Shared idempotency helper

Added `apps/web/src/lib/idempotency.ts`.

The helper:

- accepts the `Idempotency-Key` request header
- validates key format and max length
- creates a stable request payload hash
- inserts a processing record before running the mutation
- stores successful JSON responses for replay
- rejects reused keys with different payloads
- rejects concurrent duplicate submissions while the first request is processing
- clears expired idempotency rows opportunistically

### Initial endpoint coverage

Applied idempotency support to the highest-risk mutation routes first:

- `POST /api/market`
- `POST /api/gambling`
- `POST /api/shops/purchase`
- `POST /api/crimes`
- `POST /api/jobs`
- `POST /api/contracts`
- `POST /api/contracts/:contractId/accept`
- `POST /api/contracts/:contractId/complete`
- `POST /api/contracts/:contractId/cancel`

These routes move money, inventory, cooldown state, escrow state, or action outcomes and are therefore the most important first targets.

### API convention

Clients may send:

```http
Idempotency-Key: client-generated-unique-key
```

Recommended client behavior:

- Generate a new key per user-triggered mutation.
- Reuse the same key only when retrying the exact same request.
- Store the key with the pending client action until a definitive response is received.

Server behavior:

- First successful request stores and returns the response with `x-idempotency-replayed: false`.
- Matching retry returns the cached response with `x-idempotency-replayed: true`.
- Same key with different payload returns `409 conflict`.
- Same key while the first request is still processing returns `409 conflict`.

## Database script

Added package script:

```bash
pnpm db:apply:idempotency
```

## Updated docs

- `docs/api-reference.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/migration-guide.md`
- `docs/remaining-work.md`

## Follow-up work

Recommended next pass: **MVP Hardening 3 - Transaction Consistency and Test Coverage**.

Suggested scope:

- Add tests for idempotent replay behavior.
- Add tests for idempotency payload mismatch behavior.
- Review every remaining mutation route for explicit transaction boundaries.
- Add transaction wrappers to routes that perform multiple writes but do not yet run in one database transaction.
- Add integration-style tests for core money/inventory invariants.

---

## Pass 32: Feature Pass 32 - MVP Hardening 3: Transaction Consistency

## Goal

Reduce the risk of duplicated or partially-applied economic mutations after the idempotency pass by making high-risk balance, inventory, listing, energy, and nerve updates conditional at the database-write layer.

This pass does not add new gameplay breadth. It tightens existing mutation paths so concurrent requests and retry races are less likely to overspend cash, oversell listings, duplicate inventory returns, or consume stale character resources.

## Added

- Shared transaction-safety helpers in `packages/db/src/queries/transaction-safety.ts`:
  - `decrementCharacterCash`
  - `incrementCharacterCash`
  - `adjustCharacterCash`
  - `decrementInventoryQuantity`
  - `reserveShopListingQuantity`
  - `cancelActiveShopListing`
  - `completeJobCharacterUpdate`
  - `resolveCrimeCharacterUpdate`
- Query export wiring through `packages/db/src/queries/index.ts`.

## Hardened paths

### Market trading

Updated `packages/db/src/queries/market.ts` so market buy/sell mutations now use conditional helper writes:

- Buying debits cash with `cash >= totalCost` at write time.
- Selling decrements inventory with `quantity >= requestedQuantity` at write time.
- Seller payout is applied via an additive cash update instead of stale read-modify-write math.

### Player shops

Updated `packages/db/src/queries/shops.ts` so shop inventory and sale operations now use conditional helper writes:

- Listing creation decrements inventory with `quantity >= listedQuantity` at write time.
- Listing fee debits cash with `cash >= listingFee` at write time.
- Purchases reserve listing stock with `quantity - sold_quantity >= requestedQuantity` at write time.
- Buyer cash is debited with `cash >= grossSaleAmount` at write time.
- Seller payout is applied with an additive cash update.
- Listing cancellation uses an active-listing conditional update before returning unsold inventory.
- Shop ad purchases debit cash before creating ad campaign records.

### Gambling

Updated `packages/db/src/queries/gambling.ts` so wager settlement now applies the cash delta through a conditional cash helper:

- Losses cannot drive a character cash balance below zero.
- Wins use additive cash updates to avoid stale balance overwrites.

### Jobs and crimes

Updated route-level transaction bodies for:

- `POST /api/jobs`
- `POST /api/crimes`

Both now use exported transaction-safety helpers:

- Jobs consume energy with `energy >= energyCost` at write time while adding payout and XP atomically.
- Crimes consume nerve with `nerve >= requiredNerve` at write time while applying reward, penalties, heat, health, status, and XP in one conditional update.

## Why this matters

Before this pass, several routes validated balances/resources from an earlier read and then wrote absolute values. Under concurrent submits, that can lead to stale writes, overselling, overspending, or duplicated item returns.

The idempotency pass protects well-behaved client retries when clients send `Idempotency-Key`. This pass improves server-side consistency even when requests are concurrent or clients do not provide an idempotency key.

## Notes

- No database migration was required.
- This pass intentionally kept the helper layer small and reusable.
- Contracts, finance, admin balance adjustments, and enforcement cash penalties still need the same detailed consistency pass.
- A future test pass should add rollback/concurrency tests around these helpers.

## Verification

No build was run.

A TypeScript parse-only check was run against the changed TypeScript files:

- `packages/db/src/queries/transaction-safety.ts`
- `packages/db/src/queries/index.ts`
- `packages/db/src/queries/market.ts`
- `packages/db/src/queries/shops.ts`
- `packages/db/src/queries/gambling.ts`
- `apps/web/src/app/api/jobs/route.ts`
- `apps/web/src/app/api/crimes/route.ts`

All changed files parsed successfully.

---

## Pass 33: Feature Pass 33 - MVP Hardening 4: Test Foundation

## Goal

Add a lightweight automated test foundation for the shared game formula layer so future economy, progression, crime, shop, contract, season, and admin changes have executable regression coverage.

This pass intentionally avoids a full application build. It adds tests and scripts only, then verifies the changed TypeScript test files with parse-only checks.

## Added

- Root test script:
  - `pnpm test`
- Package-level test scripts:
  - `packages/game`: `tsx --test "src/**/*.test.ts"`
  - placeholder test scripts for packages/apps that do not yet have tests
- Root `tsx` dev dependency so TypeScript tests can run through Node's built-in test runner.
- Initial game formula tests under `packages/game/src/__tests__`:
  - `economy-progress.test.ts`
  - `actions.test.ts`
  - `commerce-contracts.test.ts`
  - `meta-admin.test.ts`

## Covered areas

### Economy and progression

- Market price pressure and minimum price clamps.
- Volatility multiplier behavior.
- Training energy scaling.
- Level calculation boundaries and monotonic examples.

### Actions and resources

- Job payout scaling.
- Crime success chance clamping.
- Deterministic failed-crime jail/hospital/no-op outcomes using supplied rolls.
- Resource regeneration caps and elapsed-time behavior.
- Maximum energy and nerve formulas.

### Shops and contracts

- Shop sale normalization, platform fees, and veteran seller fee reduction.
- Listing limit scaling from reputation.
- Contract posting fees, escrow, cooldowns, and risk bounds.
- Contract completion gates for location and required delivery inventory.

### Meta, season, prestige, and admin utilities

- Objective progress clamping and daily/weekly UTC windows.
- Profile score and objective reward calculations.
- Season point and rank-band calculation.
- Prestige readiness, reset, legacy points, and perk keys.
- Admin severity clamping, JSON config normalization, moderation reason validation, and safe cash/bank adjustments.

## Why this matters

The project has accumulated broad gameplay systems. The highest recurring risk is silent regression in shared formulas that drive payouts, costs, resource gates, risk, and player progression. These tests create the first stable baseline before deeper route/database tests are added.

## Notes

- No database migration was required.
- These tests target pure TypeScript game logic only; they do not require a database.
- Route-level tests and database transaction tests remain outstanding.
- The placeholder package test scripts are deliberately present so `pnpm -r test` has predictable behavior across the monorepo.

## Verification

No build was run.

A TypeScript parse-only check was run against the new test files:

- `packages/game/src/__tests__/economy-progress.test.ts`
- `packages/game/src/__tests__/actions.test.ts`
- `packages/game/src/__tests__/commerce-contracts.test.ts`
- `packages/game/src/__tests__/meta-admin.test.ts`

All new test files parsed successfully.

---

## Pass 34: Feature Pass 34 - MVP Hardening 5: Web Helper and Validator Test Coverage

## Goal

Extend the test foundation from shared game formulas into the web/request safety layer so the MVP hardening primitives added in passes 30 and 31 have executable coverage.

This pass intentionally avoids a build and does not run the test suite in this uploaded environment. It adds tests and small testability exports, then validates syntax with targeted TypeScript parse checks only.

## Added test coverage

### Web request-safety tests

Added `apps/web/src/lib/__tests__/request-safety.test.ts` covering:

- Public pagination defaults.
- Public pagination maximum limit rejection.
- Admin pagination maximum window support.
- Pagination metadata for next/previous offsets.
- Client IP extraction from forwarded headers.
- Actor-aware rate-limit key generation.
- In-memory rate limiter allow/reject behavior.
- Idempotency fingerprint stability across object key ordering.
- Idempotency key parsing for accepted and rejected retry keys.

### Validator hardening tests

Added `packages/validators/src/__tests__/hardening.test.ts` covering:

- Server environment validation rejects short production secrets.
- Server environment validation accepts a complete PostgreSQL runtime config.
- Public pagination is stricter than admin pagination.
- Rate-limit option validation rejects impossible limits/windows.

## Small testability refactors

### `apps/web/src/lib/api.ts`

Added:

- `parsePaginationSearchParams`

`parsePagination` now delegates to this pure helper, making pagination behavior directly testable without constructing a full Next.js request.

### `apps/web/src/lib/rate-limit.ts`

Exported/added:

- `getClientIp`
- `resetInMemoryRateLimits`
- `getInMemoryRateLimitBucketCount`

These helpers let tests verify rate limiter behavior without leaking bucket state between test cases.

### `apps/web/src/lib/idempotency.ts`

Exported/added:

- `stableStringify`
- `buildIdempotencyRequestHash`
- `parseIdempotencyKey`

`withIdempotency` now uses these helpers internally. The database-backed idempotency behavior remains unchanged, but the deterministic request-fingerprint logic is now covered by tests.

## Package script updates

Updated:

- `apps/web/package.json`
- `packages/validators/package.json`

Both packages now have test scripts using Node's built-in test runner through `tsx`:

```bash
pnpm --filter @drugdeal/web test
pnpm --filter @drugdeal/validators test
```

The root `pnpm test` command from pass 33 will include these packages once dependencies are installed.

## Validation performed

No build was run.

Targeted TypeScript parse checks were run against the changed TypeScript files:

- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/rate-limit.ts`
- `apps/web/src/lib/idempotency.ts`
- `apps/web/src/lib/__tests__/request-safety.test.ts`
- `packages/validators/src/__tests__/hardening.test.ts`

All changed TypeScript files parsed successfully.

## Remaining test gaps

This pass improves helper-level coverage but does not yet add database-backed route tests. The next test pass should add representative route tests with mocked or disposable database access for:

- idempotency replay and conflict paths,
- market duplicate-submit protection,
- shop purchase duplicate-submit protection,
- jobs/crimes resource consumption,
- contract escrow and cancellation safety,
- admin cash adjustment safety.

---

## Pass 35: Feature Pass 35 - MVP Hardening 6: Browser Security Boundary

## Goal

Pause new gameplay feature expansion and strengthen the HTTP/browser security boundary before continuing with more features and functions.

This pass focuses on protections that apply broadly across the app instead of individual game systems.

## Added

### Security middleware

Added `apps/web/src/middleware.ts` to apply baseline security behavior to all application routes except static Next.js assets.

The middleware now:

- Adds security response headers to application and API responses.
- Blocks unsafe cross-origin API mutations.
- Allows safe methods (`GET`, `HEAD`, `OPTIONS`) without origin enforcement.
- Allows same-origin mutations.
- Allows explicitly trusted origins configured through environment variables.
- Returns a structured `403 forbidden` JSON error for rejected cross-origin mutations.
- Adds an `x-origin-check` header on rejected requests to make local debugging easier.

### Shared security helper

Added `apps/web/src/lib/security.ts` with reusable helpers for:

- Origin normalization.
- Trusted origin parsing.
- Request origin resolution from `Origin` or `Referer`.
- Mutation origin evaluation.
- Security header construction.
- Security header application to `NextResponse` instances.

### Security headers

The app now sets a baseline header set:

- `Content-Security-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Permissions-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-DNS-Prefetch-Control`
- `X-Frame-Options`
- `Strict-Transport-Security` in production only

The CSP is intentionally conservative around framing, object embedding, base URI, and form posts while remaining compatible with the current Next.js app and dashboard scripts.

### Environment additions

Added optional runtime configuration for canonical/trusted app origins:

- `NEXT_PUBLIC_APP_URL`
- `APP_ORIGIN`
- `TRUSTED_ORIGINS`

Updated `serverEnvSchema` so malformed canonical origins fail validation early.

Updated the health environment status helper to show whether canonical and trusted origins are configured.

### Tests

Extended existing hardening tests with coverage for:

- Origin normalization.
- Trusted origin parsing.
- Safe-method origin bypass.
- Same-origin mutation acceptance.
- Cross-origin mutation rejection.
- Security header presence.
- Canonical origin environment validation.
- Malformed origin rejection.

## Files changed

- `apps/web/src/middleware.ts`
- `apps/web/src/lib/security.ts`
- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/__tests__/request-safety.test.ts`
- `packages/validators/src/index.ts`
- `packages/validators/src/__tests__/hardening.test.ts`
- `.env.example`
- `docs/feature-history.md#pass-35`
- `docs/feature-index.md`
- `docs/feature-checklist.md`
- `docs/project-status.md`
- `docs/remaining-work.md`

## Validation

No build was run.

Validation performed:

- JSON parse checks for package files.
- Targeted TypeScript parse checks for changed TypeScript files.

## Notes and follow-up

The current origin guard is a strong baseline for browser-driven requests. The next security hardening pass should add a stricter API client policy for non-browser integrations if external API clients become part of the product.

Recommended next hardening targets:

1. Add production Redis-backed rate limiting.
2. Add route/database tests for idempotency replay and transaction rollback behavior.
3. Add security audit logging for rejected origin checks and repeated abuse patterns.
4. Add role-based admin permissions.

---

## Pass 36: Feature Pass 36 - MVP Hardening 7: Request Observability and Runtime Diagnostics

## Goal

Continue the hardening track before adding more gameplay features by making API requests easier to trace, diagnose, and safely debug in production-like environments.

This pass focuses on operational visibility rather than feature breadth.

## Added

- Shared observability helper:
  - `apps/web/src/lib/observability.ts`
- Request ID normalization and generation.
- Correlation ID fallback support.
- Middleware propagation of `x-request-id` into route handlers.
- Response `x-request-id` header on all middleware-managed responses.
- Response `x-response-time-ms` header for observability-wrapped routes.
- Safe structured JSON logging helper.
- Redacted unhandled-error serialization for production.
- `withApiObservability` wrapper for route-level try/catch, request metadata, and unhandled-error logging.
- Runtime diagnostics helper for uptime, process, platform, Node version, and memory usage.
- `/api/health` now returns runtime diagnostics and response metadata when healthy.
- `/api/health` now returns structured request metadata when environment validation fails.
- `jsonOk` and `jsonError` now support optional response metadata without changing existing call sites.

## Tests added

Extended the web request-safety tests to cover:

- request ID normalization;
- request ID lookup precedence;
- response request ID attachment;
- request metadata shape;
- production error redaction;
- runtime diagnostics shape and secret exclusion.

## Operational behavior

A request with either of the following headers will keep that trace ID if it matches the safe request ID pattern:

- `x-request-id`
- `x-correlation-id`

If neither exists, middleware generates a new request ID and forwards it into the application request headers.

Responses include:

- `x-request-id`
- security headers from pass 35
- `x-response-time-ms` for routes wrapped with `withApiObservability`

Unhandled errors inside observability-wrapped routes are logged as structured JSON and returned as a generic `server_error` response. Production responses do not expose error messages or stacks.

## Files changed

- `apps/web/src/lib/observability.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/api/health/route.ts`
- `apps/web/src/lib/__tests__/request-safety.test.ts`
- `docs/feature-index.md`
- `docs/feature-checklist.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/api-reference.md`

## Validation

No build was run.

Targeted TypeScript parse checks were run against the changed TypeScript files and all changed files parsed successfully.

## Next recommended hardening pass

Continue with **MVP Hardening 8 - Contracts, Finance, and Admin Cash Safety**:

- finish conditional write coverage for contracts;
- finish conditional write coverage for finance buy/sell;
- harden admin balance adjustments;
- harden enforcement cash penalties;
- add focused tests for duplicate-submit and rollback-sensitive paths.

---

## Pass 37: Feature Pass 37 - MVP Hardening 8: Economic Mutation Safety

## Goal

Continue the hardening track before adding more gameplay breadth by reducing duplicate-submit, race-condition, and partial-write risk in the remaining high-value economic mutation paths.

## Implemented

### Contract safety

- Added shared transaction-safety helpers for contract state transitions:
  - `acceptOpenContract`
  - `completeAcceptedContract`
  - `cancelOpenContract`
  - `debitContractPosterCost`
  - `refundContractEscrow`
- Contract creation now debits poster cash through the conditional cash helper before inserting the contract.
- Contract acceptance now uses a conditional `open -> accepted` transition and returns a conflict if another request already accepted or changed the contract.
- Contract completion now uses a conditional `accepted -> completed` transition tied to the assigned character.
- Contract item delivery now uses the conditional inventory decrement helper.
- Contract cancellation now uses a conditional `open -> cancelled` transition before refunding escrow.
- Expired contract escrow refunds now use the shared escrow refund helper.

### Finance trade safety

- Finance asset purchases now use conditional cash debit before adding to a position.
- Finance asset sales now use conditional asset quantity reservation before crediting cash.
- Finance sales now increment realized profit atomically.
- Finance trade mutations now support `Idempotency-Key` through `withIdempotency`.

### Admin cash safety

- Admin cash adjustments now use shared conditional cash adjustment helpers.
- Admin bank adjustments now use shared conditional bank adjustment helpers.
- Enforcement cash penalties now use conditional cash decrement logic rather than overwriting the character cash value.
- Admin cash/bank adjustment routes now support `Idempotency-Key`.
- Admin enforcement route now supports `Idempotency-Key`.

### Shared helper additions

Added to `packages/db/src/queries/transaction-safety.ts`:

- `incrementCharacterBank`
- `decrementCharacterBank`
- `adjustCharacterBank`
- `acceptOpenContract`
- `completeAcceptedContract`
- `cancelOpenContract`
- `reserveAssetPositionQuantity`
- `addAssetPositionQuantity`

## Why this matters

Before this pass, several high-value routes already ran inside database transactions but still used read-then-overwrite updates such as `cash: character.cash - amount` or `quantity: existing.quantity - amount`. That pattern is vulnerable to stale reads when users double-click, retry after timeouts, or send concurrent requests.

This pass shifts the remaining important paths toward conditional database writes, where the database itself verifies that the current row still has the required state or balance before applying the change.

## Validation

No build was run. Targeted TypeScript parse checks were run against the changed TypeScript files only. The changed files parsed successfully; dependency-resolution diagnostics remain expected in this uploaded project state without installed dependencies.

## Remaining hardening follow-up

- Add database/integration tests for contract accept/complete/cancel races.
- Add finance duplicate-submit and insufficient-position tests.
- Add admin adjustment replay/conflict tests.
- Expand idempotency to remaining admin routes after role-based admin permissions are introduced.
- Wrap more routes with `withApiObservability` for consistent response timing and request IDs.

---

## Pass 38: Feature Pass 38 - MVP Hardening 9: Hardening Completion and Operational Guardrails

## Goal

Complete the current hardening cycle before returning to feature and function expansion. This pass focuses on production hygiene, database invariants, cleanup workers, and documentation clarity.

## Added

- Database hardening migration: `0028_hardening_completion.sql`.
- Database-level `CHECK` constraints for non-negative balances, resources, inventory quantities, prices, wagers, rewards, cooldown support fields, and idempotency completion state.
- Constraints are added as `NOT VALID` so existing pre-hardening data can be audited separately while new/updated rows are protected.
- Additional operational indexes for high-volume tables such as sessions, events, messages, reports, listings, transactions, contracts, enforcements, notifications, and digests.
- Shared maintenance cleanup helpers in `@drugdeal/db`:
  - expired idempotency keys
  - expired sessions
  - stale expired action locks
  - old notification digests
- Worker maintenance tick with configurable cadence and retention windows.
- New DB script: `db:apply:hardening`.
- `.env.example` maintenance tuning variables.

## Why this matters

The previous hardening passes improved request safety and high-risk economic mutations in application code. This pass adds a database and operations backstop so invalid future writes are rejected at the database boundary and recurring operational tables do not grow forever.

## Verification

No build was run. Verification was limited to JSON parse checks and targeted TypeScript parse checks on changed TypeScript files.

## Follow-up

The hardening cycle is now complete enough to resume feature/function work. Remaining reliability work should happen alongside each new feature: add route tests, apply pagination/rate limits/idempotency where relevant, and keep high-risk writes conditional or transactional.

---

## Pass 39: Feature Pass 39 - Validation Readiness and Hardening Audit Tooling

## Objective

Move the project from implementation hardening into validation hardening. This pass does not add gameplay features. It adds repeatable local audit tooling and documentation so the next environment with installed dependencies and PostgreSQL can prove the hardening work instead of relying on code review alone.

## Added

### Repository validation scripts

- `scripts/validate-migrations.ts`
  - enumerates `packages/db/drizzle/*.sql`
  - checks numeric migration continuity
  - checks duplicate migration numbers
  - checks whether non-seed migrations have `db:apply:*` script coverage
  - flags potentially destructive SQL patterns for manual review

- `scripts/audit-hardening.ts`
  - scans `apps/web/src/app/api/**/route.ts`
  - detects exported HTTP methods
  - identifies unsafe mutation routes
  - reports obvious route-level guard coverage:
    - auth/session guard
    - admin guard
    - rate-limit helper
    - idempotency helper
    - pagination helper
    - observability wrapper usage
  - outputs a JSON report that can be captured in CI or a local release checklist

### Root package scripts

- `pnpm validate:migrations`
- `pnpm audit:hardening`
- `pnpm validate:repo`

`validate:repo` is intentionally a pre-CI/local release script. It is not a replacement for full install, typecheck, tests, migration execution, or runtime smoke tests.

### Validation documentation

- Added `docs/validation-audit.md`
- Updated `docs/remaining-work.md`
- Updated `docs/project-status.md`
- Updated `docs/feature-index.md`
- Updated `docs/feature-checklist.md`

## Why this pass matters

The previous hardening passes added primitives and guardrails. The remaining risk is proof: migration ordering, route coverage drift, and missing guard adoption are easy to miss as more endpoints are added. This pass makes those risks visible and gives maintainers repeatable checks before feature work resumes.

## Expected next step

The next pass should be the first true runtime validation pass in an environment with dependencies installed:

1. `pnpm install`
2. `pnpm validate:repo`
3. `pnpm typecheck`
4. `pnpm test`
5. apply migrations to a clean PostgreSQL database
6. run API smoke tests against the started app
7. fix actual runtime failures before adding new gameplay features

## Verification performed in this pass

No build was run. No test suite was run.

Performed local static checks only:

- JSON package parse checks
- targeted TypeScript syntax/parse checks for the new audit scripts

---

## Pass 40: Feature Pass 40 - Validation Audit Remediation and Static Check Execution

## Goal

Turn the pass 39 validation/audit tooling into a dependency-light, executable hardening gate and remediate the first static audit findings without expanding gameplay scope.

## Implemented

### Dependency-light validation scripts

- Added `scripts/validate-migrations.mjs`.
- Added `scripts/audit-hardening.mjs`.
- Updated root scripts to use plain Node instead of requiring `tsx` for repository validation:
  - `pnpm validate:migrations`
  - `pnpm audit:hardening`
  - `pnpm validate:repo`
- Removed the previous TypeScript validation script copies to avoid duplicate/stale audit entry points.

### Static migration validation

`node scripts/validate-migrations.mjs` now executes successfully without installed package dependencies.

Current result:

- 29 SQL migrations detected.
- Migration sequence is continuous from `0000` through `0028`.
- No duplicate migration numbers detected.
- No uncovered non-seed migrations detected.
- No destructive `DROP TABLE` or unsafe `DELETE FROM` migration patterns detected.

### Static API hardening audit

`node scripts/audit-hardening.mjs` now executes successfully without installed package dependencies.

Current result:

- 74 API route files audited.
- 56 unsafe/state-changing route files detected.
- 56 unsafe route files include route-level rate-limit helper usage.
- 14 route files include idempotency helper usage.
- 60 route files include pagination/list bounds or are recognized as stream/snapshot routes.
- 0 hardening notes remain after remediation.

### Rate-limit remediation

Added route-level rate-limit checks to the remaining unsafe routes that were not already covered by pass 30. This includes additional protection across:

- character creation
- travel
- factions and faction member actions
- training and education
- legal/hospital actions
- admin config, flags, moderation, appeals, and enforcement actions
- territory actions
- finance and contracts route files
- profile claims and title updates
- seasons/prestige actions
- PvP, bounties, faction wars
- equipment, vehicles, crafting, contacts
- notification mutations
- enforcement appeal submissions

### Idempotency remediation

Added idempotency support for two remaining duplicate-submit-sensitive enforcement flows:

- `POST /api/enforcements/appeals`
- `POST /api/admin/enforcements/:enforcementId/lift`

### Audit signal improvements

The static hardening audit now distinguishes intentional cases from real issues:

- login/register/logout are treated as public unsafe auth routes rather than auth omissions
- SSE stream routes are not treated as ordinary paginated list routes
- notes now carry `error` or `warning` severity
- the script exits non-zero only when hardening errors remain

### TypeScript parse cleanup

Fixed a TypeScript narrowing issue in `apps/web/src/lib/idempotency.ts` by using explicit `parsedKey.ok === false` narrowing.

## Verification performed

No build was run.

Commands/checks performed:

```bash
node --check scripts/validate-migrations.mjs
node --check scripts/audit-hardening.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
python3 -m json.tool package.json
# plus package.json JSON parse checks for all package manifests
```

A targeted TypeScript parse check was run against changed web/API files. The remaining TypeScript diagnostics were expected missing dependency/module-resolution errors from the uploaded project state without installed dependencies; there were no additional syntax or local TypeScript diagnostics after filtering those dependency errors.

## Remaining validation work

Pass 40 proves the static validation layer can execute and that the current static route/migration checks pass. It still does not replace runtime validation.

The next best pass is a runtime validation pass in an environment with dependencies and PostgreSQL available:

1. install dependencies
2. run `pnpm validate:repo`
3. run `pnpm typecheck`
4. run `pnpm test`
5. apply migrations to a clean database
6. smoke-test health/auth/economy/admin/SSE flows

---

## Pass 41: Feature Pass 41 - Runtime Smoke Validation Harness

## Goal

Pass 41 continues the validation phase after static migration/API hardening checks were made executable in pass 40. The goal is to add a dependency-light runtime smoke harness that can be run against a live web app before deeper integration tests are written.

This pass does not add gameplay features.

## Added

### Runtime smoke script

Added `scripts/runtime-smoke.mjs` and root script:

```bash
pnpm smoke:runtime
```

The script uses built-in Node `fetch`, so it does not require Playwright, Vitest, Jest, Supertest, or application dependencies beyond the runtime install needed to start the app.

### Validation command split

The validation commands are now split into static and runtime stages:

```bash
pnpm validate:static
pnpm smoke:runtime
pnpm validate:repo
```

- `validate:static` runs static repository checks only.
- `smoke:runtime` probes a running web app.
- `validate:runtime` aliases the runtime smoke stage.
- `validate:repo` remains static-only so it can run before services are started.

This split lets CI run static checks before booting services, then run runtime checks once the app is listening.

## Smoke checks covered

The runtime script probes:

- `GET /api/health`
  - verifies JSON shape
  - verifies request id propagation
  - verifies baseline security headers
  - allows degraded health as a warning by default when environment/database config is not ready
- `GET /api/auth/me`
  - verifies unauthenticated access returns `401`
  - verifies standard error shape
  - verifies security headers
- `POST /api/auth/logout` with a hostile `Origin`
  - verifies same-origin mutation guard rejects cross-origin unsafe requests
  - verifies `403` response and standard forbidden error shape
- Missing API route
  - verifies middleware still attaches security headers and request ids to framework-level `404` responses

## Configuration

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SMOKE_BASE_URL` | `http://localhost:3000` | Running web app base URL. |
| `SMOKE_TIMEOUT_MS` | `5000` | Per-request timeout. |
| `SMOKE_RETRIES` | `0` | Retries for each smoke step. |
| `SMOKE_RETRY_DELAY_MS` | `500` | Delay between retries. |
| `SMOKE_STRICT_HEALTH_OK` | `false` | Treat degraded `/api/health` as failure instead of warning. |

Example:

```bash
SMOKE_BASE_URL=http://localhost:3000 SMOKE_RETRIES=2 pnpm smoke:runtime
```

For CI after migrations are applied, use strict health mode:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

## Verification performed in this pass

Executed locally without a running app:

```bash
node --check scripts/runtime-smoke.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
```

Results:

- Runtime smoke script syntax check: passing.
- Migration static validation: passing.
- API hardening static audit: passing.

The runtime smoke script was not executed against a live Next.js server in this uploaded project state.

## Remaining validation work

Runtime validation still needs to be executed after dependencies are installed and the app is started:

```bash
pnpm install
cp .env.example .env
docker compose up -d
# apply migrations from docs/migration-guide.md
pnpm dev
pnpm smoke:runtime
```

After that, the next best validation pass is database-backed integration tests for high-risk mutation flows.

---

## Pass 42: Feature Pass 42 - Documentation Cleanup and Drift Validation

## Goal

Refresh the current documentation set after the runtime smoke harness work and add a dependency-light guard that prevents key project docs from drifting away from the source tree.

This pass does not add gameplay features.

## Added

### Documentation drift validator

Added `scripts/validate-docs.mjs` and root script:

```bash
pnpm validate:docs
```

The validator uses plain Node and does not require installed application dependencies. It checks:

- every `apps/web/src/app/api/**/route.ts` file is listed in `docs/api-reference.md`;
- every concrete `/api/...` route documented in `docs/api-reference.md` has a matching route file;
- feature-pass links in `docs/feature-index.md` resolve to existing files;
- `docs/migration-guide.md` mentions the latest SQL migration;
- `package.json` exposes the `validate:docs` script.

### Static validation chain update

Updated the static validation chain so documentation drift is part of the same pre-runtime gate:

```bash
pnpm validate:static
```

now runs:

```bash
pnpm validate:migrations
pnpm audit:hardening
pnpm validate:docs
```

### Documentation cleanup

Updated the active planning and reference docs to reflect the current pass and current route surface:

- `README.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/api-reference.md`
- `docs/validation-audit.md`

The API reference now includes the seasons route group and is covered by the docs validator.

## Verification performed

No build was run.

Commands/checks performed:

```bash
node --check scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-docs.mjs
pnpm validate:static
```

Current static results:

- 29 migrations detected, continuous from `0000` through `0028`.
- 74 API route files audited.
- 56 unsafe/state-changing route files include route-level rate-limit helper usage.
- 74 API routes documented and cross-checked.
- 0 migration, hardening, or documentation errors.

## Remaining validation work

Pass 42 improves maintainability and prevents documentation drift. It still does not replace runtime validation.

The next best pass remains a real runtime/integration pass in an environment with dependencies and PostgreSQL available:

1. install dependencies in a clean environment;
2. apply all migrations to a disposable PostgreSQL database;
3. run `pnpm validate:static`, `pnpm typecheck`, and `pnpm test`;
4. start the web app and run `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime`;
5. add database-backed integration tests for auth, market, shops, contracts, admin enforcement, and idempotency conflict paths.

---

## Pass 43: Feature Pass 43 - CI Workflow and Drift Validation

## Goal

Add a repository-level CI gate so static validation, TypeScript checks, and tests can run consistently on pull requests before future gameplay or database changes are merged.

This pass does not add gameplay features.

## Added

### GitHub Actions CI workflow

Added `.github/workflows/ci.yml`.

The workflow runs on:

- pull requests;
- pushes to `main`;
- pushes to `master`.

The workflow uses Node.js 22, enables pnpm through Corepack, installs dependencies, and runs:

```bash
pnpm validate:ci
```

### Local CI-equivalent validation script

Added the root script:

```bash
pnpm validate:ci
```

It chains:

```bash
pnpm validate:static
pnpm typecheck
pnpm test
```

This gives developers and interns one local command that mirrors the CI validation intent after dependencies are installed.

### CI workflow drift validator

Added `scripts/validate-ci-workflow.mjs` and root script:

```bash
pnpm validate:ci-workflow
```

The validator is dependency-light and checks that:

- `.github/workflows/ci.yml` exists;
- the workflow uses `actions/checkout@v4`;
- the workflow uses `actions/setup-node@v4`;
- Node.js 22 is selected;
- Corepack is enabled before pnpm commands;
- dependencies are installed through `pnpm install --no-frozen-lockfile`;
- the workflow runs `pnpm validate:ci`;
- root `package.json` exposes `validate:ci` and `validate:ci-workflow`;
- `validate:ci` includes static validation, typecheck, and tests;
- `validate:static` includes CI workflow validation.

### Static validation chain update

Updated:

```bash
pnpm validate:static
```

to run:

```bash
pnpm validate:migrations
pnpm audit:hardening
pnpm validate:docs
pnpm validate:ci-workflow
```

## Documentation updated

Updated active project docs to mark CI as implemented and move the next recommended pass to runtime/database-backed integration testing:

- `README.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/api-reference.md`
- `docs/validation-audit.md`

## Verification performed

No build was run.

Commands/checks performed:

```bash
node --check scripts/validate-ci-workflow.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current static results:

- 29 migrations detected, continuous from `0000` through `0028`.
- 74 API route files audited.
- 56 unsafe/state-changing route files include route-level rate-limit helper usage.
- 74 API routes documented and cross-checked.
- CI workflow configuration passes the dependency-light workflow validator.
- 0 migration, hardening, documentation, or CI workflow validation errors.

`pnpm validate:static` and `pnpm validate:ci` were not run directly in this sandbox because pnpm is not installed here. The dependency-light Node validators were run directly and passed.

## Remaining validation work

The next best pass is a real runtime/database-backed integration pass in an environment with dependencies and PostgreSQL available:

1. run the new GitHub Actions workflow or `pnpm validate:ci` in a clean local environment;
2. apply all migrations to a disposable PostgreSQL database;
3. start the web app and run `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime`;
4. add database-backed integration tests for auth, market, shops, contracts, admin enforcement, and idempotency conflict paths.

---

## Pass 44: Feature Pass 44 - API Observability Expansion and Audit Enforcement

## Goal

Broaden request observability from the health endpoint to the active API surface, then make observability drift visible in the existing hardening audit.

This pass does not add gameplay features. It reduces operational risk before database-backed integration testing by ensuring unsafe API mutations consistently attach request IDs, response timing headers, and guarded unhandled-error responses.

## Changed

### API route observability coverage

Wrapped request-aware API handlers with `withApiObservability` across the API tree.

The wrapper now covers all current unsafe/state-changing route files and most request-aware read routes. It adds:

- `x-request-id` response propagation;
- `x-response-time-ms` response timing;
- redacted structured logging for unhandled route exceptions;
- standard `500 server_error` JSON responses for unexpected failures.

The wrapper was also broadened to accept standard `Response` objects, not only `NextResponse`, so SSE stream routes can be wrapped safely.

### API error-code typing

Added `invalid_query` to the shared `ApiErrorCode` union so existing query-validation responses typecheck cleanly alongside `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `server_error`, and `cooldown_active`.

### Hardening audit enforcement

Updated `scripts/audit-hardening.mjs` so unsafe routes without obvious observability now fail the static hardening audit.

The audit still checks:

- unsafe route auth/session guard presence;
- unsafe route rate-limit helper usage;
- high-risk mutation idempotency helper usage;
- list-style GET pagination signals.

It now also enforces:

- unsafe route request observability wrapper usage.

## Documentation updated

Updated active project docs to mark the broader API observability pass as complete and to keep the next recommended implementation step focused on real dependency/runtime validation:

- `README.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/api-reference.md`
- `docs/validation-audit.md`

## Verification performed

No build was run.

Commands/checks performed:

```bash
node --check scripts/audit-hardening.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current static results:

- 29 migrations detected, continuous from `0000` through `0028`.
- 74 API route files audited.
- 56 unsafe/state-changing route files detected.
- 56 unsafe/state-changing route files include route-level rate-limit helper usage.
- 56 unsafe/state-changing route files include request observability wrapper usage.
- 72 total API route files include request observability signals.
- 74 concrete API routes documented and cross-checked.
- CI workflow configuration passes the dependency-light workflow validator.
- 0 migration, hardening, documentation, or CI workflow validation errors.

`pnpm validate:static` and `pnpm validate:ci` were not run directly in this sandbox because pnpm is not installed here. The dependency-light Node validators were run directly and passed.

## Remaining validation work

The highest-value next step remains a real clean-environment validation pass:

1. Install dependencies with pnpm.
2. Apply all migrations to a disposable PostgreSQL database.
3. Run `pnpm validate:ci`.
4. Start the app and run `pnpm smoke:runtime` with strict health enabled.
5. Add database-backed route tests for auth, market, shops, contracts, admin enforcement, and idempotency conflict paths.

---

## Pass 45: Feature Pass 45 - Complete API Observability Coverage

## Goal

Close the last observability gap across the API tree and make full API observability coverage an enforced static invariant.

Feature Pass 44 made observability mandatory for unsafe/state-changing routes. This pass extends that protection to the remaining read-only routes so every current API route file has a consistent request ID, response timing header, and guarded unhandled-error response path.

## Changed

### API route coverage

Wrapped the two remaining read-only route files with `withApiObservability`:

- `GET /api/announcements`
- `GET /api/territories`

The API route tree now has observability signals in all 74 route files.

### Hardening audit enforcement

Updated `scripts/audit-hardening.mjs` so **any** API route file without a request observability signal is now reported as a static validation error, not only unsafe routes.

The audit still checks:

- unsafe route auth/session guard presence;
- unsafe route rate-limit helper usage;
- high-risk mutation idempotency helper usage;
- list-style GET pagination signals;
- request observability wrapper usage.

Request observability is now enforced globally across the route tree.

## Documentation updated

Updated the living project docs to reflect Feature Pass 45 and the new full-route observability invariant:

- `README.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/api-reference.md`
- `docs/validation-audit.md`

## Verification performed

No build was run.

Commands/checks performed:

```bash
node --check scripts/audit-hardening.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current static results:

- 29 migrations detected, continuous from `0000` through `0028`.
- 74 API route files audited.
- 56 unsafe/state-changing route files detected.
- 56 unsafe/state-changing route files include route-level rate-limit helper usage.
- 74/74 API route files now include request observability signals.
- Missing request observability on any API route is now a hard static-audit error.
- 74 concrete API routes documented and cross-checked.
- 43 feature-history sections indexed.
- CI workflow configuration passes the dependency-light workflow validator.
- 0 migration, hardening, documentation, or CI workflow validation errors.

`pnpm validate:static` and `pnpm validate:ci` were not run directly in this sandbox because pnpm is not installed here. The dependency-light Node validators were run directly and passed.

## Remaining validation work

The next highest-value step remains a real clean-environment validation pass:

1. Install dependencies with pnpm.
2. Apply all migrations to a disposable PostgreSQL database.
3. Run `pnpm validate:ci`.
4. Start the app and run `pnpm smoke:runtime` with strict health enabled.
5. Add database-backed route tests for auth, market, shops, contracts, admin enforcement, and idempotency conflict paths.

---

## Pass 46: Feature Pass 46 - Representative Route Contracts and Guard Tightening

## Summary

Pass 46 closes the first P0 testing/planning gap without requiring a live database in the sandbox. It adds representative API route-contract coverage for the most important MVP route groups and makes that coverage part of static validation.

The pass also tightens two concrete API areas discovered while building the contracts:

- Shop listing creation now uses `withIdempotency`, protecting retry/double-submit cases for listing creation.
- Admin search now validates/caps query input and applies route-level rate limiting, reducing abuse risk on the admin search endpoint.

## Code changes

- Added `scripts/audit-route-contracts.mjs`.
- Added `pnpm audit:route-contracts`.
- Added route-contract audit execution to `pnpm validate:static`.
- Added `apps/web/src/lib/__tests__/route-contracts.test.ts`.
- Updated `apps/web/src/app/api/shops/listings/route.ts` to wrap listing creation with `withIdempotency`.
- Updated `apps/web/src/app/api/admin/search/route.ts` with:
  - bounded `adminSearchQuerySchema`
  - route-level rate limiting
  - `invalid_query` responses for malformed admin search input

## Representative route coverage

The static audit and web test currently cover 12 representative route contracts across these MVP groups:

- auth
- jobs
- crimes
- market
- shops
- contracts
- admin

The audited route contracts check for expected source-level guard tokens such as request observability, auth/session checks, admin checks, rate limiting, body/query validation, idempotency, and key mutation helpers.

## Validation performed

Executed directly with plain Node in the sandbox:

```bash
node --check scripts/audit-route-contracts.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current results:

- migrations detected: 29 (`0000` through `0028`)
- migration gaps: 0
- uncovered non-seed migrations: 0
- API route files audited: 74
- unsafe route files: 56
- unsafe route files with route-level rate limiting: 56
- route files with observability wrapper: 74
- representative route contracts checked: 12
- documented concrete API routes: 74
- feature-pass files detected: 44
- CI workflow drift errors: 0

`pnpm validate:static`, `pnpm typecheck`, and `pnpm test` still need to be run in an installed environment because `pnpm` is unavailable in this sandbox.

## Remaining risk

This pass adds static/representative route-contract coverage. It is not a substitute for database-backed integration tests. The next validation pass should install dependencies, apply migrations to PostgreSQL, run full typecheck/tests, then execute runtime smoke checks with strict health enabled.

---

## Pass 47: Feature Pass 47 - MVP Player Pages and Page Coverage Gate

Pass 47 starts the MVP completion sequence by turning the dashboard-heavy experience into a navigable product shell. The goal is to make the implemented gameplay systems discoverable to testers without requiring API knowledge or a single oversized dashboard panel.

## Implemented

- Added a shared authenticated game page shell:
  - `apps/web/src/features/game/game-page.tsx`
  - Provides active-session/active-character loading, a reusable navigation bar, cards, grids, stats, date formatting, and money formatting.
- Added dedicated MVP player pages:
  - `/profile`
  - `/jobs`
  - `/crimes`
  - `/legal`
  - `/market`
  - `/shops`
  - `/messages`
  - `/newspaper`
  - `/factions`
- Added a dependency-light MVP page validator:
  - `scripts/validate-mvp-pages.mjs`
  - `pnpm validate:mvp-pages`
- Updated `pnpm validate:static` so MVP page coverage is validated with the other dependency-light static gates.

## Product impact

The MVP now has first-class pages for the core loops testers need to inspect:

- character profile, resources, progression, and event history
- legal and hospital status
- job catalog
- crime catalog
- local market and inventory
- player shops and listings
- social messages
- local newspaper articles
- faction and territory state

These pages are intentionally lightweight. They prioritize readable state inspection and navigation over deep client-side interaction. The existing dashboard and API routes still provide the richer action execution path while the next passes finish gameplay depth and integration confidence.

## Validation

Executed directly in the sandbox:

```bash
node --check scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-ci-workflow.mjs
```

Current static results:

- 9 dedicated MVP player pages validated and linked from the shared navigation shell.
- 29 migrations detected, continuous from `0000` through `0028`.
- 74 API route files audited.
- 56 unsafe route files include route-level rate limiting.
- 74 API route files include request observability coverage.
- 12 representative route contracts checked.
- CI workflow drift validation reports zero errors.

`pnpm validate:static`, `pnpm typecheck`, and `pnpm test` still need to run in a fully installed environment with pnpm and dependencies available.

## Remaining MVP work after this pass

- Run full runtime validation in a dependency-installed PostgreSQL environment.
- Add database-backed integration tests for core economic and action mutations.
- Finish gameplay depth for level progression, crime failure formulas, hospital treatment depth, and job lifecycle.
- Add admin safety pages and role-scoped admin permissions.
- Prepare deployment, backup/restore, and public test runbooks.

---

## Pass 48: Feature Pass 48 - MVP Progression Loop Completion

## Goal

Complete the MVP-visible progression loop so jobs and crimes do more than mutate cash/resources: they now award deterministic experience, advance character level from a canonical curve, update max nerve rewards, and return progression snapshots to clients.

## Changes

- Expanded `packages/game/src/progression.ts` with canonical MVP progression helpers:
  - `calculateExperienceForLevel`
  - `calculateProgressionFromExperience`
  - `calculateProgressionRewards`
  - `calculateActionExperience`
- Updated job and crime route handlers to calculate action experience through shared game formulas.
- Updated job and crime event payloads and API responses to include progression snapshots.
- Updated transaction-safety character mutations so job and crime experience gains also recompute level and max nerve atomically in the database update.
- Updated the profile page to show XP progress toward the next level and the current progression reward tier.
- Added formula coverage for progression snapshots and action experience rewards.
- Added `scripts/validate-mvp-gameplay.mjs` and `pnpm validate:mvp-gameplay` to enforce the MVP progression wiring.
- Added the gameplay validator to `pnpm validate:static`.

## Validation

Dependency-light checks executed successfully:

```bash
node --check scripts/validate-mvp-gameplay.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current static state:

- 29 migrations validated, continuous from `0000` to `0028`.
- 74 API route files audited.
- 56 unsafe/state-changing route files include route-level rate-limit helper usage.
- 74/74 API route files include request observability.
- 12 representative route contracts checked.
- 9 dedicated MVP player pages validated.
- MVP progression formulas, job/crime route progression snapshots, database level/max-nerve updates, and profile XP display validated.
- 74 API routes documented.
- 46 feature-history sections indexed.
- 0 migration, hardening, route-contract, MVP-page, MVP-gameplay, documentation, or CI workflow validation errors.

## Notes

`pnpm validate:static`, `pnpm typecheck`, and `pnpm test` still need to run in a fully installed environment with workspace dependencies available.

---

## Pass 49: Feature Pass 49 - Admin RBAC and Capability Gate

## Summary

Pass 49 closes the MVP admin-safety gap by replacing broad `isAdmin` checks in admin HTTP routes with explicit role/capability checks. Legacy `is_admin` users are preserved by a migration that backfills them to the `owner` admin role, while new deployments can assign narrower roles for support, moderation, economy operations, and game-master duties.

## Implemented

- Added `0029_admin_roles.sql`:
  - creates the `admin_role` enum;
  - adds `users.admin_role` with default `none`;
  - backfills existing `is_admin = true` users to `owner`;
  - indexes `users.admin_role` for operational queries.
- Added session exposure for `adminRole` in auth/session queries.
- Added shared admin capability policy in `apps/web/src/lib/admin-access.ts`:
  - roles: `none`, `support`, `moderator`, `economy_manager`, `game_master`, `owner`;
  - capabilities: `view_admin`, `search_players`, `manage_config`, `manage_announcements`, `moderate_content`, `enforce_players`, `manage_economy`;
  - legacy `isAdmin` remains a fallback to `owner` for backwards compatibility.
- Updated all 14 admin API route files to use `requireAdminCapability` with a route-specific capability.
- Updated the admin page gate to use `hasAdminCapability(..., 'view_admin')`.
- Added dependency-light RBAC drift validation:
  - `scripts/validate-admin-rbac.mjs`;
  - `pnpm validate:admin-rbac`;
  - included in `pnpm validate:static`.
- Updated representative route-contract checks to expect capability gates instead of broad admin checks.

## Capability map

- `view_admin`: admin dashboard, config read, audit read, announcements read, transparency read.
- `search_players`: admin character search.
- `manage_config`: game configuration writes.
- `manage_announcements`: announcement creation/publishing.
- `moderate_content`: moderation queues, report resolution, character flags.
- `enforce_players`: player status clear, enforcement apply/lift, appeal review.
- `manage_economy`: cash/bank balance adjustment.

## Validation

Dependency-light validation run directly with Node:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

The full `pnpm validate:static`, `pnpm typecheck`, and `pnpm test` commands still need to be run in an environment with pnpm and dependencies installed.

---

## Pass 50: Feature Pass 50 - Job Lifecycle MVP Completion

## Goal

Close the MVP job-loop gap by turning jobs from one-off work actions into a minimal employment lifecycle players can understand and test.

## Implemented

- Added `0030_job_lifecycle.sql`:
  - `job_status` enum.
  - `character_jobs` table.
  - one active job per character enforced by a partial unique index.
  - rank, shift count, total earnings, hire/promotion/end timestamps.
- Added `characterJobs` and `jobStatus` to the shared Drizzle schema.
- Added `db:apply:job-lifecycle` scripts at the root and DB package levels.
- Extended the jobs validator so `POST /api/jobs` accepts:
  - `action: "apply"`
  - `action: "work"`
  - `action: "resign"`
  - omitted `action`, which defaults to the legacy work action.
- Updated `POST /api/jobs`:
  - `apply` creates active employment after validating job requirements.
  - `work` requires matching active employment, completes a paid shift, awards XP, updates progression, increments shift count, tracks total earnings, and promotes ranks every five shifts up to rank 5.
  - `resign` closes active employment and records a resignation event.
- Updated `/jobs` to show current employment, rank, completed shifts, total earned, and the MVP API actions.
- Added `scripts/validate-job-lifecycle.mjs` and `pnpm validate:job-lifecycle`.
- Added job lifecycle validation to `pnpm validate:static`.

## Validation

Executed directly with Node in this sandbox:

```bash
node --check scripts/validate-job-lifecycle.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

## Current result

- 31 migrations are continuous from `0000` through `0030`.
- Job lifecycle schema, migration, route behavior, validator schema, and jobs page visibility are statically validated.
- The MVP job loop now supports apply, work, promotion, earnings history, and resignation.

## Remaining MVP focus

- Runtime install/typecheck/test/smoke remains required in an environment with pnpm and PostgreSQL.
- Crime failure and hospital/legal recovery should be completed next.
- Database-backed integration tests remain required before public MVP testing.

---

## Pass 51: Feature Pass 51 - Legal and Hospital Recovery MVP Completion

## Goal

Complete the MVP recovery loop for failed crime/jail/hospital consequences so players are not left stuck after timers expire and hospital care is safe to retry.

## Changes

- Added `POST /api/legal/hospital` as a legal-page hospital-care endpoint.
- Hardened `POST /api/hospital/care` with idempotency and character refresh before care purchase.
- Updated character refresh to clear expired jail and hospital statuses.
- Updated character refresh to complete active `jail_sentences` and `hospital_stays` records when their blocking status expires.
- Updated `GET /api/legal/status` to refresh both heat and character resource/status state before returning active legal/hospital state.
- Updated `/legal` to show MVP recovery actions for lawyers, bribes, hospital care, and status refresh.
- Added `scripts/validate-legal-recovery.mjs` and `pnpm validate:legal-recovery`.
- Added legal recovery validation to `pnpm validate:static`.

## Validation

Executed dependency-light validators directly:

```bash
node --check scripts/validate-legal-recovery.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

## Result

- MVP legal/hospital recovery wiring is now static-validated.
- Expired jail/hospital statuses no longer require a background release worker to unblock the player; normal character refresh clears them.
- Hospital care mutations are safer to retry through idempotency.

---

## Pass 52: Feature Pass 52 - MVP Release Runbook and Backup Readiness

## Goal

Move the project closer to MVP release readiness by documenting the first release-candidate process, adding backup/restore commands, and enforcing operational documentation drift through a dependency-light validator.

## Changes

- Added `docs/mvp-release-runbook.md` with the MVP release-candidate checklist.
- Added `docs/backup-restore.md` with PostgreSQL backup and restore procedures.
- Added `scripts/backup-db.sh` using `pg_dump` custom-format backups.
- Added `scripts/restore-db.sh` using `pg_restore` for backup recovery.
- Added root package scripts:
  - `pnpm db:backup`
  - `pnpm db:restore -- <backup-file>`
  - `pnpm validate:release-readiness`
- Added `scripts/validate-release-readiness.mjs`.
- Updated `pnpm validate:static` to include release-readiness validation.
- Updated README and project docs to point to the release runbook, backup/restore runbook, strict runtime smoke command, and the next runtime-validation stage.
- Fixed the fresh database setup command list in `docs/migration-guide.md` so it includes `pnpm db:apply:job-lifecycle`.

## Validation

The new validator checks that:

- README links the release, backup/restore, runtime smoke, and migration docs.
- `.env.example` contains the required runtime keys.
- `docker-compose.yml` still exposes PostgreSQL and Redis.
- backup/restore shell scripts exist, are executable, and call `pg_dump` / `pg_restore`.
- the MVP release runbook includes install, Docker, static validation, typecheck, test, strict smoke, backup, and rollback steps.
- package scripts expose release-readiness, backup, restore, runtime smoke, and CI validation commands.
- `validate:static` includes `pnpm validate:release-readiness`.

## Result

The repo now has an explicit MVP release process and a static gate to keep release-readiness documentation aligned with package scripts and operational helpers. The remaining blocker is executing the runbook in a fully installed environment with PostgreSQL, Redis, dependency install, typecheck, tests, strict smoke checks, and a real backup/restore trial.

---

## Pass 53: Feature Pass 53 - MVP Acceptance Gate and Root Script Alignment

## Summary

Feature Pass 53 turns the repository into a static MVP candidate by adding an explicit MVP acceptance checklist, a dependency-light acceptance validator, and root script alignment for the latest migration commands.

This pass does not claim runtime proof. A real installed environment still needs to run `pnpm validate:static`, `pnpm typecheck`, `pnpm test`, strict runtime smoke checks, and backup/restore verification.

## Changes

- Added `docs/mvp-acceptance.md` with MVP acceptance criteria, static gate expectations, runtime proof requirements, controlled test scope, and known post-MVP work.
- Added `scripts/validate-mvp-acceptance.mjs`.
- Added root `pnpm validate:mvp-acceptance`.
- Added missing root `pnpm db:apply:admin-roles` script so the README and migration guide commands work from the repo root.
- Updated `pnpm validate:static` so it includes the MVP acceptance validator.
- Updated README and status documentation to Feature Pass 53.
- Updated feature index, checklist, remaining work, API reference, and validation audit documentation.

## Validation

The dependency-light validators pass directly with Node:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

## Remaining MVP risk

The remaining MVP blocker is runtime proof in a real environment:

```bash
pnpm install
pnpm validate:static
pnpm typecheck
pnpm test
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
pnpm db:backup
pnpm db:restore -- <backup-file>
```

---

## Pass 54: Feature Pass 54 - Runtime Proof Orchestration

## Goal

Move the repo from a static MVP candidate toward a runtime-proven MVP by adding a single installed-environment command that executes the release proof sequence end to end.

## Changes

- Added `scripts/prove-mvp-runtime.mjs`.
- Added `pnpm prove:mvp-runtime`.
- Added `scripts/validate-runtime-proof.mjs`.
- Added `pnpm validate:runtime-proof`.
- Added `pnpm validate:runtime-proof` to `pnpm validate:static`.
- Updated the MVP release runbook with the one-command runtime proof path.
- Updated MVP acceptance docs with the runtime proof command.
- Updated runtime smoke and backup/restore docs to reference the orchestrated proof.
- Updated README, project status, remaining work, feature checklist, validation audit, migration guide, and feature index.

## Runtime proof command

Run this in a real environment with pnpm, Docker, PostgreSQL, Redis, and project dependencies available:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

The command performs:

1. `.env` creation from `.env.example` when missing.
2. `pnpm install`.
3. `docker compose up -d`.
4. Full SQL migration and seed chain through `0030_job_lifecycle.sql`.
5. `pnpm validate:static`.
6. `pnpm typecheck`.
7. `pnpm test`.
8. Web app startup.
9. Strict runtime smoke via `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime`.
10. Database backup creation.
11. Optional disposable restore proof when `MVP_RESTORE_DATABASE_URL` is set.

Preview the planned command sequence without changing local services:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```

## Validation

Executed in this sandbox:

- `node --check scripts/prove-mvp-runtime.mjs`
- `node --check scripts/validate-runtime-proof.mjs`
- `node scripts/validate-runtime-proof.mjs`
- existing dependency-light static validators

The actual runtime proof still must be executed outside the sandbox where pnpm, dependencies, Docker services, and PostgreSQL are available.

---

## Pass 55: Feature Pass 55 - Integration Test Readiness

## Goal

Add the database-backed integration-test lane needed to move the MVP from static candidate toward runtime-proven release candidate.

## Completed

- Added `docs/integration-testing.md` with disposable database setup, required environment variables, isolation rules, and MVP scenario coverage.
- Added `packages/db/src/testing/integration.ts` with safe opt-in helpers for disposable integration tests.
- Added `apps/web/src/lib/__tests__/mvp-flow.integration.test.ts` as the first opt-in DB-backed MVP integration test scaffold.
- Added `scripts/prove-integration.mjs` for applying the migration chain and running integration tests against `TEST_DATABASE_URL`.
- Added `scripts/validate-integration-tests.mjs` and `pnpm validate:integration-tests`.
- Added `pnpm test:integration` and `pnpm prove:integration`.
- Added integration-test validation to `pnpm validate:static`.

## Validation

- `node scripts/validate-integration-tests.mjs`
- Existing static validators should continue to pass.

## Remaining runtime step

Run `pnpm prove:integration` in an installed environment with a disposable PostgreSQL test database.

---

## Pass 56: Feature Pass 56 - Monetization Foundation

## Goal

Add a fair, non-pay-to-win monetization foundation that can support founder cosmetics, season-pass ownership, VIP convenience, and future provider-backed checkout without requiring live payment credentials for MVP testing.

## Completed

- Added `0031_monetization_foundation.sql`.
- Added `product_catalog`, `user_entitlements`, and `character_cosmetics` schema support.
- Seeded starter products for founder badge, founder frame, Season 1 pass, and VIP monthly placeholder.
- Added monetization query helpers for product catalog, user entitlements, grants, revocation, character cosmetics, and cosmetic equip state.
- Added checkout intent validator and cosmetic equip validator.
- Added `apps/web/src/lib/checkout.ts` with provider-safe disabled/placeholder checkout behavior.
- Added monetization API routes:
  - `GET /api/monetization/catalog`
  - `GET /api/monetization/entitlements`
  - `POST /api/monetization/checkout`
- Added `docs/monetization.md`.
- Added `scripts/validate-monetization-foundation.mjs` and `pnpm validate:monetization`.
- Added `pnpm db:apply:monetization`.
- Added monetization validation to `pnpm validate:static`.

## MVP policy

The foundation explicitly avoids pay-to-win mechanics. Initial monetization is limited to cosmetics, season-pass ownership, VIP convenience placeholders, and admin-granted founder/beta entitlements.

## Remaining runtime step

Apply `pnpm db:apply:monetization`, verify the seeded catalog, and keep checkout disabled until legal, support, refund, and provider adapters are complete.

---

## Pass 57: Feature Pass 57 - Playable MVP Action Forms

## Goal

Convert the core MVP player pages from read-only action references into authenticated, playable browser flows that call the existing API routes directly.

## Completed

- Added shared client action component:
  - `apps/web/src/features/game/action-form.tsx`
- Added browser action forms to `/jobs`:
  - apply
  - work shift
  - resign
- Added browser action forms to `/crimes`:
  - attempt crime
- Added browser recovery forms to `/legal`:
  - hire lawyer
  - attempt bribe
  - buy hospital care
- Added browser trading forms to `/market`:
  - buy local market item
  - sell inventory item
- Added browser shop-operation forms to `/shops`:
  - purchase listing
  - open/close owned shop
  - create listing from inventory
- Added browser social forms to `/messages`:
  - send message
- Added browser faction forms to `/factions`:
  - create faction
  - join faction
  - leave faction
- Added static playable-action validation:
  - `scripts/validate-playable-actions.mjs`
  - `pnpm validate:playable-actions`
- Added playable-action validation to `pnpm validate:static`.

## Notes

The new forms use the existing JSON API routes and refresh the server-rendered page after successful actions. They include idempotency keys for idempotency-protected mutations and omit empty optional fields where required.

## Remaining runtime step

Run the full runtime proof and browser-test the flows against a seeded database. The forms are statically wired, but real validation still requires the installed dependency stack and PostgreSQL runtime.

---

## Pass 58: Feature Pass 58 - Admin Operations UI Coverage

## Goal

Close a practical MVP operator gap by making the existing admin console cover the full first-pass moderation and enforcement workflow without requiring direct API calls or database access.

## Implemented

- Added admin-console action handling for resolving active character flags.
- Added admin-console action handling for clearing non-active character statuses from search results.
- Kept the existing admin browser workflows for:
  - character search;
  - config updates;
  - announcements;
  - character flagging;
  - enforcement application;
  - enforcement lifting;
  - appeal review;
  - moderation report resolution;
  - balance adjustments;
  - transparency summaries;
  - active flags, active enforcements, open appeals, and audit-log inspection.
- Added `scripts/validate-admin-operations-ui.mjs`.
- Added `pnpm validate:admin-operations-ui`.
- Wired admin-operations UI validation into `pnpm validate:static`.

## Validation

Dependency-light validation checks confirm that the admin page remains capability gated, the admin operations panel includes the required operator workflows, and the target admin API routes still use `requireAdminCapability` plus request observability.

## Remaining work

- Dedicated moderation archive/history pages.
- Inventory and session audit pages.
- Operator rollback/correction workflows.
- Abuse/anomaly detection dashboards.
- Runtime browser testing in a fully installed environment.

---

## Pass 59: Feature Pass 59 - Public Launch Polish

## Summary

Added public-facing launch readiness surfaces for beta testers and operators. This pass does not add runtime dependencies or API routes; it adds the policy, onboarding, and validation scaffolding needed before broader public MVP testing.

## Added

- Public app pages:
  - `/privacy`
  - `/terms`
  - `/rules`
  - `/onboarding`
- Launch documents:
  - `docs/privacy-policy.md`
  - `docs/terms-of-service.md`
  - `docs/community-rules.md`
  - `docs/beta-test-plan.md`
- Static validator:
  - `scripts/validate-public-launch.mjs`
  - `pnpm validate:public-launch`
- Static validation wiring through `pnpm validate:static`.

## Updated

- Home page links now expose onboarding, rules, privacy, and terms.
- README, MVP release runbook, MVP acceptance docs, project status, remaining work, feature checklist, API reference, and validation audit now document public launch polish.

## Validation

Run:

```bash
pnpm validate:public-launch
```

In this sandbox, the dependency-light validator was run directly with Node.

## Remaining work

- Replace draft privacy/terms content with jurisdiction-reviewed legal documents.
- Execute `pnpm prove:mvp-runtime` in a real installed environment.
- Execute `pnpm prove:integration` against a disposable database.
- Complete backup/restore drill and beta cohort readiness review.

---

## Pass 60: Feature Pass 60 - Site Quality: Accessibility, Responsive Design, PWA, and SEO

## Summary

Feature Pass 60 adds a dependency-light site-quality baseline across the web app. The pass focuses on broad improvements that help the MVP feel more production-ready before live runtime proof and beta testing.

## Implemented

- Added richer root metadata with title templates, canonical URL support, Open Graph metadata, Twitter card metadata, icons, and app metadata.
- Added viewport configuration with responsive scaling and dark theme color.
- Added a keyboard-visible skip link in the root layout.
- Added responsive global CSS tokens, focus-visible styles, reduced-motion handling, mobile navigation behavior, accessible touch target sizing, card/grid/action-form classes, and improved homepage link styling.
- Converted the home page and shared game page shell away from heavy inline style reliance toward reusable classes and named landmarks.
- Improved shared gameplay action forms with generated field IDs, `htmlFor`, `aria-describedby`, and polite status announcements.
- Added PWA manifest support through `apps/web/src/app/manifest.ts`.
- Added public SVG app icons and an Open Graph image.
- Added `robots.ts` and `sitemap.ts` for public route discoverability and private route exclusion.
- Added `docs/site-quality.md`.
- Added `scripts/validate-site-quality.mjs` and `pnpm validate:site-quality`.
- Added site-quality validation to `pnpm validate:static`.

## Validation

Dependency-light validation added in this pass:

```bash
pnpm validate:site-quality
```

The validator checks metadata, skip-link coverage, PWA manifest wiring, robots/sitemap files, public icon assets, responsive/focus CSS, shared game shell semantics, action-form accessibility wiring, documentation, and static-validation script registration.

## Runtime follow-up

Static validation does not replace browser testing. The release runbook should still include manual Lighthouse, keyboard, screen-reader, mobile viewport, and installability checks before beta launch.

---

## Pass 61: Feature Pass 61 - In-Progress Task Closure: Messages Page Completion

## Goal

Complete only work that was already marked in progress, without opening a new feature area.

This pass focuses on the in-progress Messages page task: active conversation actions, live inbox updates, block/report/mute controls, and report history visibility.

## Changes

- Added `apps/web/src/features/game/message-live-panel.tsx`.
- Added live SSE inbox summary on `/messages` using `GET /api/messages/stream`.
- Expanded `/messages` with browser actions for:
  - mark thread read
  - mute and unmute thread
  - leave thread
  - report message
  - block character
  - unblock character
- Added report history display on `/messages`.
- Added responsive `.action-grid` styles for compact multi-action message controls.
- Added `scripts/validate-in-progress-closures.mjs`.
- Added `pnpm validate:in-progress-closures`.
- Added the new validator to `pnpm validate:static`.

## Validation

The dependency-light validation suite passes in this sandbox, including the new in-progress closure validator.

Runtime validation with installed dependencies, PostgreSQL, Redis, and browser testing remains required in a real environment.

---

## Pass 62: Feature Pass 62 - In-Progress Task Closure: Shops, Newspaper, Profile, and Admin Visibility

## Goal

Complete the remaining in-progress product-page tasks without starting new gameplay systems. This pass focuses on surfacing already-implemented APIs and database data through usable MVP pages.

## Completed work

### Shops page completion

- Added an authenticated shop-opening form.
- Expanded nearby shop cards with rating, listing count, reputation, and advertising visibility.
- Added third-party shop reviews from the page.
- Kept purchasing available for non-owned active listings.
- Added owner controls for opening/closing shops, advertising shops, creating listings, and cancelling listings.
- Added owner-side listing management, ledger/sales history, review visibility, and active ad status.

### Newspaper page completion

- Added article submission from the newspaper page.
- Added first-pass archive/category grouping and source counts.
- Added reactions, comments, and article report actions on each article.
- Displayed recent comments, reaction totals, and report status for the active character.

### Profile page completion

- Added public-profile preview guidance that separates public signals from private/admin-only activity.
- Added active-title controls.
- Added claim flows for claimable achievements and objectives.
- Added richer achievement/activity summaries and visibility labels for recent events.

### Admin visibility completion

- Added moderation archive data for reviewed, dismissed, and actioned reports.
- Added recent session audit visibility with email, display name, IP address, user agent, last-seen, and expiry timestamps.
- Added inventory audit highlights for high-quantity item rows.
- Preserved the existing operations console actions for search, flags, enforcement, appeals, moderation, announcements, config, audit, and balance adjustments.

### Shared UI support

- Extended `GameActionForm` to support textarea fields so article, report, review, and description forms can use the same accessible action pattern.

## Validation

Dependency installation was not available in the execution environment, so `pnpm validate:static` could not be run directly. The underlying dependency-light Node validators were run individually and passed:

- `scripts/validate-admin-operations-ui.mjs`
- `scripts/validate-admin-rbac.mjs`
- `scripts/validate-ci-workflow.mjs`
- `scripts/validate-docs.mjs`
- `scripts/validate-in-progress-closures.mjs`
- `scripts/validate-integration-tests.mjs`
- `scripts/validate-job-lifecycle.mjs`
- `scripts/validate-legal-recovery.mjs`
- `scripts/validate-migrations.mjs`
- `scripts/validate-monetization-foundation.mjs`
- `scripts/validate-mvp-acceptance.mjs`
- `scripts/validate-mvp-gameplay.mjs`
- `scripts/validate-mvp-pages.mjs`
- `scripts/validate-playable-actions.mjs`
- `scripts/validate-public-launch.mjs`
- `scripts/validate-release-readiness.mjs`
- `scripts/validate-runtime-proof.mjs`
- `scripts/validate-site-quality.mjs`
- `scripts/audit-hardening.mjs`
- `scripts/audit-route-contracts.mjs`

A targeted TypeScript transpile parse check was also run against the changed TS/TSX files and passed. Full typecheck/build still requires installed workspace dependencies.

## Remaining blocker

The project remains an MVP candidate pending real-environment runtime proof with installed dependencies, PostgreSQL, and Redis. The next pass should execute `pnpm prove:mvp-runtime` and `pnpm prove:integration` against disposable infrastructure, then fix any runtime failures found.

---

## Pass 63: Feature Pass 63 - Account recovery and verification

## Summary

Feature Pass 63 starts the remaining not-yet-started feature backlog by completing the auth account-recovery slice.

## Implemented

- Added `0032_auth_account_recovery.sql` for `users.email_verified_at`, `password_reset_tokens`, and `email_verification_tokens`.
- Added Drizzle schema and query helpers for hashed one-time password reset and email verification tokens.
- Added password reset request and confirm API routes with generic request responses to avoid account enumeration.
- Added email verification request and confirm API routes.
- Added `/forgot-password`, `/reset-password`, `/request-verification`, and `/verify-email` pages.
- Added login/register navigation for recovery and verification flows.
- Registered `db:apply:auth-recovery` scripts at root and database package level.
- Added maintenance cleanup for expired or used account-recovery tokens.

## Notes

- Development responses expose the generated reset/verification URLs for local testing.
- Production responses intentionally omit raw tokens. A real email delivery adapter is still needed before public launch.
- Password reset invalidates existing sessions for the account after a successful password change.

## Validation

- Dependency-light migration validation remains runnable with `node scripts/validate-migrations.mjs`.
- TypeScript parse/transpile checks were run against the changed auth/database files in this pass.
- Full dependency-backed typecheck/build and runtime proof still require an installed environment with PostgreSQL/Redis.

---

## Pass 64: Feature Pass 64 - Documentation Retrieval Refactor

## Goal

Reduce future context and memory cost by creating a compact documentation retrieval layer. The historical pass notes remain available, but future implementation passes can start from a small set of current-state and task-handoff files.

## Changes

- Added `docs/README.md` as the first-read documentation map and retrieval rules.
- Added `docs/current-state.md` as the compact project status brief.
- Added `docs/next-task-brief.md` as the next-pass handoff for runtime proof execution.
- Added `docs/backlog-index.md` as a compact map of not-started and thin feature areas.
- Shortened `README.md` so it points to retrieval docs instead of embedding the full pass history.
- Updated `docs/feature-index.md`, `docs/project-status.md`, and `docs/remaining-work.md` to reference the new retrieval layer and Feature Pass 64.
- Corrected stale status references that still described password reset/email verification as not implemented after Feature Pass 63.

## Validation

- `node scripts/validate-docs.mjs`
- `node scripts/validate-migrations.mjs`

Full dependency-backed validation remains pending in an installed environment.

---

## Pass 65: Feature Pass 65 - TypeScript 6 Config Compatibility

## Goal

Fix workspace package builds that failed under newer TypeScript with `TS5101` because `baseUrl` is deprecated and the repo still used it for path aliases.

## Changes

- Removed deprecated `compilerOptions.baseUrl` from the root TypeScript config.
- Removed deprecated `compilerOptions.baseUrl` from `apps/web/tsconfig.json`.
- Updated path alias targets to explicit relative paths so aliases continue to resolve without `baseUrl`:
  - `@drugdeal/db`
  - `@drugdeal/game`
  - `@drugdeal/validators`
  - `@drugdeal/ui`
  - `@/*` in the web app.
- Added direct `@types/node` dev dependencies to packages that compile `node:test` files:
  - `packages/game`
  - `packages/validators`
- Fixed two package-game type issues surfaced after the config migration:
  - normalized crafting input entries now retain `[string, number]` tuple typing.
  - vehicle-specific modifiers are now part of `EquipmentModifiers` and normalization.

## Validation

Performed in this environment:

- Confirmed the original `TS5101`/`baseUrl` deprecation error no longer appears when running `tsc --noEmit` in:
  - `packages/game`
  - `packages/ui`
  - `packages/validators`

Known local limitation:

- This execution environment does not have the repo dependencies installed, so direct package `tsc --noEmit` checks still report missing dependency typings such as `node:test`, React JSX types, and `zod`. The package manifests now declare the missing direct Node typings where needed; a real `pnpm install` environment should resolve the dependency-backed type declarations.

---

## Pass 66: Feature Pass 66 - Docker Compose Registry Resilience

## Goal

Fix local setup failures where Docker Compose could not fetch the PostgreSQL and Redis images.

## Changes

- Updated `docker-compose.yml` so PostgreSQL and Redis images are configurable through environment variables:
  - `POSTGRES_IMAGE`
  - `REDIS_IMAGE`
- Changed default image references to AWS Public ECR mirrors of the official Docker images:
  - `public.ecr.aws/docker/library/postgres:16-alpine`
  - `public.ecr.aws/docker/library/redis:7-alpine`
- Added configurable local ports:
  - `POSTGRES_PORT`
  - `REDIS_PORT`
- Added configurable PostgreSQL bootstrap values:
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
- Added PostgreSQL and Redis health checks so `docker compose ps` shows whether services are ready.
- Added a Redis data volume and append-only persistence for a more realistic local worker/runtime proof.
- Updated `.env.example`, README, migration guide, runtime smoke guide, release runbook, current-state brief, next-task brief, remaining-work notes, and validation audit notes.

## Docker Hub override

Use these values in `.env` if the environment can fetch Docker Hub but not AWS Public ECR:

```dotenv
POSTGRES_IMAGE=docker.io/library/postgres:16-alpine
REDIS_IMAGE=docker.io/library/redis:7-alpine
```

Use a private registry mirror by setting those same variables to the internal image names.

## Validation

Dependency-light documentation and static validation scripts were run after the compose/docs update. Docker itself was not available in the sandbox, so image pulling and health checks still need to be confirmed in the user's local environment.

## Next step

Run:

```bash
docker compose up -d
docker compose ps
```

Then continue with the installed-environment MVP proof from `docs/next-task-brief.md`.

---

## Pass 67: Feature Pass 67 - Player Banking and Finance History

## Goal

Close a compact economy backlog slice now that the platform is stable enough for additional feature work: player bank deposits/withdrawals and finance price-history retrieval.

## Changes

- Added shared banking formulas in `@drugdeal/game`:
  - `normalizeBankTransferAmount`
  - `calculateBankTransfer`
- Added unit coverage for banking normalization, successful deposits, insufficient-cash deposit calculations, and withdrawals.
- Added `bankTransferSchema` and `financePriceHistoryQuerySchema` validators.
- Added `transferBankFunds` in `@drugdeal/db` with:
  - user/character ownership checks;
  - free-status requirement;
  - database-level conditional writes for cash-to-bank and bank-to-cash movement;
  - financial transaction logging;
  - player event logging.
- Added `POST /api/bank` with auth, rate limiting, request validation, observability, and idempotency support.
- Added `listAssetPriceHistory` and `GET /api/finance/history` for authenticated chart/history consumers.
- Added player-facing Banking controls to the dashboard economy section.
- Restored static drift issues found during validation:
  - `docs/migration-guide.md` now includes `0033_runtime_schema_repair.sql`.
  - the legal page now includes the validated `POST /api/legal/hospital` route marker.
  - backup/restore/proof scripts are executable in the working tree.
  - `.github/workflows/ci.yml` has been restored with the expected `pnpm validate:ci` lane.

## Validation

Dependency-light validation completed in this environment:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-in-progress-closures.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

## Known limitation

The sandbox does not have `pnpm` dependencies installed, so dependency-backed `pnpm typecheck`, `pnpm test`, and runtime PostgreSQL/Redis proof still need to run in the installed project environment.

## Next step

Run the installed proof path, then continue with the next compact economy slice: banking history UI, money sinks, or player-to-player trade.

---

## Pass 68: Feature Pass 68 - Bank History and Finance Chart UI

## Goal

Continue the compact economy/product pass after Feature Pass 67 by making the new banking and finance-history capabilities visible to players instead of leaving them as API-only surfaces.

## Changes

- Added `bankHistoryQuerySchema` to the shared validators package.
- Added `listCharacterBankTransactions` in `@drugdeal/db` to return recent authenticated bank ledger rows for the owning player only.
- Added `GET /api/bank/history` with auth, rate limiting, query validation, request observability, and not-found handling.
- Wired dashboard data loading to fetch recent bank transactions for the active character.
- Added a Recent bank activity panel to the dashboard economy section, including signed amounts, timestamps, and post-transfer balances when metadata is available.
- Added client-side finance-history loading in the dashboard economy section using the existing `GET /api/finance/history` route.
- Added first-pass SVG sparklines and 24-point trend summaries for listed stocks/crypto assets.
- Updated API documentation and current-state/backlog docs for the new economy UI slice.

## Validation

Dependency-light validation completed in this environment:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-in-progress-closures.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
tsc --noEmit --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck apps/web/src/features/dashboard/character-panel.tsx apps/web/src/app/'(game)'/dashboard/page.tsx apps/web/src/app/api/bank/history/route.ts packages/db/src/queries/finance.ts packages/validators/src/index.ts
```

Validation results of note:

- API docs now cover 85 concrete API route files.
- Hardening audit reports 85 observed route wrappers and zero errors/warnings.
- Representative route contracts still pass.
- Documentation drift validation reports zero errors.
- A targeted TypeScript parse check on the edited files found no syntax-level TypeScript errors; unresolved dependency/module errors remain expected without installed workspace dependencies.

## Known limitation

The sandbox still does not have `pnpm` or installed workspace dependencies, so dependency-backed `pnpm typecheck`, `pnpm test`, and PostgreSQL/Redis runtime proof still need to run in the installed project environment.

## Next step

Run the installed runtime proof. If that proof has already passed outside this snapshot, continue with a compact economy slice such as money sinks, player-to-player trade, or loans.

---

## Pass 69: Feature Pass 69 - Money Sink Catalog and Dashboard Controls

## Goal

Add the next compact economy slice after banking and finance charting: optional money sinks that remove cash or bank funds from the economy without requiring new schema or a broad balance refactor.

## Implemented

- Added shared money-sink definitions and purchase calculation helpers in `packages/game/src/economy.ts`.
- Added `GET /api/economy/sinks` for authenticated catalog retrieval.
- Added `POST /api/economy/sinks` for authenticated, rate-limited, idempotent purchases.
- Added conditional source-specific debits from cash or bank balance.
- Added financial transaction logging and player event logging for each purchase.
- Added dashboard controls in the Economy section to buy configured sinks with cash or bank funds.
- Added pure game-rule tests for catalog lookup, missing sinks, successful cash purchases, insufficient cash, and successful bank purchases.

## Current catalog

- `safehouse_upkeep` - small maintenance drain.
- `private_transport` - medium service retainer drain.
- `personal_security` - larger protection-themed drain without combat/stat advantage.
- `luxury_lifestyle` - high-cost lifestyle drain for high-cash characters.

## Validation

Dependency-light validation completed in this environment:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-in-progress-closures.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Additional targeted validation:

- API documentation drift check reports 86 / 86 concrete routes documented.
- Hardening audit reports 86 route wrappers and zero errors/warnings.
- Representative route contracts pass.
- Targeted TypeScript parse check reports no syntax-level errors in edited files.

## Still blocked outside this sandbox

Full dependency-backed validation still needs an installed environment with pnpm, workspace dependencies, PostgreSQL, Redis, and a disposable restore database:

```bash
pnpm typecheck
pnpm test
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
pnpm prove:integration
```

---

## Pass 70: Feature Pass 70 - Character Loans and Bank Repayment

## Summary

Feature Pass 70 adds first-pass fictional loan support to the economy loop. The pass keeps the feature compact: loans are bank-funded, bank-repaid, limited to one active loan per character, and fully auditable through the finance/event ledgers.

## Added

- Shared loan offer catalog and pure loan calculations in `packages/game/src/economy.ts`.
- Loan formula tests for offer lookup, level/active-loan gating, and outstanding-balance calculation.
- `0034_character_loans.sql` with:
  - `character_loans` ledger table;
  - status and due-date indexes;
  - one-active-loan-per-character partial unique index.
- Drizzle schema export for `characterLoans`.
- Database query functions:
  - `listLoanOffers()`;
  - `listCharacterLoans()`;
  - `requestCharacterLoan()`;
  - `repayCharacterLoan()`.
- New API route: `GET, POST /api/economy/loans`.
- Loan request validation through `loanCenterQuerySchema` and `loanActionSchema`.
- Dashboard Loans card with:
  - active loan summary;
  - offer list;
  - level and active-loan lock messaging;
  - bank repayment button;
  - recent loan history.

## Safety and balance notes

- Loans are fictional, abstract, and limited to flat-fee repayment.
- Loan funds are deposited into the bank instead of directly increasing pocket cash.
- Repayment draws from bank balance only, which keeps the feature aligned with the banking system added in Feature Pass 67.
- One active loan per character is enforced at the database level with a partial unique index.
- Overdue/default enforcement is intentionally left as future depth after runtime proof.

## Validation run in this sandbox

```txt
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
```

A targeted TypeScript transpile parse was also run over the edited TypeScript/TSX files.

## Not run here

```txt
pnpm typecheck
pnpm test
pnpm prove:mvp-runtime
pnpm prove:integration
```

This sandbox still lacks `pnpm`, Docker, PostgreSQL, Redis, and installed workspace dependencies.

---

## Pass 71: Feature Pass 71 - Loan Overdue and Default Handling

## Summary

Feature Pass 71 completes the first overdue/default layer for the fictional loan system introduced in Feature Pass 70. Loans can now move from active to overdue/defaulted states, the worker processes default transitions, repayment still works for unresolved defaulted loans, and the dashboard shows the default window clearly.

## Added

- Shared loan lifecycle helper in `packages/game/src/economy.ts`:
  - active before due date;
  - overdue after due date;
  - defaulted after a 24-hour grace window;
  - repaid/cancelled rows remain closed and non-overdue.
- Formula tests for active, overdue, defaulted, and repaid lifecycle states.
- New migration: `0035_loan_defaulting.sql`.
  - Replaces the one-active-loan guard with a one-unresolved-loan guard for `active` and `defaulted` loans.
  - Adds an active due-date index for worker scans.
- Loan query updates:
  - loan lists now include `lifecycleStatus`, `isOverdue`, `isDefaulted`, `hoursPastDue`, and `defaultAt`;
  - defaulted loans are treated as unresolved and block new loan requests until repaid;
  - repayment accepts both `active` and `defaulted` loans.
- Worker default processing:
  - new `processLoanDefaults()` database function;
  - new `apps/worker/src/ticks/loan-tick.ts`;
  - worker startup now schedules the loan tick every two minutes.
- Default audit logging:
  - `loan_defaulted` player events;
  - zero-amount system financial transaction entries for default audit visibility;
  - compact metadata containing due date, default date, grace hours, outstanding balance, and heat delta.
- Dashboard loan UI improvements:
  - defaulted loan state label;
  - overdue hours display;
  - default review timestamp;
  - recent-loan rows show lifecycle status instead of only raw status.
- Runtime/integration proof scripts now include the current migration chain through `db:apply:loan-defaulting`.

## Safety and balance notes

- The system remains fictional and abstract. Default handling is a game-state transition, not real-world financial advice or collection guidance.
- Defaults add a small heat penalty and an audit trail instead of using aggressive collection mechanics.
- Defaulted loans remain repayable from bank balance and continue to block new loans until resolved.
- The database guard now protects one unresolved loan per character across both `active` and `defaulted` states.

## Validation run in this sandbox

```txt
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

A targeted TypeScript transpile parse was also run over the edited TypeScript/TSX files.

## Not run here

```txt
pnpm typecheck
pnpm test
pnpm prove:mvp-runtime
pnpm prove:integration
```

This sandbox still lacks `pnpm`, Docker, PostgreSQL, Redis, and installed workspace dependencies.

---

## Pass 72: Feature Pass 72 - Partial Loan Repayment Controls

## Goal

Close the next small economy gap after first-pass loans and default handling by allowing players to repay loans incrementally from bank balance instead of requiring a full payoff in one action.

## Implemented

- Added `calculateLoanRepayment` to the shared game economy rules.
- Extended `POST /api/economy/loans` repayment payloads with an optional positive integer `amount`.
- Updated loan repayment persistence to:
  - clamp payments to the outstanding balance;
  - debit the character bank by the applied payment only;
  - increment `repaid_amount` without closing the loan until fully paid;
  - mark the loan `repaid` only when the total due is fully covered;
  - preserve defaulted loans as repayable until fully settled.
- Added financial transaction metadata for partial and final payments.
- Added player events for `loan_payment` and `loan_repaid` outcomes.
- Updated the dashboard loan card with a repayment amount form and paid-vs-total progress text.
- Added pure formula coverage for partial payment, full payoff, and insufficient bank balance cases.

## Files changed

- `packages/game/src/economy.ts`
- `packages/game/src/__tests__/economy-progress.test.ts`
- `packages/db/src/queries/economy.ts`
- `packages/validators/src/index.ts`
- `apps/web/src/app/api/economy/loans/route.ts`
- `apps/web/src/features/dashboard/character-panel.tsx`
- `docs/api-reference.md`
- `docs/current-state.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/backlog-index.md`
- `docs/feature-checklist.md`
- `docs/feature-index.md`
- `docs/validation-audit.md`
- `README.md`

## Validation

Dependency-light validation was run in this sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

A targeted TypeScript transpile parse was also run over the edited TypeScript/TSX files.

## Not run here

- `pnpm typecheck`
- `pnpm test`
- `pnpm prove:mvp-runtime`
- `pnpm prove:integration`

Those still require an installed environment with pnpm, workspace dependencies, Docker, PostgreSQL, Redis, and a disposable restore database.

---

## Pass 73: Feature Pass 73 - Admin Loan Exposure Visibility

## Goal

Add a small, operationally useful loan-review surface after the player-facing loan passes. The pass focuses on visibility only: economy managers can review loan exposure, overdue/default queues, and repayment state without adding any new loan mutation path.

## Added

- New `GET /api/admin/economy/loans` endpoint.
- Guarded by `requireAdminCapability(request, 'manage_economy')`.
- Route-level rate limiting and request observability.
- Query validation through `adminLoanExposureQuerySchema`.
- Supports:
  - `status=all|active|overdue|defaulted|repaid`
  - `q` search across character name, user email/display name, character id, or loan id
  - `limit` and `offset` pagination
- New `listAdminLoanExposure()` DB query helper.
- Loan exposure summary counts:
  - active
  - overdue
  - defaulted
  - repaid
  - unresolved outstanding
  - lifetime due
  - lifetime repaid
- Admin console **Loan exposure** card.
- Operations console now shows loan state, outstanding amount, total due, paid amount, due date, hours past due, player bank/cash context, level, heat, and character id.

## Files touched

- `apps/web/src/app/api/admin/economy/loans/route.ts`
- `apps/web/src/app/(admin)/admin/page.tsx`
- `apps/web/src/features/admin/admin-panel.tsx`
- `packages/db/src/queries/admin.ts`
- `packages/validators/src/index.ts`
- `docs/api-reference.md`
- `docs/current-state.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/feature-checklist.md`
- `docs/backlog-index.md`
- `docs/next-task-brief.md`
- `docs/feature-index.md`
- `docs/validation-audit.md`
- `scripts/validate-admin-operations-ui.mjs`

## Validation

Dependency-light validation performed in this sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-migrations.mjs
node scripts/audit-route-contracts.mjs
```

Targeted TypeScript transpile parse was also run against the edited TypeScript/TSX files with the globally available TypeScript compiler API.

## Still not run here

The sandbox still does not contain the installed workspace dependencies, PostgreSQL, Redis, Docker runtime services, or a disposable restore database. These remain required for:

```bash
pnpm typecheck
pnpm test
pnpm prove:mvp-runtime
pnpm prove:integration
```

## Type-safety hotfix

A follow-up TypeScript check reported that `listCharacterBankTransactions()` returned Drizzle `jsonb` metadata as `unknown`, while the dashboard bank activity prop expects narrowed bank-transfer metadata.

Fixed in this package by normalizing bank transaction metadata inside `packages/db/src/queries/finance.ts` before rows reach the dashboard or the bank-history API. The helper now exposes only the dashboard-safe fields:

- `action`
- `cashAfter`
- `bankAfter`

Numeric string values are also coerced safely for compatibility with older rows.

## Dashboard section performance hotfix

A follow-up usability check found that swapping between sections on the dashboard could feel slow or occasionally unresponsive.

Fixes applied:

- Same-page section links in `GameSideMenu` now use lightweight anchor handling instead of routing through the Next.js app router for hash-only navigation.
- Same-page section clicks update the hash, dispatch the existing `hashchange` listener, and scroll after the section visibility update is queued.
- Dashboard hash handling now skips redundant state updates when the requested section is already active.
- Finance sparkline history loading is now deferred until the Economy section is opened instead of starting ten chart-history fetches during initial dashboard hydration.
- Finance history fetch completion is batched into one state update instead of one state update per asset.
- Hidden `ActionCard` instances now return `null`, preventing hidden cards from mapping/rendering their full item lists while another section is active.

Files touched:

- `apps/web/src/features/game/game-side-menu.tsx`
- `apps/web/src/features/dashboard/character-panel.tsx`
- `docs/feature-history.md#pass-73`
- `docs/current-state.md`
- `docs/project-status.md`
- `docs/remaining-work.md`
- `docs/validation-audit.md`

Targeted validation rerun:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-in-progress-closures.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

A targeted TypeScript transpile parse also passed for the two edited TSX files.

## Validation hotfix: game test and repeatable runtime proof

A follow-up local validation run found two issues:

- `packages/game` had a stale expected legacy-points value in `meta-admin.test.ts`. The current formula correctly returns `36` for the fixture, so the test expectation was updated from `16` to `36`.
- `pnpm prove:mvp-runtime` applied migrations against the default local database and failed on repeated runs when `character_status` already existed. The runtime proof now prepares and uses a disposable proof database by default.

Runtime proof changes:

- Added `packages/db/scripts/prepare-mvp-proof-database.ts`.
- Added `@drugdeal/db` script `db:prepare:mvp-proof`.
- `scripts/prove-mvp-runtime.mjs` now loads `.env`, derives a separate `*_mvp_proof` database from `DATABASE_URL`, drops/recreates that proof database, and runs migrations, validation, runtime smoke, and backup against the isolated proof database.
- Set `MVP_PROOF_DATABASE_URL` to choose a specific disposable proof DB.
- Set `MVP_PROOF_USE_CURRENT_DATABASE=true` only when deliberately testing against the current `DATABASE_URL`.
- Windows child-process execution now uses direct `pnpm.cmd` / `docker.exe` invocation instead of `shell: true`, avoiding the Node 25 shell-argument deprecation warning.

---

## Pass 74: Documentation File Count Consolidation

Consolidated the historical per-pass audit trail from many `docs/feature-pass-XX.md` files into `docs/feature-history.md`. Removed `docs/feature-index.md` because the consolidated history file now contains its own quick index. Updated docs retrieval guidance and validation scripts so `pnpm validate:docs` verifies the consolidated history instead of individual pass files.

Validation performed:

- `node scripts/validate-docs.mjs`
- `node scripts/validate-migrations.mjs`
- `node scripts/validate-site-quality.mjs`
- `node scripts/validate-public-launch.mjs`
- `node scripts/validate-mvp-acceptance.mjs`
- `node scripts/validate-runtime-proof.mjs`
- `node scripts/validate-release-readiness.mjs`

---



---

## Pass 75: Richer Banking Statements and CSV Export

Added filtered bank-statement retrieval on top of the existing bank-history route. `GET /api/bank/history` now accepts action/date/pagination filters and can return either JSON with summary totals or `format=csv` for a downloadable statement. The database query layer now exposes `listCharacterBankStatement()` while preserving the existing `listCharacterBankTransactions()` compatibility helper.

Dashboard Economy now includes a bank-statement loader, action/date/row filters, inflow/outflow/net summary cards, and a latest-statement CSV download link. Bank transaction metadata normalization now includes before/after cash and bank values where available.

Validation performed in the sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-site-quality.mjs
```

Targeted TypeScript transpile parsing was run for edited route, dashboard, query, and validator files. Full dependency-backed typecheck/tests/runtime proof still require a local installed environment.
---

## Pass 75 stability hotfix: dashboard section loop, form reset, and message unread query

A follow-up runtime check found three regressions after the dashboard performance and banking statement passes:

- Economy-section finance history could enter a maximum-update-depth loop when the finance asset list was empty because the effect kept replacing state with a new empty object.
- Message and community forms called `event.currentTarget.reset()` after awaiting an async action, which could fail when React cleared `currentTarget`.
- Message-center unread counts used a raw timestamp-cast SQL condition that could bind local `Date` strings and fail at runtime.

Fixes applied:

- Finance-history state now only clears when there is existing finance history state to clear.
- Form handlers capture the form element before awaiting and reset the captured form reference.
- Message unread counts now use Drizzle predicates with an optional `gt(messages.createdAt, membership.lastReadAt)` condition instead of raw duplicated timestamp parameters.

Validation performed in the sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-runtime-proof.mjs
```

Full `pnpm typecheck`, `pnpm test`, and runtime proof still require the installed local workspace.



---

## Pass 76: Market Event Formula Foundation

Added the first deterministic supply/demand event foundation in `@drugdeal/game` without adding runtime breadth before installed-environment proof. The economy helpers now expose market pressure snapshots, copied market-event definitions, and an impact calculator that adjusts supply, demand, volatility, risk, and bounded price output for shortage, surplus, demand spike, crackdown, and route-disruption scenarios.

This pass keeps events formula-level only. Runtime scheduling, database persistence, API/UI surfacing, newspaper/news effects, and balance tuning remain follow-up work after local proof.

Validation performed in the sandbox:

```bash
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/economy.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.


---

## Pass 77: Market Event Scheduling and News Payload Helpers

Extended the Feature Pass 76 market-event foundation with deterministic shared helpers that are safe to validate without database/runtime dependencies. The game package can now choose a cadence-bucket market event per location/item/seed, calculate upcoming/active/expired lifecycle status, and generate a market-category newspaper article payload with metadata for later persistence.

This pass keeps runtime breadth intentionally small: no database table, worker publisher, API response, or UI panel was added yet. The next market-event implementation pass should persist scheduled occurrences, expose active events through market routes, and publish generated article payloads through the existing newspaper system.

Validation performed in the sandbox:

```bash
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/economy.ts
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/economy.ts packages/game/src/__tests__/economy-progress.test.ts
```

The second check used temporary `node:test`/`node:assert` declaration stubs because the uploaded workspace has no installed `@types/node`. Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.

---

## Pass 78: Market Event Persistence, API Surfacing, UI Alerts, and Worker Publishing

Closed the first runtime wiring slice for the market-event system introduced in passes 76 and 77. Market events now have a `market_events` database migration/schema, query helpers to schedule deterministic occurrences from current market rows, active-event retrieval with impact previews, automatic newspaper article publication for active unpublished events, and expiry handling.

Runtime wiring added:

- `runMarketEventTick()` schedules occurrences per market location, publishes active unpublished events to `newspaper_articles`, and marks old scheduled events expired.
- The worker market tick now calls the persisted event tick instead of logging a placeholder.
- `/api/market` now returns `activeEvents` alongside market rows.
- The Market page displays live event alert cards with item, risk delta, lifecycle status, and price-impact preview.
- Root/database package scripts now include `db:apply:market-events` for the new migration.

Validation performed in the sandbox:

```bash
node scripts/validate-migrations.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/economy.ts
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/economy.ts packages/game/src/__tests__/economy-progress.test.ts
```

A dependency-backed TypeScript check over the changed DB/worker/web files was attempted but blocked because the uploaded workspace has no installed `drizzle-orm`, Next/React, workspace package type links, or `@types/node`. Full migration, worker, API, UI, typecheck, tests, and runtime proof still require the installed local workspace.


---

## Pass 79: Player-to-Player Trade Offers

Added a larger economy/multiplayer slice for reserved-inventory player trades. The new `player_trade_offers` migration and schema reserve seller inventory when a private offer is created, require the buyer to explicitly accept before money changes hands, return reserved inventory on cancel/expiry, and record player events plus financial transactions for accepted trades and handling fees.

Runtime/API/UI wiring added:

- `calculatePlayerTradeQuote()` and `calculatePlayerTradeExpiry()` shared helpers in `@drugdeal/game`.
- Database query helpers for trade-center retrieval, candidate listing, offer creation, acceptance, cancellation, and expiry.
- `POST /api/trades`, `GET /api/trades`, and `POST /api/trades/[tradeOfferId]` routes with auth, rate limiting, idempotency, and validator schemas.
- `/trades` browser page with nearby recipient selection, inventory-backed offer creation, received-offer acceptance, sent-offer cancellation, and recent trade history.
- Worker `trade-tick` to expire open offers and return reserved inventory.
- Root/database package scripts now include `db:apply:player-trades` for migration application.

Validation performed in the sandbox:

```bash
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/economy.ts packages/game/src/__tests__/economy-progress.test.ts
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
```

Changed DB/web/worker/validator TypeScript files were syntax-transpiled with the local TypeScript compiler API. Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.

---

## Pass 80: Player Trade Build Fix and Exposure Summary

Fixed the dependency-backed `packages/db` build failure reported after Pass 79 by adding the player-trade cooldown keys to the shared `GameActionType` union used by action locks. Accepting private trade offers now checks the buyer's accept cooldown before any money or inventory movement.

This pass also adds a larger trade-hardening slice: shared player-trade summary formulas calculate open sent/received exposure, reserved inventory value, pending buyer cost, completed trade volume, seller payout, fees, cancellations, and expiries. The trade-center query now returns that summary, and the `/trades` page displays it as a quick exposure panel above offer creation and offer lists.

Validation performed in the sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/economy.ts
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/economy.ts packages/game/src/__tests__/economy-progress.test.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.



---

## Pass 81: Timed Progression and Course Prerequisites

Closed the first progression-depth slice for training and education. Shared game helpers now calculate timed progression plans, course requirement results, and active progression queue summaries. Training and education API actions now schedule progression rows with due times and action cooldown metadata instead of awarding stat gains immediately.

Runtime wiring added:

- `0038_progression_timers.sql` adds `due_at` columns, progression due indexes, required course levels, and prerequisite-course metadata.
- `completeDueProgression()` completes scheduled training/course rows, grants stat/XP/level/max-nerve rewards, and records completion events.
- Worker `progression-tick` runs due progression completion every minute.
- The dashboard disables locked courses, shows course requirement reasons, starts timed training/education, and displays active training/course queue items.

Validation performed in the sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/progression.ts packages/game/src/__tests__/economy-progress.test.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.

---

## Pass 82: Inventory Item Actions

Added a larger item-system slice covering item rarity, consumable effects, inventory exposure summaries, and direct item transfers. Shared game helpers now normalize rarity, calculate rarity value multipliers, evaluate consumable effects against bounded character resources, and summarize inventory stack value/risk.

Runtime/API/UI wiring added:

- `0039_inventory_item_actions.sql` introduces the `item_rarity` enum, rarity backfill, and first-aid consumable metadata.
- Database inventory helpers list stack exposure summaries, use consumables with cooldown/idempotency support, and transfer item stacks to free same-location characters.
- `GET, POST /api/inventory` exposes inventory profile retrieval plus `use` and `transfer` actions.
- `/inventory` adds a dedicated browser page for stack summaries, consumable controls, transfer candidates, and risk review.
- The game sidebar now links to Inventory.

Validation performed in the sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/inventory.ts
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/economy.ts packages/game/src/progression.ts packages/game/src/inventory.ts packages/game/src/index.ts packages/game/src/__tests__/economy-progress.test.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.

---

## Pass 83: Legal Resolution and Jail Activities

Closed a broader legal-gameplay slice while keeping the system fictional and abstract. The legal module now has shared deterministic formulas for fine settlement, bail settlement, court-hearing outcomes, and jail-only activities. These helpers expose bounded costs, release reductions, heat changes, stat gains, and cooldown-friendly metadata without adding real-world procedural detail.

Runtime/API/UI wiring added:

- `POST /api/legal/jail` supports `pay_fine`, `post_bail`, and `jail_activity` actions with auth, rate limiting, idempotency, and jail-activity cooldowns.
- `POST /api/legal/court` supports abstract court hearings with auth, rate limiting, idempotency, and court cooldowns.
- Database legal helpers settle active jail sentences, debit cash/bank payment sources, resolve court outcomes, perform jail-only activities, update character status/release windows, write legal-service logs, financial transactions, and player events.
- The Legal page now shows estimated fine/bail settlement costs and exposes fine, bail, court, and jail-activity controls alongside existing lawyer, bribe, and hospital-care actions.
- `GameActionType` and validators now cover legal court and jail-activity actions.

Validation performed in the sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/legal.ts
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck /tmp/node-test-stubs.d.ts packages/game/src/legal.ts packages/game/src/__tests__/legal.test.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.

## Feature Pass 84 - Faction operations and idempotent migration runner

- Added `packages/db/scripts/apply-migrations.ts`, a tracked SQL migration runner that creates `schema_migrations`, hashes migration contents, applies missing `packages/db/drizzle/*.sql` files in filename order, and skips already-applied files.
- Added `pnpm db:apply:all` at the root and database package levels, then updated `scripts/prove-mvp-runtime.mjs` to use the idempotent runner.
- Added migration-runner validation to the runtime-proof audit and relaxed migration coverage validation when the all-runner is present.
- Added faction member profile data to faction detail queries.
- Expanded the Factions page with faction bank forms, boss-only member role updates, member permission summaries, and territory scout/claim/reinforce/attack controls with cooldown feedback.
- Restored `.github/workflows/ci.yml` with Node 22, Corepack, pnpm install, and `pnpm validate:ci`.


## Feature Pass 85 - Faction armory

- Added `faction_inventory_items` with idempotent SQL migration `0040_faction_armory.sql`, schema mappings, and dedicated apply scripts while preserving the all-migration runner path.
- Added shared game helpers for faction armory permissions, normalized transfer quantities, contribution credit, cooldowns, and availability checks.
- Added authenticated faction armory deposit/withdraw DB logic, `/api/factions/:factionId/inventory`, member contribution/event/ledger logging, and Factions page controls for stocked armory and personal-stack deposits.
- Static validation covered migration ordering and targeted TypeScript checks for shared faction formulas; full dependency-backed proof remains local-environment work.

## Feature Pass 86 - Contract command center and scoped assignments

- Fixed the Factions page nullable faction id usage reported by the local Next.js typecheck by routing armory/bank/leave forms through the already-derived `ownFactionId` guard.
- Added shared contract scope helpers for public board contracts, private assignments, and faction-only tasks, including faction posting permissions and scoped acceptance validation.
- Expanded contract DB queries so public contracts remain globally visible, private contracts are only visible to their assignee, and faction contracts are visible to active members of the sponsoring faction.
- Extended contract creation to support optional `assignedToCharacterId` and `factionId`, validate assignees, require lieutenant+ faction role for faction task posting, preserve escrow/cooldown/idempotency behavior, and keep private/faction activity out of public newspaper promotion.
- Added a dedicated `/contracts` player page with public posting, private assignment, faction task creation, visible-contract acceptance, and posted/assigned/faction activity completion or cancellation controls.
- Added `/contracts` to the game sidebar and static MVP/playable-action validators so the contract board is treated as a first-class player page.

Static validation performed in the sandbox:

```bash
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --strict --skipLibCheck packages/game/src/factions.ts packages/game/src/contracts.ts
```

Full dependency-backed workspace typecheck/tests/runtime proof still require the installed local workspace.



## Feature Pass 87 - TypeScript 7 build and database bootstrap cleanup

- Standardized scripts across all seven package manifests. Root commands now expose concise validation, proof, database setup, and migration aliases while package-level `lint` scripts use `tsc --noEmit` instead of placeholder commands.
- Pinned TypeScript `7.0.2` consistently and added `scripts/validate-package-scripts.mjs` to guard that version, the root pnpm override, package-script presence, and the web build wrapper.
- Reworked `apps/web` build to call `scripts/build-next-web.mjs`. The wrapper runs `tsc --noEmit` first, then runs `next build`, while `next.config.ts` skips Next's internal type checker because Next currently probes the legacy `typescript/lib/typescript.js` compiler API path that the native TypeScript 7 package no longer ships.
- Added `packages/db/scripts/ensure-database.ts`, `pnpm db:ensure`, and `pnpm db:setup` so fresh local setup can create the `DATABASE_URL` database before applying the 41 tracked SQL migrations.
- Updated README, migration, validation, current-state, next-task, and remaining-work docs to make `pnpm db:setup` the fresh-database path and keep `pnpm db:apply:all` as the migration-only path.

Sandbox validation performed:

```bash
node scripts/validate-package-scripts.mjs
node scripts/validate-migrations.mjs
```

Full dependency-backed `pnpm run build`, PostgreSQL setup, and runtime proof still need to run in the local workspace.

---

## Feature Pass 88 - Script consolidation, documentation pruning, and Redis rate limiting

Reduced manifest and documentation sprawl while preserving the production-readiness guardrails.

- Cut the root `package.json` scripts from 78 to 29 by removing duplicate aliases and one-script-per-migration commands.
- Cut `packages/db/package.json` scripts from 53 to 13 by keeping the tracked all-migration runner and adding `db:apply:file` for targeted repair.
- Updated static validators so `pnpm validate:static` calls validator files directly instead of requiring one root alias per validator.
- Pruned overlapping planning/status documentation and updated the retrieval guide, current state, migration guide, validation audit, remaining-work brief, and README.
- Added Redis-backed rate limiting to the web app using `RATE_LIMIT_REDIS_URL` or `REDIS_URL`, with memory fallback by default and `RATE_LIMIT_REDIS_REQUIRED=true` for fail-closed deployments.
- Added rate-limit backend status helpers and unit-test coverage for fallback behavior.
- Updated `.env.example` and environment validation for rate-limit Redis configuration.

Sandbox validation performed:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
```

Full dependency-backed `pnpm validate:ci`, runtime smoke, Redis connectivity proof, PostgreSQL migration proof, backup/restore proof, and DB integration proof still require the local installed workspace.


## Pass 89: Achievement idempotency and worker dead-letter handling

- Fixed dashboard/progression achievement sync by replacing the read-then-insert path with an atomic `onConflictDoUpdate` upsert on `(character_id, achievement_key)`.
- Added `0041_worker_dead_letters.sql` plus Drizzle schema/query helpers for recording exhausted worker tick failures.
- Added a shared worker tick scheduler with retry/backoff, overlap skipping, and dead-letter persistence.
- Migrated worker ticks to the shared scheduler.
- Added worker retry/dead-letter environment defaults and validation.
- Pinned `tsx` to the v4 line to avoid stale deprecated `@esbuild-kit/*` subdependency resolution from older installs.

## Pass 90: Message moderation and retention

- Added `0042_message_moderation_retention.sql` with `messages.hidden_at`, `hidden_by_user_id`, `hidden_reason`, and `retention_expires_at` plus visibility/retention indexes.
- Player message center queries now exclude hidden messages from inbox previews and unread counts.
- Admin moderation report resolution can hide reported messages while preserving report resolution, moderation notes, and admin action logs.
- Added configurable `MESSAGE_RETENTION_DAYS` support, defaulting to 365 days and allowing `0` to disable automatic expiry.
- Maintenance cleanup now removes expired messages only when they are not tied to open message reports.
- Added static validation for the message moderation/retention path.


## Feature Pass 91 - Operational feature flags

Added a first-pass production kill-switch system for high-risk gameplay surfaces.

- Added `packages/game/src/feature-flags.ts` with typed feature flag definitions and safe value normalization.
- Added `packages/db/src/queries/feature-flags.ts` to read feature flag state from `game_config_entries`.
- Added `0043_feature_flags.sql` to seed default enabled config entries for messages, newspaper actions, shops, trades, gambling, finance trading, market actions, contracts, factions, and PvP attacks.
- Added `apps/web/src/lib/feature-flags.ts` to return consistent `feature_disabled` API responses.
- Gated high-risk mutation routes with `requireFeatureEnabled(...)` while leaving read-only pages and support visibility available.
- Added an Admin Console feature flag panel so operators can toggle features without redeploying.
- Added `scripts/validate-feature-flags.mjs` and included it in `pnpm validate:static`.


## Feature Pass 92 - Operational anomaly detection

Added first-pass automated operations anomaly detection for production readiness.

- Added `packages/game/src/anomaly-detection.ts` with threshold normalization, severity scoring, stable signal keys, and summaries.
- Added `0044_operational_anomalies.sql` plus Drizzle schema/query helpers for deduplicated anomaly records.
- Added worker-driven and admin-triggered scans for high net worth, transaction spikes, large inventory stacks, and recent session IP spread.
- Added Admin Console review controls for marking anomalies as reviewing, resolved, or dismissed.
- Added `scripts/validate-operational-anomalies.mjs` and wired it into `pnpm validate:static`.


## Feature Pass 93 - Admin audit workbench

- Added `0045_admin_audit_workbench.sql` with production investigation indexes for financial transactions, inventory stacks, user sessions/IPs, and admin-action timestamps.
- Added `listAdminEconomyAudit`, `listAdminInventoryAudit`, and `listAdminSessionAudit` DB helpers with bounded filters, summaries, pagination metadata, and row normalization.
- Added admin audit endpoints for economy, inventory, and session investigations with JSON responses and CSV export support.
- Added Admin Console audit workbench panels for quick filtering, summary review, recent-row inspection, and CSV download links.
- Added `scripts/validate-admin-audit-workbench.mjs` and wired it into `pnpm validate:static`.

Validation run in the sandbox after the pass:

```bash
node --check scripts/*.mjs
node scripts/validate-admin-audit-workbench.mjs
npm run validate:static --silent
```

Full dependency-backed typecheck/build/test/runtime proof still needs to run in an installed PostgreSQL/Redis environment.

## Feature Pass 94 - Admin rollback tooling

Added first-pass operational rollback tooling for economy-impacting admin mistakes.

- Added `0046_admin_rollback_action_types.sql` to extend `admin_action_type` with `rollback_review` and `rollback_apply`.
- Added `0047_admin_rollback_tooling.sql` with indexes for detecting whether an original admin adjustment has already been rolled back.
- Added `listAdminRollbackCandidates` for recent cash/bank admin adjustments and `applyAdminActionRollback` for restoring a character cash/bank value to the original before-snapshot.
- Added `/api/admin/rollback` with `GET` candidate listing and idempotent `POST` rollback application, requiring `manage_economy` and rate limiting.
- Added an Admin Console rollback workbench with before/after snapshots, rollback availability state, and reason capture.
- Added `scripts/validate-admin-rollback-tooling.mjs` and wired it into `pnpm validate:static`.

Sandbox validation after this pass:

```bash
node --check scripts/*.mjs
node scripts/validate-admin-rollback-tooling.mjs
npm run validate:static --silent
```

Full installed-environment proof of migrations, route behavior, duplicate rollback prevention, and balance restoration still needs to run locally.


## Feature Pass 95 - Typecheck and runtime-proof repair

Repaired issues reported from local installed proof after Feature Pass 94.

- Exported explicit admin audit row types for economy transactions, inventory items, and session rows from `packages/db/src/queries/admin.ts`.
- Typed CSV mapper callback parameters in `/api/admin/audit/economy`, `/api/admin/audit/inventory`, and `/api/admin/audit/sessions` to resolve `TS7006` implicit `any` errors during `apps/web typecheck`.
- Hardened `scripts/prove-mvp-runtime.mjs` for Windows by enabling shell resolution on Windows, sanitizing environment values, adding `windowsHide`, and recording synchronous spawn failures in the proof result payload.
- Strengthened static validators so these fixes are checked by `pnpm validate:static`.

Sandbox validation after this pass:

```bash
node --check scripts/*.mjs
node scripts/validate-admin-audit-workbench.mjs
node scripts/validate-runtime-proof.mjs
node scripts/prove-mvp-runtime.mjs --dry-run
npm run validate:static --silent
```

Full local proof should rerun `pnpm typecheck`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration`.


## Feature Pass 96 - Admin audit workbench nullable type repair

Repaired the follow-up local `apps/web` typecheck failure reported after Feature Pass 95.

- Updated `apps/web/src/features/admin/admin-panel.tsx` to import shared audit row types from `@drugdeal/db`.
- Replaced locally narrowed audit workbench transaction/item/session row shapes with `AdminEconomyAuditTransaction[]`, `AdminInventoryAuditItem[]`, and `AdminSessionAuditSession[]`.
- Added UI fallbacks for nullable transaction descriptions, inventory character names, and session emails.
- Extended `scripts/validate-admin-audit-workbench.mjs` so `pnpm validate:static` checks the Admin Console nullable audit row typing and fallbacks.

Sandbox validation after this pass:

```bash
node --check scripts/*.mjs
node scripts/validate-admin-audit-workbench.mjs
node scripts/validate-runtime-proof.mjs
node scripts/prove-mvp-runtime.mjs --dry-run
npm run validate:static --silent
```

Full installed-environment proof should rerun `pnpm typecheck`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration`.


## Feature Pass 97 - Agent memory and public-barrel refactor

Added a deterministic repository retrieval layer for AI-assisted implementation passes without changing runtime behavior.

- Added root `AGENTS.md` with workspace boundaries, dependency direction, change protocol, refactor rules, and safety constraints.
- Added generated `.agent-memory` indexes for files, imports, manifests, public package APIs, Next.js routes/pages, and top-level symbols.
- Added `.agent-memory/tasks.json` plus JSON Schema and dependency/status validation for a machine-readable work queue.
- Added `scripts/generate-agent-memory.mjs` with write and stale-check modes, source fingerprinting, unresolved-import reporting, public-export traversal, and task validation.
- Added `agent:memory`, `agent:memory:check`, and `validate:agent-memory` scripts; wired stale-memory checks into `pnpm validate:static`.
- Normalized `@drugdeal/game` and `@drugdeal/db` barrel exports and removed redundant root database re-exports while preserving the public symbol surface.

Dependency-light validation for this pass:

```bash
node --check scripts/generate-agent-memory.mjs
node scripts/generate-agent-memory.mjs
node scripts/generate-agent-memory.mjs --check
node scripts/validate-docs.mjs
```

Full dependency-backed typecheck, build, tests, and runtime proof remain part of `VAL-001` in `.agent-memory/tasks.json`.

## Feature Pass 98 - executable package test baselines

- Replaced placeholder test commands in `@drugdeal/worker`, `@drugdeal/db`, and `@drugdeal/ui` with executable Node test suites run through `tsx`.
- Added deterministic worker retry/backoff and dead-letter tests through an injected execution seam; runtime scheduling behavior and defaults remain unchanged.
- Extracted transaction integer normalization into a pure database helper and added boundary tests for monetary values, quantities, and signed deltas.
- Added semantic contract tests for the shared `StatCard` component.
- Added `validate-package-test-baselines.mjs` to the static validation chain so placeholder package tests cannot return unnoticed.
- Installed-environment execution of these suites remains part of `VAL-001`/`TST-001` because the offline refactor environment cannot install the pinned pnpm toolchain.

## Feature Pass 99 — production proof preflight

- Added `pnpm doctor:production` and strict `pnpm doctor:proof` preflight commands.
- Added actionable checks for Node 22, the pinned pnpm version, Docker Compose v2, PostgreSQL backup/restore tools, required repository files, database configuration, authentication secret quality, application origin, and the disposable restore database.
- Integrated the strict doctor into `pnpm prove:mvp-runtime` before dependency installation and database work; `--skip-preflight`/`MVP_PROOF_SKIP_PREFLIGHT=true` remain explicit emergency overrides.
- Added a static validator so the doctor and proof integration cannot silently disappear.
- The first real preflight exposed concrete environment blockers: pnpm, Docker, PostgreSQL client tools, `MVP_RESTORE_DATABASE_URL`, and the missing committed `pnpm-lock.yaml`.


## Feature Pass 100 - production observability foundation and installed CI proof

- Added the shared `@drugdeal/observability` workspace package with structured JSON events, alerts, recursive sensitive-field redaction, bounded payload handling, optional HTTP sinks, release/environment metadata, and safe configuration diagnostics.
- Instrumented API completion, 5xx responses, and unhandled exceptions with request IDs and durations.
- Instrumented worker lifecycle, scheduling, retries, overlaps, completion, exhausted retries, dead-letter write failures, startup, and graceful shutdown.
- Added critical alert events for API exceptions/server errors and worker startup/retry exhaustion.
- Added `docs/observability-runbook.md`, environment variables, package tests, and `validate-observability-foundation.mjs`.
- Generated the missing `pnpm-lock.yaml` with pnpm 9.15.4 and installed the complete workspace dependency graph.
- Ran dependency-backed typechecks and tests, including the previously slow in-memory rate-limiter test.

- The installed test run found and fixed direct Node JSX execution for `StatCard` by adding the required React runtime import.
- Next production build concurrency is now bounded by `NEXT_BUILD_CPUS` (default 4) to prevent resource exhaustion on shared CI hosts.
- Static validation, workspace typecheck, production build, and all executable package tests passed after the repairs.

## Feature Pass 101 - production proof completion contract

- Switched runtime verification from `next dev` to the built `next start` application.
- Added frozen-lockfile install and production build to the proof.
- Added a Redis-required rate-limit allow/allow/reject proof.
- Added worker startup/stability verification and graceful cleanup.
- Added machine-readable proof evidence on success and failure.
- Extended the production doctor and static proof validator for the new gates.

## Feature Pass 102 — Gameplay integration proof expansion

Extracted job and crime mutations from route handlers into reusable transactional database services. Expanded the opt-in PostgreSQL integration suite from a user/character insertion smoke test to deterministic gameplay persistence and rollback scenarios, and added machine-readable integration proof evidence.

## Feature Pass 103 - Character setup gate, collapsible game sections, capability-aware pages, and product media

This pass resolves the player-navigation and product-presentation gaps identified during production-candidate review.

- Added an authenticated `/create-character` setup page and a game-route layout guard. Users without a character cannot enter gameplay pages; users who already have a character are redirected back to the dashboard.
- Reworked `FocusedSections` around native `<details>` disclosures. Profile and inventory sections remain discoverable on arrival, multiple sections can stay open, and hash links open and scroll to their target.
- Reworked dashboard section controls so each section can be independently expanded or collapsed with `aria-controls` and `aria-expanded`, while direct hash navigation still opens the requested section.
- Removed unusable contract and faction placeholders. Private contract assignment is shown only with a valid recipient, faction task posting only with the required faction role, empty contract collections are omitted, and faction resource/member/territory tools are shown only when actionable.
- Simplified shop collections so active third-party listings and owned-shop operation groups render only when data exists.
- Added `0048_item_product_images.sql` with one persistent PostgreSQL-backed image per item, MIME/size/alt-text/SHA-256 constraints, updater attribution, and cascade deletion.
- Added DB catalog, binary retrieval, upsert, and deletion helpers plus a public cacheable image route and `manage_config`-gated admin upload/delete route.
- Added JPEG, PNG, and WebP MIME/signature validation, a 2 MiB limit, ETag delivery, `nosniff`, and same-origin resource policy headers.
- Added Admin Console image management and reusable product image/fallback rendering.
- Replaced dense market and shop listing layouts with compact image cards. Default cards show price and supply/stock; descriptions and accessible local supply/demand graphs live under product details.
- Extended migration, route-contract, documentation, and unit-test coverage for the new product-media paths.

Dependency-free validation performed in this environment includes migration ordering/coverage, representative route contracts, TypeScript source parsing, and documentation route coverage. The pinned pnpm binary and dependencies could not be downloaded because registry access is unavailable, so installed workspace typecheck, tests, build, and live PostgreSQL media proof remain open under the existing production proof tasks.

## Feature Pass 104 - Legacy credential neutralization and explicit owner bootstrap

This pass closes the source-level production credential gap left by the historical starter seed while preserving migration checksum compatibility.

- Added `0049_disable_legacy_dev_owner.sql`. It finds the fixed historical seed id and any remaining `dev@example.com` account, revokes sessions and one-time recovery/verification tokens, invalidates the password hash, removes administrator privileges, clears verification, and moves the address to a deterministic non-routable domain.
- Kept `0001_seed_starter_content.sql` immutable so already-applied migration checksums remain valid.
- Replaced the root `db:seed` command with a guarded TypeScript development seeder. It runs only with `NODE_ENV=development` and `ALLOW_DEVELOPMENT_SEED=true`, validates an operator-supplied strong password, prevents email collisions, and revokes prior credentials transactionally.
- Added `db:bootstrap:admin` for production. It requires `NODE_ENV=production`, an explicit enable flag, the exact `CREATE_OR_RESET_OWNER` confirmation phrase, a strong password, and a separate opt-in before resetting an existing account.
- Added shared scrypt/bootstrap validation helpers and documented all environment controls in `.env.example`, `README.md`, `docs/auth.md`, and the migration guide.
- Added the binary `bytea` column to the Drizzle `itemImages` model so schema generation faithfully represents the persistent product-media migration.

The source implementation is complete. Applying migration `0049` and exercising both guarded commands against disposable databases remains part of installed staging proof; no reusable password is recorded in repository documentation.

## Feature Pass 105 - Routed gameplay hubs, categorized navigation, and collapsible cards

This pass replaces the previous page-level dashboard, profile, and inventory disclosure navigation with dedicated App Router pages while retaining native disclosure behavior for the cards within each page.

- Added eight dashboard routes: overview, actions, messages, activity, economy, progression, crew, and news.
- Added six profile routes: overview, status, titles, rewards, achievements, and history.
- Added three inventory routes: summary, items, and transfers.
- Preserved `/dashboard`, `/profile`, and `/inventory` as stable overview entry points.
- Added a reusable `CollapsibleCard` component based on native `details/summary`; the first high-priority card on each page opens by default while all cards remain independently keyboard operable.
- Changed hidden dashboard disclosures to return `null` when they belong to another route, avoiding inaccessible inactive content in the mounted page tree.
- Reorganized the sidebar into Overview, Character, Actions, Economy, Inventory, Community, and World groups, added all promoted routes, added `aria-controls` to group toggles, and uses longest-route matching for one unambiguous current page.
- Scoped server-sent event subscriptions so notification streaming runs only on the activity route and message streaming runs only on the message overview route.
- Replaced the legacy `FocusedSections` implementation and extended the MVP page validator to cover 27 player routes and 20 production UX/media contracts.

Dependency-light validation for this pass includes TypeScript/TSX syntax parsing, route/page contracts, playable-action checks, site-quality checks, documentation validation, migration auditing, generated-memory freshness, and the consolidated static validation chain. Installed typecheck, test, production build, and browser assistive-technology proof remain under `VAL-001`.
