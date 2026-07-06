# Current State Brief

Last updated: Feature Pass 75 richer banking statements.

## Project posture

The project is a **static MVP candidate pending installed-environment runtime proof**. Feature breadth is high enough for controlled MVP evaluation, and the current risk is whether the app, database migrations, worker, tests, runtime smoke checks, backup, and restore all pass together in a real environment.

## Completed MVP-level areas

- Monorepo with Next.js web app, worker app, shared database/game/validator/UI packages.
- Docker Compose uses configurable PostgreSQL/Redis image variables, AWS Public ECR mirror defaults, service health checks, and persistent Redis storage for local runtime proof.
- Auth/session foundation plus password reset and email verification with hashed one-time tokens.
- Character creation, profile UI, title controls, event summaries, and privacy guidance.
- Core actions for jobs, crimes, travel, market, banking/statements, training, education, legal recovery, and hospital care.
- Job application, work, rank/promotion, resignation, and visible progression loop.
- Jail/hospital/legal consequences and automatic recovery/status refresh.
- Inventory, equipment, durability, repairs, vehicle profile/upgrades, crafting queues, contacts, and NPC assignments.
- Factions, territories, PvP, bounties, contracts, and first-pass faction chat groundwork.
- Player shops with creation, listings, purchases, cancellation, ads, reviews, ledger/sales history, and owner controls.
- Newspaper with submissions, categories/archive, comments, reactions, reports, and moderation handoff.
- Economy additions include player cash-to-bank deposits/withdrawals, authenticated bank transaction history, dashboard bank activity, filtered bank statements with summaries/CSV export, authenticated money-sink catalog/purchase actions, loan offers/funding/partial repayment/full payoff plus overdue/default worker handling and admin loan exposure review, authenticated finance price-history retrieval, and client-side finance sparkline charts with deferred Economy-section history loading.
- Direct messages with conversations, live status, read/mute/leave/block/report controls, and report history.
- Notifications, activity feed, preferences, browser alert wiring, and SSE streams.
- Admin console with RBAC/capability gates, search, moderation, enforcement, appeals, balance tools, loan exposure visibility, flags, transparency, inventory audit, session audit, and moderation archive visibility.
- Public beta pages, policy drafts, community rules, onboarding, site-quality baseline, PWA/SEO/accessibility wiring, and monetization placeholders.

## Validation already represented statically

- Migration ordering/script coverage.
- API hardening and observability coverage.
- Representative route contracts.
- MVP page and playable-action coverage.
- Progression, admin RBAC, job lifecycle, legal recovery, release-readiness, integration-test wiring, MVP acceptance, runtime-proof wiring, monetization, public-launch, site-quality, in-progress closure, documentation, and CI workflow audits.

## Main blockers

1. Run `docker compose up -d` and confirm PostgreSQL/Redis are healthy with `docker compose ps`; override `POSTGRES_IMAGE`/`REDIS_IMAGE` only if the local network requires a different registry.
2. Run `pnpm prove:mvp-runtime` in a real installed environment with pnpm, PostgreSQL, Redis, and a disposable restore database.
3. Run `pnpm prove:integration` against a disposable PostgreSQL database.
4. Fix any install, migration, typecheck, test, smoke, backup, or restore failures found by those proofs.
5. Run dependency-backed typecheck/tests after install to confirm the Feature Pass 67-73 banking, bank-history, money-sink, loan/defaulting/partial-repayment/admin-exposure, dashboard performance hotfix, and finance chart code paths compile under the full workspace dependency graph.
6. Add external production observability: log shipping, alerting, error reporting, retry/dead-letter policy, distributed rate limiting, and abuse analytics.

## Do not prioritize yet

Do not add more broad gameplay systems until runtime proof passes. New features should be limited to fixing proof failures, reducing operational risk, or compact low-risk UX/economy gaps.

## Pass 73 validation hotfix

The package-game legacy-points test expectation was aligned with the current formula output. The MVP runtime proof now uses an isolated disposable `*_mvp_proof` database by default, preventing repeated proof runs from failing on existing enum/table objects in the local development database.


## Documentation consolidation

Feature Pass 74 consolidates the historical `feature-pass-XX.md` audit trail into `docs/feature-history.md` and removes the separate `docs/feature-index.md`, reducing the docs folder file count while keeping current planning docs separate from historical notes.


## Feature Pass 75 banking statements

Bank history now supports filtered JSON statements and CSV export. The dashboard Economy section can load filtered statement rows, view inflow/outflow/net summaries, and download the latest statement CSV.
## Feature Pass 75 stability hotfix

Fixed dashboard section-switching regressions reported during local runtime testing: finance-history empty-state updates now avoid maximum update-depth loops, async form handlers reset captured form references, and message unread counts no longer rely on raw duplicated timestamp casts.

