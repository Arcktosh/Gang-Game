# Production Readiness Report - Feature Pass 105

**Generated:** 2026-07-15T16:48:44Z
**Disposition:** **PRODUCTION RELEASE CANDIDATE - installed and staging proof still required**
**Production approved:** **No**

## Executive assessment

Feature Pass 105 implements the requested information-architecture change. The former dashboard, profile, and inventory page-level disclosure sections are now 17 distinct App Router pages. The content cards within those pages retain accessible native disclosure behavior, every promoted page is represented in a reorganized categorized sidebar, inactive dashboard route content is not mounted as hidden DOM, and the live dashboard streams only connect on the routes that use them.

The character-creation boundary, product images, compact market/shop cards, product detail graphs, and capability-aware visibility delivered in Feature Passes 103 and 104 remain in place. Dependency-light source acceptance passes. The repository is not yet production-approved because this environment cannot install the pinned workspace dependencies or exercise PostgreSQL, Redis, the optimized Next.js build, or real-browser accessibility and responsive behavior.

## Requested feature completion

| Requirement | Result | Implementation evidence |
|---|---:|---|
| Convert the current page-level collapsible menus into separate pages | **Complete** | Eight dashboard routes, six profile routes, and three inventory routes are implemented through shared route-level server components. `/dashboard`, `/profile`, and `/inventory` remain stable overview entry points. |
| Keep the collapsible concept for cards inside each page | **Complete** | Reusable `CollapsibleCard` uses native `details/summary`, independent state, visible expand/collapse status, keyboard focus treatment, and a semantic level-two heading. |
| Add all promoted pages to the side navbar | **Complete** | Every promoted route is present in the shared navigation model and is covered by route/navigation validation. |
| Reorganize pages into more relevant categories | **Complete** | Sidebar groups are Overview, Character, Actions, Economy, Inventory, Community, and World. |
| Avoid ambiguous active navigation | **Complete** | Longest-route matching marks only the most specific route with `aria-current="page"`; `/dashboard` does not remain active on `/dashboard/activity`, for example. |
| Preserve accessibility and avoid inaccessible hidden content | **Complete at source level** | Sidebar groups expose `aria-expanded`/`aria-controls`; card disclosures are native controls; inactive dashboard cards return `null` rather than remaining hidden in the page tree. Browser and assistive-technology proof remains open. |

## Route map

### Overview

- `/dashboard` - dashboard overview
- `/dashboard/activity` - notification and activity center

### Character

- `/profile` - character overview
- `/profile/status` - legal, medical, location, and public status
- `/dashboard/progression` - progression center
- `/profile/achievements` - achievements
- `/profile/rewards` - claimable rewards
- `/profile/titles` - titles
- `/profile/history` - character history

### Actions

- `/dashboard/actions` - consolidated action center
- `/jobs` - jobs
- `/crimes` - crimes
- `/legal` - legal and recovery

### Economy

- `/dashboard/economy` - economy center
- `/market` - player market
- `/shops` - shops
- `/trades` - direct trades
- `/contracts` - contracts

### Inventory

- `/inventory` - inventory summary
- `/inventory/items` - item stacks and use actions
- `/inventory/transfers` - item transfers

### Community

- `/dashboard/messages` - message overview
- `/messages` - message threads
- `/dashboard/crew` - crew center
- `/factions` - factions

### World

- `/dashboard/news` - news center
- `/newspaper` - newspaper

## Implementation detail

### Route-level page composition

- `DashboardSectionPage`, `ProfileSectionPage`, and `InventorySectionPage` centralize authentication, character context, data loading, titles, and page composition while thin App Router wrappers identify the requested section.
- The base routes continue to work as overview pages, preserving bookmarks and existing entry points.
- The character prerequisite remains enforced at the shared `(game)` layout, so every promoted route redirects an authenticated user without a character to `/create-character`.

### Card disclosures

- `CollapsibleCard` is built on native `details/summary` rather than a visually hidden custom panel.
- Each card controls its own open state; opening one card does not force unrelated cards closed.
- High-priority first cards may open by default while remaining independently collapsible.
- Summary controls expose a descriptive title, optional metadata, visible expand/collapse text, and a semantic heading.
- Inactive dashboard sections return no markup, so another route's content is not present as an inaccessible hidden region.

### Categorized side navigation

- Navigation data is defined in a pure shared module and rendered by `GameSideMenu`.
- Group controls expose `aria-expanded` and `aria-controls`; the current group automatically opens.
- Route matching is sorted by descending path length before prefix matching, yielding one unambiguous current link.
- A dependency-light unit test verifies unique links, category structure, and most-specific active-route selection.

### Route-scoped live connections

- Notification streaming and browser-notification permission handling are active only on `/dashboard/activity`.
- Message streaming is active only on `/dashboard/messages`.
- Other dashboard pages no longer open both server-sent-event connections simply because they reuse the dashboard panel.

## Existing production hardening retained

- Authenticated users without characters are redirected to character creation before game functionality is exposed.
- Product images support validated JPEG, PNG, and WebP uploads, persistent PostgreSQL storage, administration controls, cache validation, compact market/shop presentation, and detail-level supply/demand graphs.
- Unavailable faction, contract, shop, and owner actions are omitted instead of being presented as dead sections.
- The historical development-owner credential is neutralized through migration `0049`; local development seeding and production administrator bootstrap remain separate, explicit, guarded commands.

## Checklist state

| Category | Count |
|---|---:|
| Checked items | **412** |
| Partially completed or evidence-dependent items | **40** |
| Unchecked items | **79** |
| Total tracked items | **531** |

All Feature Pass 105 source items are checked. The direct remaining proof entry is `docs/feature-checklist.md:710`, covering installed typecheck, tests, optimized build, direct-route browser navigation, keyboard/screen-reader checks, and responsive sidebar proof. The broader `VAL-001` gate remains at `docs/feature-checklist.md:667`, with product-image and administrator-bootstrap staging proof at lines 683 and 696.

## Validation evidence

| Gate | Result | Evidence |
|---|---:|---|
| TypeScript/TSX source syntax | **PASS** | TypeScript `transpileModule` validation across 187 files in `apps/web/src` |
| Focused unit tests | **PASS** | 5 passed: 2 navigation tests and 3 product-image helper tests |
| Player route and UX/media contracts | **PASS** | 27 routable player pages plus 20 production UX/media contracts |
| MVP gameplay wiring | **PASS** | XP curve, progression rewards, route progression snapshots, and profile XP display |
| Full dependency-light static acceptance | **PASS** | `npm run validate:static --silent` |
| Strict release source audit | **PASS WITH 1 WARNING** | 13 passed, 1 warning, 0 failed; the warning is the intentionally open `VAL-001` installed-proof gate |
| Migration sequence | **PASS** | 50 migrations, `0000` through `0049`, with no sequence gaps |
| Dependency-backed lint/typecheck/tests/build | **PENDING** | Workspace dependencies are unavailable in this sandbox |
| Database/runtime/browser proof | **PENDING** | PostgreSQL, Redis, Docker, `psql`, and a browser/assistive-technology harness are unavailable here |

## Environment constraint

The repository has no installed workspace dependencies. Corepack is available, but registry access failed while retrieving the pinned pnpm version and packages. Docker and `psql` are also unavailable. A global TypeScript parser can validate syntax, but the full workspace type graph cannot resolve framework and package types without `node_modules`. Therefore lint, full TypeScript checking, workspace tests, the optimized Next.js build, migration execution, web/worker runtime proof, and browser accessibility checks are not claimed as passed.

## Required production proof sequence

Run from a clean checkout in connected CI or production-like staging:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm release:audit:strict
pnpm validate:static
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm doctor:proof
MVP_RESTORE_DATABASE_URL='postgresql://...' pnpm prove:mvp-runtime
TEST_DATABASE_URL='postgresql://...' pnpm prove:integration
```

Then retain evidence for the following:

1. Navigate to all 17 promoted dashboard/profile/inventory pages by sidebar link and direct URL.
2. Confirm browser back/forward history, refresh behavior, and one current navigation link at a time.
3. Operate every card disclosure with keyboard only and verify names, expanded states, reading order, and focus behavior with a screen reader.
4. Verify sidebar group expansion, scrolling, and content layout at narrow mobile, tablet, and desktop widths.
5. Confirm notification and message event streams connect only on their owning routes and disconnect cleanly during navigation.
6. Re-run the retained Feature Pass 103/104 product-image, character-gate, migration, account-bootstrap, backup, restore, rollback, monitoring, and legal launch proofs.

## Release decision

The correct designation is **production release candidate pending installed proof**. The requested route, sidebar, and disclosure implementation is complete at source level, and dependency-light acceptance passes. Do not close `VAL-001` or route production traffic until the installed, database-backed, runtime, responsive-browser, keyboard, and assistive-technology evidence above has been retained.
