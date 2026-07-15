# Project Status

Last updated: Feature Pass 105.

The project has advanced from its **MVP candidate** baseline to a **production release candidate pending proof**. Feature Pass 56 established the executable MVP acceptance gate. Feature Pass 59 added public launch polish and draft policy surfaces. Feature Pass 60 established the accessibility, responsive-design, PWA, and SEO site-quality baseline. Feature Passes 98-102 completed package-test baselines, the production proof contract, observability foundations, and reusable job/crime integration boundaries. Feature Pass 103 added a required character setup gate, accessible disclosures, capability-aware contract/faction/shop rendering, and persistent product images with compact market/shop cards and detail graphs. Feature Pass 104 neutralized the historical development owner and introduced separate guarded local-seed and production-owner bootstrap paths. Feature Pass 105 turns the former dashboard, profile, and inventory section disclosures into dedicated pages, retains collapsible cards within each page, and reorganizes navigation by gameplay domain.

## Ready for controlled MVP evaluation

- Auth, account recovery, required character creation, routed profile/dashboard/inventory hubs, categorized navigation, and session handling.
- Core playable loops: jobs, crimes, travel, legal/hospital recovery, market, banking, loans, training, education, shops, messages, newspaper, factions, PvP, contracts, and admin operations. Market/shop products now support managed images and compact expandable cards; unavailable contract/faction/shop action groups are omitted instead of rendered as dead controls.
- Static validation, migration checks, runtime proof orchestrator wiring, and stale agent-memory validation.
- No fixed deployable development password; owner bootstrap commands require explicit environment gates and operator-supplied strong credentials.
- Public launch pages and draft policies.

## Not production-ready until proven

- Full installed-environment proof through `pnpm prove:mvp-runtime`; the reported Windows spawn failure and follow-up Admin Console audit prop type mismatch are repaired, but the full proof still needs to be rerun locally.
- Database-backed integration proof through `pnpm prove:integration`.
- Real external observability/alerts, abuse prevention, bot detection, load testing, and final legal/payment review.
