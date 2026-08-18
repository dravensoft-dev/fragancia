# src/app/catalog — the data

Five files: the shapes (`perfume.model.ts`), the rules (`catalog.schema.ts`), the composed meta
description (`perfume-meta.ts`), the read-only accessor (`catalog.ts`), and the build product the
accessor reads (`perfumes.generated.ts`, never edited and never committed).

## Shape

- `PerfumeLine` is the closed set `'hombre' | 'mujer'`. It is also the route segment and the key
  every lookup is made by. Adding a third line means touching the routes, the server routes, the
  sitemap and the header nav.
- `Perfume` is flat and entirely `readonly`. `featured` drives the landing grid; `line` + `slug` is
  the identity; `priceBob` is a number in bolivianos and is formatted at the call site as `Bs {n}`;
  `inStock` is a boolean and never a count, so `offers.availability` is true in the prerendered
  HTML; `order` is the presentation rank inside a line, ascending, ties broken by `name`.
- `LineProfile` carries the copy a line owns: `label`, `descriptor`, `lede`, `sloganLead` +
  `slogan`, `metaDescription`, and `rosegold`. **`rosegold` is what puts `.arena-femme` on the
  page** — it is a data flag, not a check against `line === 'mujer'`.

## The source is `content/`, and the catalogue is a build product

- `PERFUMES` and `LINES` live in `perfumes.generated.ts`, which `scripts/generate-catalog.ts` writes
  from the YAML under `content/perfumes/<line>/` and `content/lines/`. **Edit the YAML, never the
  generated file**, and run `bun run prepare:assets`.
- They are still typed module constants, read at prerender time and baked into the HTML. There is no
  HTTP call, no store, no loading state, and none may be added: the site has no server at runtime.
- `catalog.schema.ts` states every rule as a pure function and is what `catalog.schema.spec.ts`
  tests. It is imported by the generator and by no component, so it never enters the bundle.
- `perfume-meta.ts` composes the detail page's meta description, and both the page and the validator
  call it. The limit is measured on that composed string, not on `summary` alone.
- `scripts/generate-sitemap.ts` imports the same generated constants. A perfume in `content/` is a
  route, an entry in the sitemap and a card in the grid.
- `Catalog` is `providedIn: 'root'` and returns `readonly` slices. Keep it that way — it is the
  single read path and the only thing `catalog.spec.ts` tests.

## Adding a perfume

1. The owner does it in `/admin`. By hand it is a new file at
   `content/perfumes/<line>/<slug>.yml`, with every field except `photo`.
2. `slug` must match the file name, and `line` must match the directory. Both are rules, not
   conventions, and the generator refuses the build over either.
3. `order` decides where it sits inside its line; leave it at 100 and it lands after everything that
   exists. `featured: true` puts it on the landing grid, and between two and eight perfumes may
   carry it, at least one per line.
4. `inStock: false` marks it _Agotado_ on the card and the detail page and turns the offer's
   `availability` into `OutOfStock`. **It stays listed, prerendered and in the sitemap**: a page that
   says "agotado" beats a 404 on a URL Google already knows.
5. `bun run build` — the route is prerendered from `getPrerenderParams` and the sitemap picks it up,
   both from the generated catalogue. Nothing else to register.

## photo is optional on purpose

- `photo` is a path under `/img/perfumes/`, e.g. `/img/perfumes/khamrah.webp`. The shape is a rule —
  `^/img/perfumes/[a-z0-9-]+\.(webp|jpg|png)$` — **and the file must exist**. The CMS always uploads
  `.webp`; the other two are for shots added by hand.
- **Leave it out and `ArenaFigure` draws its `[fallback]` slot** — the brand's drop marker — instead
  of a broken image; see `public/img/perfumes/README.md`.
- Every perfume currently carries a `photo`, but only five bottles were photographed
  (`9pm`, `blue-lady-2`, `club-de-nuit-intense-man`, `club-de-nuit-woman`, `hawas-for-him`). The
  other seven reuse one of those five as a placeholder, matched by line. Replace each with its own
  shot as it arrives.
- When set, it also becomes the `Product` JSON-LD `image` and the `og:image` of that detail route,
  absolutised with `SITE_ORIGIN`. When absent, both fall back to `SITE_IMAGE`.
