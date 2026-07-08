# Feature and Function Checklist

This is the cleaned living checklist after Feature Pass 73. Historical implementation details are consolidated in `docs/feature-history.md`; current project status and remaining work live in `docs/project-status.md` and `docs/remaining-work.md`.

## Legend

- `[ ]` Not started
- `[~]` In progress / partial first pass exists
- `[x]` Implemented enough to continue from
- `[!]` Needs review or hardening before MVP

## Current MVP readiness summary

- [x] Static MVP acceptance gate, runtime proof orchestrator, playable MVP actions, monetization foundation, admin operations UI validation, public launch polish, site-quality baseline, and completed Messages, Shops, Newspaper, Profile, Admin visibility controls, account recovery, email verification, documentation retrieval controls, player banking, bank history, finance price-history retrieval, finance chart UI, and first-pass money sinks and loans plus partial repayment, overdue/default handling, admin loan exposure visibility, richer banking statements/CSV export, and deterministic market-event formula/scheduling/news helpers plus first-pass persistence/API/UI/worker wiring are in place after Feature Pass 84.

- [x] Monorepo, web app, worker app, shared packages, database package.
- [x] Auth/session foundation.
- [x] Character creation and dashboard shell.
- [x] Core gameplay route coverage across jobs, crimes, travel, market, training, education.
- [x] Several multiplayer systems have first-pass APIs and dashboard panels.
- [x] Focused production hardening cycle completed through pass 40: env validation, pagination helpers, rate limits, idempotency, conditional writes, tests, browser security, observability, DB guardrails, and maintenance cleanup now exist.
- [~] Tests now cover shared game formulas, MVP progression formulas, validator hardening schemas, web request-safety helpers, and representative route contracts; database-backed route tests are not complete.
- [~] Dedicated UX pages now exist for the MVP player sections; core player actions and main admin operations are browser-accessible, while deeper archive/history pages remain. The Messages, Shops, Newspaper, Profile, and Admin visibility in-progress tasks are now complete for MVP browser operations.
- [x] Money/inventory mutations have first-pass idempotency, conditional transaction-safety helpers, and database invariant guardrails.

## Phase 0 - Repository and platform foundation

- [x] pnpm monorepo setup.
- [x] Next.js App Router web app skeleton.
- [x] Worker app skeleton.
- [x] Shared Drizzle database package.
- [x] Shared game logic package.
- [x] Shared validators package.
- [x] Shared UI package.
- [x] Docker Compose for PostgreSQL and Redis.
- [x] Local seed script.
- [x] Admin dashboard access gate with role/capability checks.
- [x] Environment variable validation.
- [x] Environment validation tests.
- [x] Baseline security headers.
- [x] Same-origin API mutation guard.
- [x] Browser security helper tests.
- [x] Request ID propagation.
- [x] Runtime diagnostics on health checks.
- [x] Database invariant guardrails.
- [x] Worker maintenance cleanup for expired operational rows.
- [~] Structured operational logging. All current API routes are wrapped with request observability; external log shipping and alerting remain.
- [x] CI workflow for pull requests and main/master pushes.
- [x] MVP release runbook and backup/restore scripts.
- [x] Static release-readiness validation for runbook, backup/restore, environment, Docker, README links, and package scripts.
- [~] Final lint/format/typecheck/test policy. Static repo validation is runnable without installed package dependencies; `pnpm validate:ci` now chains static validation, typecheck, and tests after install, and static validation includes representative route-contract, MVP page/gameplay, admin RBAC, job lifecycle, and legal recovery drift checks.
- [x] Automated static migration validation.
- [x] Idempotent all-migration runner with `schema_migrations` tracking and checksum validation.
- [x] Automated static documentation drift validation.
- [x] Automated static CI workflow validation.
- [x] Automated static all-route observability validation.
- [x] Automated static representative route-contract validation for auth, jobs, crimes, market, shops, contracts, and admin routes.
- [x] Automated static MVP page coverage validation for dedicated player pages.
- [x] Automated static admin RBAC validation for role/capability gates.
- [x] Automated static admin operations UI validation for search, moderation, enforcement, appeal, flag, status, economy, transparency, and audit surfaces.
- [x] Automated static job lifecycle validation for apply/work/resign and employment state.
- [x] Automated static legal recovery validation for hospital care and jail/hospital release refresh.

## Phase 1 - Account, auth, and character foundation

- [x] User registration.
- [x] User login.
- [x] Session handling.
- [x] Character creation.
- [x] Character profile.
- [~] Character stats.
- [~] Character cash and bank balance.
- [~] Character location.
- [~] Character status: free, traveling, jailed, hospitalized, suspended.
- [x] Character event history API.
- [x] Password reset request/confirm flow with hashed one-time tokens and session invalidation.
- [x] Email verification request/confirm flow with hashed one-time tokens and resend page.
- [x] First-pass character event history UI on `/profile`.
- [x] Profile privacy settings.
- [~] Public profile page. The profile page now includes a public-profile preview and visibility boundary; a shareable public route remains post-MVP polish.

## Phase 2 - Core game action engine

- [x] Job, crime, travel, market, training, and education action routes.
- [x] Action locks/cooldown groundwork.
- [x] Energy/nerve regeneration formulas.
- [x] Resource regeneration worker tick.
- [~] Action requirements.
- [~] Action costs.
- [~] Action rewards.
- [~] Action success chance formulas.
- [~] Server-side action validation.
- [~] Action event logging.
- [ ] Generic action definition model.
- [ ] Consistent failure-handling model.
- [ ] Redis-backed anti-spam/rate limiting.
- [~] Idempotency keys for mutation routes, with deterministic fingerprint/key parser tests. Enforcement appeal/lift flows and shop listing creation now also support idempotency.
- [~] Conditional transaction-safety helpers for core economic/resource mutations.
- [x] Automated test baseline for shared game formulas.

## Phase 3 - Jobs, training, and education

- [x] Daytime job catalog.
- [x] Job requirements.
- [x] Job work action.
- [x] Conditional energy consumption for job completion.
- [x] Job wage payout.
- [x] Job experience gain.
- [x] Training catalog and completion API.
- [x] Course catalog and completion API.
- [~] Dashboard training/education actions.
- [x] Job application flow.
- [x] Job promotion system.
- [~] Job resignation/firing system. Player resignation exists; admin firing remains future depth.
- [~] Job-related stat progression. Job rank, shift count, total earned, wage scaling, and XP progression exist; deeper stat growth remains future depth.
- [~] Training cooldown tuning.
- [x] Course prerequisites.
- [x] Course completion timers/worker.
- [~] Diminishing returns and scaled training cost.

## Phase 4 - Crimes, police, legal, jail, and hospital

Keep implementation fictional and abstract. Avoid real-world operational detail.

- [x] Crime catalog.
- [x] Crime success chance.
- [x] Crime rewards.
- [x] Conditional nerve consumption for crime attempts.
- [x] Police heat increase.
- [x] Failed-crime hospital/jail consequences.
- [x] Active hospital stay records.
- [x] Active jail sentence records.
- [x] Worker release/recovery tick.
- [x] Passive heat decay tick.
- [x] Lawyer service API.
- [x] Bribe attempt API.
- [x] Hospital care API.
- [x] Legal status API.
- [ ] Crime categories.
- [ ] Investigation score.
- [x] Arrest chance formula.
- [x] Fine calculation.
- [x] Jail sentence calculation.
- [ ] Crime skill progression.
- [~] Crime cooldown tuning.
- [x] Court outcome flow.
- [x] Bail/fine payment flow.
- [x] Jail-only gameplay actions.
- [x] Hospital treatment options.
- [~] Injury model and temporary stat penalties. Health loss exists; temporary stat penalties remain post-MVP depth.

## Phase 5 - Inventory, gear, vehicles, and crafting

- [x] Item catalog.
- [x] Inventory API foundation.
- [x] Equipment slots.
- [x] Equip/unequip actions.
- [x] Gear durability and repair.
- [x] Gear stat modifiers.
- [x] PvP gear integration.
- [x] Vehicle ownership/profile API.
- [x] Vehicle upgrades.
- [x] Vehicle travel modifiers.
- [x] Crafting recipes.
- [x] Workshops.
- [x] Queued crafting jobs.
- [x] Crafting completion worker.
- [~] Vehicle cargo/smuggling/delivery groundwork.
- [x] Item rarity metadata and UI exposure summaries.
- [x] Direct same-location item transfer between players.
- [x] Consumable item effects for metadata/default medical items.
- [ ] Advanced item mod slots.
- [ ] Rare item affixes.
- [ ] Faction armory crafting.
- [ ] Vehicle impound/damage.

## Phase 6 - Travel and locations

- [x] City/location catalog.
- [x] Player current location.
- [x] Travel routes.
- [x] Travel costs.
- [x] Travel duration.
- [x] Travel completion worker tick.
- [x] Vehicle modifiers for travel.
- [~] Location-specific markets.
- [ ] Travel risk events.
- [ ] Location-specific jobs.
- [ ] Location-specific crimes.
- [ ] Location-specific hospitals and jails.
- [ ] Hidden locations.
- [ ] Faction territory modifiers.

## Phase 7 - Economy, markets, finance, and gambling

- [x] Market buy/sell API.
- [x] Financial transaction records.
- [x] Market history table.
- [x] Market worker tick foundation.
- [x] Fictional stock/crypto asset catalog.
- [x] Portfolio positions.
- [x] Finance buy/sell API.
- [x] Asset order history.
- [x] Finance price tick.
- [x] Casino/gambling game definitions.
- [x] Wager placement API.
- [x] Wager history.
- [x] Gambling cooldowns and table limits.
- [x] Newspaper event generation for large wins.
- [~] Regional price model.
- [x] Supply/demand model: deterministic market pressure, event-impact, scheduling, lifecycle, persistence, worker surfacing, and news-payload helpers exist.
- [x] Market event generation: event catalog, impact calculator, deterministic scheduling, persistence, API/UI surfacing, and newspaper payload builders exist.
- [ ] Inflation controls.
- [ ] Passive income controls.
- [x] Money sinks.
- [x] Bank deposits/withdrawals.
- [x] Bank transaction history API/UI, filtered statements, summaries, and CSV export.
- [x] Loans and fictional debt collection, including partial repayments, overdue/default handling, and admin exposure visibility. Loan offers, bank funding, partial repayment/full payoff, ledger, overdue/default worker handling, unresolved-loan guardrails, and dashboard controls exist.
- [x] Player-to-player trade offers with reserved inventory, same-location recipient controls, accept/cancel/expiry, fee sink, API routes, worker expiry, and browser UI.
- [x] Inventory page, consumable-use API, direct same-location item transfer API, rarity backfill, and value/risk exposure summaries.
- [x] Finance chart data endpoints.
- [x] Finance chart UI.
- [x] Market-news impact model with article payload generation and worker publishing.
- [ ] Gambling tournaments.
- [ ] Player-hosted tables.

## Phase 8 - Factions, territory, PvP, and contracts

- [x] Faction creation.
- [x] Faction join/leave.
- [x] Faction bank and ledger.
- [x] Member contribution points.
- [x] Territory ownership/actions.
- [x] Territory income worker.
- [x] PvP combat logs.
- [x] Local PvP attack endpoint.
- [x] Bounty board.
- [x] Bounty expiry/claim/cancel flow.
- [x] Faction war declaration groundwork.
- [x] War score tracking and expiry/resolution tick.
- [x] Contract board.
- [x] Player-created contracts.
- [x] Escrowed rewards.
- [x] Accept/complete/cancel contract lifecycle.
- [x] Contract expiry worker.
- [~] Faction chat.
- [x] Faction ranks and permissions.
- [x] Faction inventory/armory with member deposits, lieutenant+ withdrawals, exposure summaries, cooldowns, API route, and Factions page controls.
- [x] Faction contracts.
- [ ] Faction shop permissions.
- [~] Territory map UI. Territory operations are browser-accessible through the Factions page; a visual map remains future polish.
- [ ] Territory upgrades/taxes.
- [ ] Formal war UI.
- [ ] Diplomacy: alliance, truce, trade agreement, surrender terms.
- [ ] Faction contribution leaderboards.
- [x] Private assigned contracts.
- [ ] Multi-step contract chains.

## Phase 9 - Shops and marketplace

- [x] Open player shop flow.
- [x] Shop listings.
- [x] Buy from shop.
- [x] Shop close/reopen action.
- [x] Listing cancellation with unsold inventory return.
- [x] Shop advertising campaigns.
- [x] Sponsored shop ordering.
- [x] Shop reviews and ratings.
- [x] Shop sales/ledger groundwork.
- [x] Admin shop restriction enforcement.
- [~] Shop inventory management.
- [ ] Full shop management page.
- [ ] Configurable prices and quantities from owner UI.
- [ ] Shop upgrades.
- [ ] Shop security.
- [ ] Shop taxes/upkeep worker.
- [ ] Shop staff assignment and permissions.
- [ ] Faction shop permissions.
- [ ] Auction house.

## Phase 10 - Newspaper, messaging, notifications, and social

- [x] Player-submitted newspaper articles.
- [x] Article comments.
- [x] Article reactions.
- [x] Article reporting.
- [x] Admin moderation queue for article reports.
- [x] Direct messages.
- [x] Message thread summaries.
- [x] Message read state.
- [x] Message reporting.
- [x] Message blocking.
- [x] Social mute enforcement.
- [x] Notification center.
- [x] Activity feed.
- [x] Notification preferences.
- [x] Notification filters.
- [x] Digest worker preferences.
- [x] Live notification SSE stream.
- [x] Live message SSE stream.
- [x] Browser notification permission controls.
- [~] Group chats.
- [~] Faction chat.
- [ ] Newspaper home/archive page.
- [ ] Newspaper search and category filters.
- [ ] Paid advertisements and rumor slots.
- [ ] Arrest reports, faction war reports, top player mentions.
- [x] Full messages page with in-place thread refresh, live inbox status, thread controls, reporting, and block/unblock controls.
- [ ] Production push fan-out via Redis/Postgres.
- [ ] Message retention policy.
- [ ] Faction-wide notification routing.
- [ ] Email/push delivery adapter.
- [ ] Per-device browser notification preferences.

## Phase 11 - Progression, seasons, achievements, and retention

- [x] Achievement definitions.
- [x] Character achievement progress.
- [x] Achievement reward claiming.
- [x] Unlockable titles.
- [x] Active title selection.
- [x] Daily/weekly objective definitions.
- [x] Objective reward claiming.
- [x] Profile score summary.
- [x] Active seasons table.
- [x] Season reward tiers.
- [x] Character season progress.
- [x] Season reward claiming.
- [x] Prestige readiness calculation.
- [x] Legacy record snapshots.
- [x] Legacy perks.
- [~] Dashboard goals/profile/season panels.
- [ ] Level progression curve.
- [ ] Skill trees.
- [ ] Reputation tracks.
- [ ] Public profile pages.
- [ ] Season leaderboards.
- [ ] End-of-season rank rewards.
- [ ] Season-specific events.
- [ ] Daily login streaks.
- [ ] New player tutorial.
- [ ] In-game guide/wiki.
- [ ] Referral and mentor systems.

## Phase 12 - Admin, moderation, enforcement, and safety

- [x] Admin console foundation.
- [x] Admin action log.
- [x] System announcements.
- [x] Game config entries.
- [x] Balance adjustment API.
- [x] Status clear API.
- [x] Character moderation flags.
- [x] Message report moderation queue.
- [x] Article report moderation queue.
- [x] Report resolution states.
- [x] Enforcement records.
- [x] Warnings, social mutes, shop restrictions, suspensions, cash penalties.
- [x] Enforcement appeals.
- [x] Appeal review workflow.
- [x] Enforcement lift action.
- [x] Timed enforcement expiry worker.
- [x] Admin character search.
- [x] Moderation transparency summary.
- [x] Role-based admin permissions beyond `isAdmin`.
- [ ] Historical moderation archive page.
- [ ] Message hide/delete workflow.
- [ ] Economy audit tools.
- [ ] Inventory audit tools.
- [ ] IP/session audit tools.
- [ ] Rollback tooling.
- [ ] Feature flags.
- [ ] Game balance config editor wired into all formulas/ticks.
- [ ] Automated anomaly detection.

## Phase 13 - Technical hardening

- [x] Environment validation for web and DB runtime configuration.
- [x] Database indexes and invariant guardrail migration.
- [x] First-pass transaction safety for money transfers and inventory changes.
- [x] First-pass idempotency keys for high-risk state-changing actions.
- [~] Pagination for list endpoints.
- [~] Rate limiting.
- [ ] Optimistic locking where needed.
- [ ] Background job retry policy.
- [ ] Dead-letter queue.
- [~] Structured logging.
- [~] Error reporting.
- [~] Automated tests for formulas, validators, request-safety helpers, hardening helpers, and runtime smoke behavior.
- [~] Security review.
- [ ] Abuse prevention.
- [ ] Bot detection.
- [~] Backups.
- [x] Restore runbook.
- [ ] Load testing.

## Recommended next pass

- [x] MVP Hardening Pass 1: environment validation, reusable pagination helpers, list endpoint pagination, and route-level rate limiting.
- [x] MVP Hardening Pass 2: idempotency keys for first-pass money/action mutations.
- [x] MVP Hardening Pass 3: transaction consistency review and focused tests.
- [x] MVP Hardening Pass 4: formula and helper test foundation.
- [x] MVP Hardening Pass 5: web helper and validator test coverage.
- [x] MVP Hardening Pass 6: browser security boundary.
- [x] MVP Hardening Pass 7: request observability and runtime diagnostics.
- [x] MVP Hardening Pass 8: contracts, finance, and admin cash safety.
- [x] MVP Hardening Pass 9: database guardrails and maintenance cleanup.
- [x] Validation Pass 39: migration audit tooling, API hardening scan, and validation guide.
- [x] Validation Pass 40: audit remediation and static check execution.
- [x] Validation Pass 41: runtime smoke validation harness.
- [x] Validation Pass 42: documentation cleanup and documentation drift validation.
- [x] Validation Pass 43: CI workflow and CI drift validation.
- [x] Feature Pass 44: API observability expansion and unsafe-route audit enforcement.
- [x] Feature Pass 45: complete API observability coverage and all-route audit enforcement.
- [x] Feature Pass 46: representative route-contract tests and guard tightening.
- [x] Feature Pass 47: MVP player pages and page coverage gate.

## Latest hardening pass

- [x] Feature Pass 37: hardened contract, finance, admin adjustment, and enforcement cash-penalty mutation paths with conditional database writes and idempotency coverage for finance/admin money routes.
- [x] Feature Pass 38: completed the focused hardening cycle with database invariant checks, operational indexes, and worker maintenance cleanup.


## Feature Pass 57 - Runtime proof orchestration

- [x] Add `scripts/prove-mvp-runtime.mjs` to run install, Docker startup, migrations, static validation, typecheck, tests, strict smoke, backup, and optional restore proof.
- [x] Add `pnpm prove:mvp-runtime`.
- [x] Add `pnpm validate:runtime-proof`.
- [x] Include runtime-proof validation in `pnpm validate:static`.
- [x] Document dry-run usage: `MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime`.
- [x] Document disposable restore proof: `MVP_RESTORE_DATABASE_URL=... pnpm prove:mvp-runtime`.
- [ ] Execute runtime proof in a real installed environment.


### Integration testing

- [x] Add opt-in database-backed integration test scaffolding.
- [x] Add disposable DB safety checks and test helpers.
- [x] Add integration proof command.
- [ ] Run integration proof in a real environment.


### Monetization foundation

- [x] Add product catalog and entitlement schema.
- [x] Add character cosmetics schema.
- [x] Add checkout placeholder abstraction without live payment dependency.
- [x] Add monetization API routes and docs.
- [ ] Implement a real payment provider adapter only after legal/support/refund workflows are ready.

## Feature Pass 57 - Playable MVP action forms

- [x] Shared client action form component added.
- [x] Jobs, crimes, legal, market, shops, messages, and factions expose browser action forms.
- [x] `pnpm validate:playable-actions` added and included in `pnpm validate:static`.
- [ ] Runtime browser proof still required through `pnpm prove:mvp-runtime`.

Feature Pass 56 remains the monetization foundation baseline; Feature Pass 57 builds on it with playable MVP action forms.

## Feature Pass 59 - Public launch polish

- [x] Add public `/privacy`, `/terms`, `/rules`, and `/onboarding` pages.
- [x] Add `docs/privacy-policy.md`, `docs/terms-of-service.md`, `docs/community-rules.md`, and `docs/beta-test-plan.md`.
- [x] Link public policy/onboarding pages from the home page.
- [x] Add `scripts/validate-public-launch.mjs` and `pnpm validate:public-launch`.
- [x] Wire `pnpm validate:public-launch` into `pnpm validate:static`.
- [ ] Replace draft legal documents with jurisdiction-reviewed final legal documents before commercial launch.


## Feature Pass 60 quality baseline

- [x] Accessibility, responsive design, PWA, and SEO baseline.
- [x] Root metadata, viewport, Open Graph, Twitter card, icons, manifest, sitemap, and robots wiring.
- [x] Skip link, focus-visible styles, reduced-motion handling, responsive nav/grid styles, and accessible touch targets.
- [x] Shared action-form accessibility improvements with labels, status announcements, and helper/status descriptions.
- [x] Static site-quality validator via `pnpm validate:site-quality`.
- [ ] Manual Lighthouse and assistive-technology verification in a real browser.

## Feature Pass 62 - In-progress page closure

- [x] Complete the Shops page with shop creation, owner management, listing cancellation, advertising, reviews, sales history, and active-ad visibility.
- [x] Complete the Newspaper page with article submission, archive/category grouping, reactions, comments, and report actions.
- [x] Complete the Profile page with public-profile visibility guidance, title controls, claimable achievements/objectives, and richer activity summaries.
- [x] Complete Admin visibility with moderation archive, session audit, and inventory audit surfaces.
- [ ] Execute full dependency-backed typecheck/build and runtime proof in an installed PostgreSQL/Redis environment.

## Feature Pass 63 - Auth account recovery

- [x] Password reset request and confirm flow with hashed one-time tokens.
- [x] Email verification request and confirm flow with hashed one-time tokens.
- [x] `users.email_verified_at` and token cleanup support.
- [x] Session invalidation after successful password reset.

## Feature Pass 65 - TypeScript config compatibility

- [x] Removed deprecated `compilerOptions.baseUrl` usage from root and web TypeScript configs.
- [x] Converted path alias targets to explicit relative mappings so TypeScript package builds no longer fail with `TS5101`.
- [x] Added direct Node typings to packages that compile `node:test` tests.
- [x] Fixed package-game typing issues exposed after the config migration.

## Feature Pass 64 - Documentation retrieval refactor

- [x] Add `docs/README.md` as the first-read documentation retrieval map.
- [x] Add `docs/current-state.md` as a compact current-state brief.
- [x] Add `docs/next-task-brief.md` as the next-pass handoff.
- [x] Add `docs/backlog-index.md` as a compact map of not-started and thin areas.
- [x] Shorten `README.md` and update stale pass/status references.
- [ ] Execute full dependency-backed typecheck/build and runtime proof in an installed PostgreSQL/Redis environment.



## Feature Pass 74 documentation consolidation

- Historical implementation notes now live in `docs/feature-history.md` instead of many individual `feature-pass-XX.md` files.
- Use current-state/planning docs for active work and search `docs/feature-history.md` only when historical context is needed.


## Feature Pass 75 banking statements

- [x] Bank statement filters for transfer/loan banking actions.
- [x] Bank statement summary totals for inflow, outflow, and net movement.
- [x] CSV export for recent bank statements.


## Feature Pass 76 - Market event formula foundation

- [x] Add market pressure snapshot helper for normalized supply/demand/volatility pricing.
- [x] Add deterministic market event catalog and impact calculator.
- [x] Cover market event helper behavior with package-game formula tests.
- [x] First-pass market-event persistence, API/UI surfacing, and worker newspaper publishing wiring.


## Feature Pass 77 market event scheduling/news helpers

- [x] Deterministic market-event occurrence scheduling helper.
- [x] Market-event lifecycle status helper.
- [x] Market-event newspaper payload helper.
- [x] Persist active market events in the database.
- [x] Surface active market events through API/UI and worker-published newspaper articles.
- [ ] Validate market-event migration, worker publishing, and API/UI behavior in installed runtime proof.


## Feature Pass 78 market event persistence/API/UI worker wiring

- [x] `market_events` migration/schema and apply scripts.
- [x] Scheduling, active-event retrieval, publishing, expiry, and worker tick helpers.
- [x] `/api/market` active-event response and Market page alert cards.
- [ ] Installed-environment proof of migration, worker publishing, newspaper insertion, and UI rendering.

## Feature Pass 80 player-trade build fix and exposure summary

- [x] Add player-trade action-lock keys to the shared DB action type union.
- [x] Enforce buyer accept cooldown checks before accepting private trade offers.
- [x] Add shared player-trade summary formulas and coverage for open exposure, completed volume, fees, cancelled, and expired offers.
- [x] Surface trade exposure summary data through trade-center queries and the `/trades` page.
- [ ] Installed-environment proof of migration, worker expiry, API routes, UI rendering, and package builds.



## Feature Pass 81 timed progression and course prerequisites

- [x] Add progression timer migration/schema fields for due training and course completions.
- [x] Add shared timed progression and course-requirement formulas.
- [x] Convert training/course starts to scheduled completion rows with cooldown metadata.
- [x] Add worker completion tick for due training/course rewards.
- [x] Surface active training/course queue and locked-course reasons on the dashboard.
- [ ] Installed-environment proof of migration, worker tick, API routes, and dashboard rendering.


## Feature Pass 84 faction operations and migration runner

- [x] Added `pnpm db:apply:all` with migration tracking and checksum validation.
- [x] Runtime proof now uses the all-migration runner so newly added SQL files are picked up automatically.
- [x] Faction bank, member rank, permission, and territory action controls are browser-accessible from `/factions`.
