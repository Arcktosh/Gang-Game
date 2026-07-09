# Remaining Work

Runtime proof still required. Feature Pass 56 established the MVP acceptance gate; Feature Pass 59 added public launch polish and left Production legal review as a commercial-launch blocker; Feature Pass 60 left manual Lighthouse and assistive-technology verification as real-browser work.

## Highest priority

1. Run `pnpm prove:mvp-runtime` with dependencies installed, PostgreSQL running, and Redis running.
2. Run `pnpm prove:integration` against a disposable `TEST_DATABASE_URL`.
3. Fix any migration, build, typecheck, test, smoke, backup, or restore failures found during proof.
4. Add external log shipping, alerting, abuse analytics, bot detection, and load testing.

## Feature-depth backlog

- Public profile routes, tutorial/wiki, skill trees, season leaderboards/rewards, daily login streaks, referral/mentor systems.
- Auction house, player-hosted gambling tables, faction diplomacy, territory upgrades/taxes, formal war UI, multi-step contracts.
- Deeper economy controls: inflation/passive-income controls, balance editor wired into formulas/ticks, anomaly detection.
- Admin archives, message hide/delete workflow, economy/inventory/IP/session audit tools, rollback tooling, feature flags.

## Closed in-progress markers kept for validation

Feature Pass 61 in-progress task update: [x] Full Messages page with live stream status, read/mute/leave/report/block controls, and responsive message actions.
