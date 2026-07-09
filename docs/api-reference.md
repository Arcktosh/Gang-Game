# API Surface Reference

Current as of Feature Pass 84. Feature Pass 84 keeps the API surface stable and expands browser coverage for faction bank, member-rank, and territory action routes.

This is the current human-readable API route map. It is intentionally lighter than a formal OpenAPI spec, but `pnpm validate:docs` now checks that every concrete route file under `apps/web/src/app/api/**/route.ts` is represented here.

## Auth and account

- `POST` `/api/auth/register`
- `POST` `/api/auth/login`
- `POST` `/api/auth/logout`
- `GET` `/api/auth/me`
- `POST` `/api/auth/password-reset/request`
- `POST` `/api/auth/password-reset/confirm`
- `POST` `/api/auth/email-verification/request`
- `POST` `/api/auth/email-verification/confirm`

## Character, profile, seasons, and progression

- `GET, POST` `/api/characters`
- `GET` `/api/characters/:characterId/events`
- `GET` `/api/characters/:characterId/inventory`
- `GET` `/api/characters/:characterId/overview`
- `GET` `/api/characters/:characterId/status`
- `GET` `/api/profile`
- `POST` `/api/profile/achievements/:achievementKey/claim`
- `POST` `/api/profile/objectives/:objectiveId/claim`
- `POST` `/api/profile/titles/active`
- `GET, POST` `/api/seasons`
- `POST` `/api/seasons/rewards`
- `POST` `/api/prestige`

## Core gameplay

- `GET, POST` `/api/jobs` - list jobs and apply/work/resign through `action: "apply" | "work" | "resign"`.
- `GET, POST` `/api/crimes`
- `GET, POST` `/api/travel`
- `GET, POST` `/api/training`
- `GET, POST` `/api/education`
- `POST` `/api/hospital/care`
- `GET` `/api/legal/status`
- `POST` `/api/legal/lawyer`
- `POST` `/api/legal/bribe`
- `POST` `/api/legal/hospital` - legal-page alias for buying hospital care.
- `POST` `/api/legal/jail` - settle jail fines, post bail, or perform jail-only activities.
- `POST` `/api/legal/court` - request abstract court hearings for active jail sentences.

## Inventory, markets, finance, and gambling

- `GET, POST` `/api/market`
- `GET, POST` `/api/inventory` - list item stacks, rarity/value/risk summaries, use consumables, and directly transfer inventory to same-location characters.
- `GET, POST` `/api/trades` - list private trade center data and create reserved-inventory trade offers.
- `POST` `/api/trades/:tradeOfferId` - accept or cancel an open private trade offer.
- `GET, POST` `/api/equipment`
- `GET, POST` `/api/vehicles`
- `GET, POST` `/api/crafting`
- `POST` `/api/bank`
- `GET` `/api/bank/history` - filtered bank statement/history retrieval with JSON summaries or CSV export.
- `GET, POST` `/api/economy/sinks`
- `GET, POST` `/api/economy/loans` - list loan offers/history and request, partially repay, or fully repay character loans.
- `GET, POST` `/api/finance`
- `GET` `/api/finance/history`
- `GET, POST` `/api/gambling`

## Monetization

- `GET` `/api/monetization/catalog` - list active fair-monetization products.
- `GET` `/api/monetization/entitlements` - list the signed-in user's active entitlements.
- `POST` `/api/monetization/checkout` - create a payment-provider-safe checkout intent placeholder.

## Shops and contracts

- `GET, POST` `/api/shops`
- `POST` `/api/shops/listings`
- `POST` `/api/shops/purchase`
- `POST` `/api/shops/actions`
- `GET, POST` `/api/contracts` - list visible public/private/faction contracts and post escrow-backed public contracts, private assignments, or faction tasks.
- `POST` `/api/contracts/:contractId/accept`
- `POST` `/api/contracts/:contractId/complete`
- `POST` `/api/contracts/:contractId/cancel`

## Factions, territories, PvP, and bounties

- `GET, POST` `/api/factions`
- `POST` `/api/factions/:factionId/join`
- `POST` `/api/factions/:factionId/leave`
- `PATCH` `/api/factions/:factionId/members`
- `POST` `/api/factions/:factionId/bank`
- `POST` `/api/factions/:factionId/inventory`
- `GET` `/api/territories`
- `POST` `/api/territories/actions`
- `GET, POST` `/api/faction-wars`
- `GET` `/api/pvp`
- `POST` `/api/pvp/attack`
- `GET, POST` `/api/bounties`
- `POST` `/api/bounties/:bountyId/cancel`

## Social, newspaper, notifications, and contacts

- `GET, POST` `/api/messages`
- `GET` `/api/messages/stream`
- `GET, POST` `/api/newspaper`
- `GET, POST` `/api/notifications`
- `GET` `/api/notifications/stream`
- `GET, POST` `/api/contacts`
- `GET` `/api/announcements`

## Moderation and admin

- `GET` `/api/admin/audit`
- `GET, POST` `/api/admin/announcements`
- `GET, PATCH` `/api/admin/config`
- `GET` `/api/admin/economy/loans`
- `GET` `/api/admin/moderation`
- `POST` `/api/admin/moderation/reports/:reportId`
- `GET` `/api/admin/search`
- `GET` `/api/admin/transparency`
- `POST` `/api/admin/characters/:characterId/adjust`
- `POST` `/api/admin/characters/:characterId/clear-status`
- `POST` `/api/admin/characters/:characterId/enforce`
- `POST` `/api/admin/characters/:characterId/flag`
- `POST` `/api/admin/enforcements/:enforcementId/lift`
- `POST` `/api/admin/appeals/:appealId/review`
- `POST` `/api/admin/flags/:flagId/resolve`
- `POST` `/api/enforcements/appeals`

## System

- `GET` `/api/health` - returns API status, validated environment status, runtime diagnostics, and request metadata when available.

## Cross-cutting API conventions

### Request observability

Responses passing through middleware include:

- `x-request-id`, generated automatically or preserved from a safe incoming `x-request-id` / `x-correlation-id`;
- baseline browser security headers from pass 35.

All current API route files are wrapped with `withApiObservability` and include:

- `x-response-time-ms`;
- optional JSON `meta.requestId`, `meta.timestamp`, and `meta.durationMs`.

Unhandled errors in API routes are logged as structured JSON and returned as a generic `server_error` response. Production error responses do not expose stack traces or raw exception messages.

### Pagination

Paginated list endpoints accept:

- `limit`: positive integer. Public endpoints cap at 50; admin/internal endpoints cap at 100.
- `offset`: zero-based row offset.

Paginated responses include a `pagination` object with `limit`, `offset`, `count`, `nextOffset`, and `previousOffset`.

Currently paginated endpoints include:

- `GET /api/characters/:characterId/events`
- `GET /api/notifications`
- `GET /api/newspaper`
- `GET /api/shops`
- `GET /api/admin/audit`
- `GET /api/admin/economy/loans`

### Rate limits

Mutating endpoints may return:

```json
{
  "error": {
    "code": "forbidden",
    "message": "Too many requests. Please wait and try again.",
    "details": { "retryAfterSeconds": 60 }
  }
}
```

The initial implementation uses an in-memory window limiter suitable for single-instance development and MVP staging. Production deployment should back this with Redis or another shared store.

### Idempotency keys

Money-moving, inventory-moving, and cooldown-consuming mutation endpoints support the `Idempotency-Key` request header. The header lets clients safely retry after network timeouts without duplicating the underlying action.

Current high-risk coverage includes:

- `POST /api/market`
- `POST /api/gambling`
- `POST /api/shops/purchase`
- `POST /api/crimes`
- `POST /api/jobs`
- `POST /api/contracts`
- `POST /api/contracts/:contractId/accept`
- `POST /api/contracts/:contractId/complete`
- `POST /api/contracts/:contractId/cancel`
- `POST /api/bank`
- `POST /api/finance`
- `POST /api/economy/sinks`
- `POST /api/economy/loans`
- `POST /api/inventory`
- `POST /api/trades`
- `POST /api/trades/:tradeOfferId`
- `POST /api/admin/characters/:characterId/adjust`
- `POST /api/admin/characters/:characterId/enforce`
- `POST /api/enforcements/appeals`
- `POST /api/admin/enforcements/:enforcementId/lift`

Behavior:

- A first successful request stores the response for 24 hours.
- A repeated request with the same user, route scope, idempotency key, and payload returns the cached response with `x-idempotency-replayed: true`.
- Reusing the same key with a different payload returns `409 conflict`.
- Reusing a key while the first request is still processing returns `409 conflict`.
- Failed validation/permission responses are not cached as completed responses.

### Bank history query notes

`GET /api/bank/history` accepts `characterId`, optional `action`, `limit`, `offset`, `from`, `to`, and `format`. The `action` filter supports `all`, `deposit`, `withdraw`, `loan_request`, `loan_repayment`, and `loan_partial_repayment`. JSON responses include `transactions` and a statement `summary`; `format=csv` returns a downloadable CSV statement.

### Loan action payload notes

`POST /api/economy/loans` supports `action: "request"` with an `offerKey` and `action: "repay"` with a `loanId`. Repayment payloads may include an optional positive integer `amount`; when omitted, the API attempts full payoff. Payments are clamped to the outstanding balance, drawn from bank only, and leave the loan unresolved until the total due is paid.

## Mutation safety notes

High-risk mutation routes should combine rate limiting, optional idempotency keys, and database-level conditional writes. First-pass conditional-write coverage includes market buy/sell, player bank deposits/withdrawals, money-sink purchases, loan funding/partial-repayment/full-payoff/default-state handling, player trade reservation/acceptance/cancellation, inventory consumable use/direct transfer, shop listing creation/cancellation/purchase, shop ads, gambling wagers, jobs, crimes, contracts, finance trades, admin balance adjustments, and enforcement cash penalties.

Clients should send `Idempotency-Key` on retryable mutation requests. Server-side conditional writes are a second line of defense for concurrent requests and stale balance/resource reads.

## Operational hardening notes

- Use `Idempotency-Key` on retry-prone money/action mutation routes.
- List routes should continue to expose `limit` and `offset` as they are touched.
- Mutation routes should keep rate limits and same-origin protection enabled.
- `0028_hardening_completion.sql` adds database-level invariant checks and operational indexes.
- Worker maintenance cleanup removes expired idempotency keys, expired sessions, stale action locks, and old notification digests.

## Static validation audit after pass 57

Static checks now run without installed application dependencies:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Current static result after pass 52:

- 32 migrations validated.
- 78 API route files audited.
- 58 unsafe/state-changing route files detected.
- 58 unsafe/state-changing route files include route-level rate-limit helper usage.
- 78 API route files include request observability signals.
- 0 hardening notes remain in the static audit output.
- 94 concrete API routes are cross-checked against this reference by `pnpm validate:docs`.
- MVP page, gameplay progression, admin RBAC, job lifecycle, legal recovery, integration-test, release-readiness, and monetization wiring are checked by the direct validator-file chain inside `pnpm validate:static`.
- CI workflow configuration is cross-checked by `scripts/validate-ci-workflow.mjs` through `pnpm validate:static`.

The audit is static and pattern-based. It is a drift detector, not a substitute for runtime integration tests.

## Runtime smoke validation

Use `pnpm smoke:runtime` against a running app to verify baseline runtime API behavior:

- `GET /api/health` returns JSON, request metadata, and security headers.
- `GET /api/auth/me` returns standard `401` unauthenticated shape.
- Cross-origin unsafe API mutations are rejected with `403`.
- Middleware attaches request IDs and security headers even to framework-level 404 responses.

See `docs/runtime-smoke.md` for configuration and CI usage.

## API documentation gaps

- Add request and response schemas for each route.
- Add auth/permission requirements per route.
- Add error code catalog.
- Generate an OpenAPI spec or typed client once route contracts stabilize.

## Representative route-contract audit after pass 46

Pass 46 added `scripts/audit-route-contracts.mjs` and `pnpm audit:route-contracts`. The audit checks 12 representative route contracts across auth, jobs, crimes, market, shops, contracts, and admin routes for expected guard tokens including observability, auth/admin checks, rate limits, body/query validation, and idempotency where applicable.

## MVP gameplay progression audit after pass 48

Pass 48 added `scripts/validate-mvp-gameplay.mjs`; Feature Pass 88 folded the alias into `pnpm validate:static`. The validator checks that canonical XP/progression helpers exist, job and crime mutations return progression snapshots, database character updates recompute level and max nerve from XP gains, the profile page displays next-level progress, and formula tests cover the new progression helpers.

## MVP page coverage audit after pass 47

Pass 47 added `scripts/validate-mvp-pages.mjs`; Feature Pass 88 folded the alias into `pnpm validate:static`. The validator checks that the dedicated MVP player pages exist, use the shared authenticated `GamePageShell`, load active character context, and are linked from the shared game navigation.

Current page coverage:

- `/profile`
- `/jobs`
- `/crimes`
- `/legal`
- `/market`
- `/shops`
- `/messages`
- `/newspaper`
- `/factions`

## Admin RBAC audit after pass 50

Pass 49 added `scripts/validate-admin-rbac.mjs`; Feature Pass 88 folded the alias into `pnpm validate:static`. The validator checks all 14 admin route files for `requireAdminCapability`, rejects direct `session.user.isAdmin` checks in admin routes, verifies literal capability declarations, verifies the admin page uses `hasAdminCapability`, and confirms `0029_admin_roles.sql` remains covered by the all-migration runner.

## MVP acceptance validation

Pass 53 added `scripts/validate-mvp-acceptance.mjs`; Feature Pass 88 folded the alias into `pnpm validate:static`. The validator checks that representative MVP API route files remain present for auth, characters, jobs, crimes, legal/hospital recovery, market, shops, messages, newspaper, factions, and admin operations.

## Feature Pass 59 admin operations UI validation

Feature Pass 59 added `scripts/validate-admin-operations-ui.mjs`; Feature Pass 88 folded the alias into `pnpm validate:static`. The validator keeps the admin console wired to search, flagging, flag resolution, status clearing, enforcement, enforcement lifting, appeal review, moderation report resolution, economy adjustments, transparency, audit, and the capability-gated admin API routes. Feature Pass 73 extends the console with loan exposure visibility through the admin economy loan endpoint.

## Feature Pass 59 public launch polish

Feature Pass 59 adds public `/privacy`, `/terms`, `/rules`, and `/onboarding` pages plus `scripts/validate-public-launch.mjs`. No new API route paths were added in this pass.
