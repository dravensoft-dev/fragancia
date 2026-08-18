# src/app/catalog — the data

Three files: the shapes (`perfume.model.ts`), the data (`perfumes.data.ts`), and the read-only
accessor (`catalog.ts`).

## Shape

- `PerfumeLine` is the closed set `'hombre' | 'mujer'`. It is also the route segment and the key
  every lookup is made by. Adding a third line means touching the routes, the server routes, the
  sitemap and the header nav.
- `Perfume` is flat and entirely `readonly`. `featured` drives the landing grid; `line` + `slug` is
  the identity; `priceBob` is a number in bolivianos and is formatted at the call site as `Bs {n}`.
- `LineProfile` carries the copy a line owns: `label`, `descriptor`, `lede`, `sloganLead` +
  `slogan`, `metaDescription`, and `rosegold`. **`rosegold` is what puts `.arena-femme` on the
  page** — it is a data flag, not a check against `line === 'mujer'`.

## The data is a constant, not a fetch

- `PERFUMES` and `LINES` are typed module constants. They are read at prerender time and baked into
  the HTML. There is no HTTP call, no store, no loading state, and none may be added: the site has
  no server at runtime.
- `scripts/generate-sitemap.ts` imports these same constants directly. A perfume that is in the
  data is in the sitemap.
- `Catalog` is `providedIn: 'root'` and returns `readonly` slices. Keep it that way — it is the
  single read path and the only thing `catalog.spec.ts` tests.

## Adding a perfume

1. Append an entry to `PERFUMES` in `perfumes.data.ts`. Every field is required except `photo`.
2. `slug` must be unique **within its line** (the spec asserts this) and is the URL segment, so
   keep it lowercase, hyphenated, ASCII.
3. `featured: true` puts it on the landing grid. Keep that list short.
4. `bun run build` — the route is prerendered from `getPrerenderParams`, and the sitemap picks it
   up, both from this same constant. Nothing else to register.

## photo is optional on purpose

- `photo` is a path under `/img/perfumes/`, e.g. `/img/perfumes/khamrah.webp`.
- **Leave it out and `ArenaFigure` draws its `[fallback]` slot** — the brand's drop marker — instead
  of a broken image; see `public/img/perfumes/README.md`.
- Every perfume currently carries a `photo`, but only five bottles were photographed
  (`9pm`, `blue-lady-2`, `club-de-nuit-intense-man`, `club-de-nuit-woman`, `hawas-for-him`). The
  other seven reuse one of those five as a placeholder, matched by line. Replace each with its own
  shot as it arrives.
- When set, it also becomes the `Product` JSON-LD `image` and the `og:image` of that detail route,
  absolutised with `SITE_ORIGIN`. When absent, both fall back to `SITE_IMAGE`.
