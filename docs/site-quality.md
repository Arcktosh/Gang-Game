# Site Quality Baseline

Feature Pass 60 adds the first enforceable site-quality layer for accessibility, responsive design, PWA installation, SEO, and browser polish.

## Accessibility

- Root layout includes a keyboard-visible skip link to the main content container.
- Global focus styles use `:focus-visible` so keyboard users can see the active control.
- Primary public and game page landmarks use `aria-labelledby` / `aria-label` where navigation and main regions need explicit names.
- Shared game action forms now pair controls with generated `id` / `htmlFor` values, expose helper/status text through `aria-describedby`, and announce submit results with `aria-live="polite"`.
- Touch targets for buttons, links, and form controls are kept at a minimum accessible height.

## Responsive design

- Page spacing uses `clamp(...)` so desktop and mobile layouts share the same components.
- Navigation wraps naturally and collapses into a two-column or one-column grid on smaller screens.
- Shared grid components use `min(100%, var(--grid-min))` to avoid horizontal overflow.
- Reduced-motion preferences are respected with a global `prefers-reduced-motion` media query.

## PWA

- `apps/web/src/app/manifest.ts` defines install metadata, standalone display mode, theme color, app shortcuts, and icon references.
- SVG app icons live in `apps/web/public/icons/`.
- The root metadata points at `/manifest.webmanifest`.

## SEO

- Root metadata includes a metadata base, title template, description, keywords, canonical URL, Open Graph metadata, Twitter card metadata, icons, and robots defaults.
- `apps/web/src/app/robots.ts` exposes public marketing/policy routes while disallowing private game/admin/API surfaces.
- `apps/web/src/app/sitemap.ts` lists public indexable routes.
- `apps/web/public/opengraph-image.svg` provides a social preview image.

## Validation

Run the static site-quality gate with:

```bash
pnpm validate:site-quality
```

The command is included in `pnpm validate:static` and checks that the accessibility, responsive design, PWA, SEO, and documentation surfaces remain wired.

## Remaining manual checks

The validator is static. Before public launch, run the site in a browser and perform:

- Lighthouse accessibility, SEO, best-practices, and PWA checks.
- Keyboard-only navigation through public pages, auth pages, gameplay pages, and admin pages.
- Screen-reader smoke checks for action forms and status feedback.
- Mobile viewport checks at 360px, 390px, 768px, and desktop widths.
- Installability checks in Chromium-based browsers.
