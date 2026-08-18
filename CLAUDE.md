# Fragancia

Static marketing site and small catalogue for an Arabic perfumery in Cochabamba. Angular 22
prerendered to HTML, skinned with Arena.

`README.md` (Spanish) documents the decisions and their reasoning. This file is the working
contract: the rules that hold across the tree, and the traps that already cost a session.

## Rules

### Comments

- **Write no comments. Anywhere. Ever.** Not in TypeScript, not in HTML, not in CSS, not in JSON.
- The comments the Angular CLI scaffolding shipped with were stripped on purpose. Do not
  reintroduce them, and do not restore them when regenerating a scaffolded file.
- `CLAUDE.md` and `README.md` are documentation, not code, and are exempt.

### Language

- **All code is English**: identifiers, types, file names, commit messages, test names, and every
  string that is not shown to a person.
- **Spanish is for two things only**: app route paths (`/perfumes/mujer`) and user-facing UI copy.
- Arena's own rule says copy must be English. **This project overrides it deliberately** — the
  business speaks Spanish — and the override is stated in `README.md`. Do not "fix" Spanish copy.

### Stack

- Bun is the package manager and the script runtime. Never `npm`, never `yarn`, never `npx` where
  `bunx` works.
- Angular 22 on `@angular/build`: Vite in dev, esbuild in build. There is no webpack config to
  reach for.
- `@angular/ssr` with `outputMode: "static"`. **Every route is prerendered and there is no server
  at runtime.** Nothing may depend on a request, a header, a cookie, or a runtime environment
  variable. New dynamic routes need an entry in `src/app/app.routes.server.ts` with
  `getPrerenderParams`, or they will not exist in the output.

### Design system

`@dravensoft/arena-angular` 10.0.0 carries the language; `arena.config.json` plus
`design/fragancia/` carry the skin. Hold these:

- **No class of ours on an Arena element.** Put the class on a container we own and let the Arena
  element be its child.
- **No rule targeting an `arena-*` class.** Those names are compiler output, not a contract.
  `data-arena-part` hooks are the contract, and only `design/fragancia/plugin.css` may select them.
- **Every value is read through its token.** No hex, no `rgb()`, no colour name, no bare pixel
  length. Derive with `calc()`, `clamp()` or `color-mix()` over a token.
- **Icons are Phosphor class strings**, `class="ph-bold ph-whatsapp-logo"` or `icon="…"`, never an
  element and never inline SVG. The one inline SVG in the tree is the brand mark, and it is ours.
- **No emoji.**
- **No gradients**, on any surface. The identity manual's "liquid gold" gradient is deliberately
  rendered as flat gold.
- **One primary accent per view.** Gold is distinction, not a second primary.
- **Danger is outline**, never filled.

### Rhythm

- **Air between components comes from Arena's rhythm classes**: `.arena-stack` and `.arena-row`,
  with `--group` / `--component` / `--section` for the step. Put one on a container we own.
- **Never hand-write `display: flex` + `gap` to separate components.** That is the defect these
  classes exist to end, and it was removed from this tree once already.
- `--gap-control` and `--gap-inline` are for composition _inside a single control_ — an icon beside
  its label — and for nothing else.

### Fonts

- All four faces are self-hosted from `public/fonts/` and declared in `arena.config.json`
  (`display`, `body`, `mono`) or in `src/styles.css` (Sacramento, as `--ff-slogan`).
- **Nothing may request `fonts.googleapis.com` or `fonts.gstatic.com`.** A `src` pointing at a
  Google stylesheet in `arena.config.json` is a regression, not a shortcut.

### SEO

SEO is a first-class requirement, not a finishing pass. A new route is not done until it has:

- a `title` and an `arenaRouteMeta` `description` (or an `ArenaMetadataService.apply()` call when
  the metadata is a fact about the record, not about the route);
- a canonical and the `og:*` pair, which follow from `origin` being configured;
- the right JSON-LD, via `<app-structured-data>`;
- an entry in the generated `sitemap.xml`, which follows from the catalogue;
- **complete HTML at prerender time.** Anything that only appears after hydration is invisible to a
  crawler and to a reader with no JS.

### Formatting and lint

- Prettier follows the Angular convention (`.prettierrc`): 100 columns, single quotes in TS,
  **double quotes in CSS**, `parser: angular` for templates.
- `angular-eslint` on top, with `eslint-config-prettier` last so the two never argue.
- Tests are Vitest through `@angular/build:unit-test`. Run them with `bun run test`, not `vitest`.

## Commands

```bash
bun install
bun start              # dev server on 0.0.0.0:4200
bun run build          # prerenders every route into dist/fragancia/browser
bun run test           # Vitest
bun run lint           # angular-eslint
bun run format         # Prettier over the tree (format:check to verify only)
bun run audit:arena    # arena-to-prod report over src and design, writes nothing
bun run serve:static   # serves the build on :4173
```

The Pages workflow adds two steps of its own, and they are not part of normal work:

```bash
bun run build --base-href=/fragancia/
bun run scripts/pages-preview.ts /fragancia/
```

`prestart`, `prebuild`, `pretest` and `prelint` all run `prepare:assets`, which regenerates:

- `src/app/catalog/perfumes.generated.ts`, from `scripts/generate-catalog.ts` reading `content/`;
- `public/sitemap.xml`, from `scripts/generate-sitemap.ts`;
- `src/arena.generated.css`, `src/icons.generated.css` and `src/plugin.generated.css`, from
  `arena-to-prod` reading `arena.config.json`, `src/` and `design/`.

`postbuild` runs `scripts/emit-404.ts`.

## Build products — never edit, never commit

- `src/arena.generated.css`
- `src/icons.generated.css`
- `src/plugin.generated.css`
- `src/app/catalog/perfumes.generated.ts`
- `public/sitemap.xml`

All five are in `.gitignore`, `.prettierignore` and the ESLint `ignores` list. To change what they
contain, change their source — `arena.config.json`, `design/fragancia/`, or `content/` — and run
`bun run prepare:assets`. A fresh clone does not compile until the first generation, exactly as it
has no Arena sheets until then; the four lifecycle hooks cover it.

## GitHub Pages is the maquette, not the site

`.github/workflows/pages.yml` publishes every push to `main` to
`dravensoft-dev.github.io/fragancia/`. That is a showroom; `fragancia.com.bo` is the site.

- **The tree stays configured for the root of the real domain.** `SITE_ORIGIN` is
  `https://fragancia.com.bo`, `<base href>` is `/`, `robots.txt` allows everything. Do not move any
  of it to github.io.
- The subpath is a build flag and nothing else: `bun run build --base-href=/fragancia/`. Angular
  rewrites `<base>` and every `routerLink` from it.
- **A URL our own code writes must go through `Location.prepareExternalUrl()`**, because
  `--base-href` reaches `routerLink` and nothing else. `perfume-card` does it for the card's `href`
  and the photo; `perfume-detail` does it for the crumbs and the photo. It is the identity at the
  root, so it costs production nothing, and `perfume-card.spec.ts` holds both cases. An `href` or a
  `src` written as a bare `/…` in a template is a 404 in the maquette.
- `ArenaBreadcrumbs` takes `href` already prefixed, so `goTo()` strips the base back off with
  `Location.normalize()` before handing the path to the router.
- Everything specific to the maquette — the font URLs the base href cannot reach, and the SEO going
  to sleep — lives in `scripts/pages-preview.ts` and runs only in the workflow.

## Gotchas

Each of these was paid for once. Do not rediscover them.

- **`ArenaBreadcrumbs` 10.0.0 is not hydration-safe.** It renders its JSON-LD `<script>` before its
  `<nav>`, which throws NG0500 on hydration and drops the client bindings of everything after it.
  It carries `ngSkipHydration` in `perfume-detail.html`. Leave it there.
- **A style plugin role that aliases a scale step is resolved at generation time.** `step-title-surface`
  written as `{fs.h4}` freezes the value `fs.h4` had when the plugin was generated; re-answering the
  `fs` step afterwards does not flow into the role. **Answer the role too**, or answer it with a
  literal, which is what it does now.
- **`ArenaMetadataService.apply()` prefixes `origin` onto `canonical`.** Pass a path
  (`/perfumes/mujer/yara`), never an absolute URL, or the canonical comes out doubled.
- **A projection marker attribute that is not imported renders nothing, silently.** Writing
  `[figure]`, `[actions]`, `[media]`, `[fallback]`, `[brand]` or `[nav]` without listing the matching
  `Arena*` directive in that component's own `imports` leaves the slot empty with no error and no
  template diagnostic. `arena-to-prod` reports it on stderr; nothing else does.
- **`--bp-*` does not resolve during prerender**, so `arenaViewportBelow` always returns the wide
  branch server-side. Do not use it for anything visible at first paint. The one width decision in
  this project is a media query for exactly this reason.
- **Prettier must keep double quotes in CSS.** `arena-to-prod` detects part hooks by matching
  `data-arena-part="..."`; single quotes make it blind to the whole style plugin. The `.prettierrc`
  override that sets `singleQuote: false` for `*.css` is load-bearing.
- **`arena-to-prod` reports `arena-stack` as an unknown component**, and `arena-row` and
  `arena-prose` beside it. They are rhythm and prose classes, not components. False positive,
  harmless, expected in every run.
- **`bun run build` carries `NODE_OPTIONS=--disable-warning=DEP0205`.** It silences a
  `module.register()` deprecation inside `@angular/build`'s prerender worker, and nothing of ours.
  Remove it when Angular updates the call.

## Verification checklist

Run all of these before claiming work is done:

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

Then check by hand, because nothing above checks them:

- **No horizontal overflow from 320px up.** Sweep 320, 360, 390, 768 and 1024 over all four
  templates: `scrollWidth` must equal the viewport and no element may overflow.
- **No external font requests.** No call to `fonts.googleapis.com` or `fonts.gstatic.com` in the
  network panel.
- **The skip link is the first tab stop**, and it lands on the main region.
