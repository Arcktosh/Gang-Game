# Project Status

Last updated: Feature Pass 89.

The project is an **MVP candidate**. Feature Pass 56 added monetization placeholders and MVP acceptance checks; Feature Pass 59 added public launch polish; Feature Pass 60 added accessibility, responsive design, PWA, and SEO foundations; Feature Pass 88 reduced package-script and documentation sprawl while adding Redis-backed rate limiting; Feature Pass 89 hardened achievement sync idempotency and worker retry/dead-letter handling.

## Ready for controlled MVP evaluation

- Auth, account recovery, character creation, profile, and session handling.
- Core playable loops: jobs, crimes, travel, legal/hospital recovery, market, banking, loans, training, education, shops, messages, newspaper, factions, PvP, contracts, and admin operations.
- Static validation, migration checks, and runtime proof orchestrator wiring.
- Public launch pages and draft policies.

## Not production-ready until proven

- Full installed-environment proof through `pnpm prove:mvp-runtime`.
- Database-backed integration proof through `pnpm prove:integration`.
- Real external observability/alerts, abuse prevention, bot detection, load testing, and final legal/payment review.
