# Admin de un solo usuario sobre Git — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the catalogue from a TypeScript constant to validated content files, give the
perfumery's owner a `/admin` form that writes them, and keep every route prerendered and
SEO-complete while doing it.

**Architecture:** `content/` (one YAML per record, versioned) is the source. A pure validator in
`src/app/catalog/catalog.schema.ts` states every rule; `scripts/generate-catalog.ts` reads
`content/`, runs the validator and emits `src/app/catalog/perfumes.generated.ts`, a build product
that everything else imports. Sveltia CMS in `public/admin/` gives the owner a form; GitHub gives
the identity; Dokploy rebuilds on push. A `content` file that breaks a rule breaks `bun run build`,
so the previously deployed site stays up.

**Tech Stack:** Angular 22 (`@angular/build`, `@angular/ssr` with `outputMode: "static"`), Bun
1.3.14 (`Bun.YAML`), Vitest through `@angular/build:unit-test`, `@dravensoft/arena-angular` 10.0.0,
Sveltia CMS (vendored), Dokploy.

**Spec:** `docs/superpowers/specs/2026-08-18-admin-cms-design.md` — read it before Task 1. The plan
argues from it and never re-opens it.

---

## Global Constraints

These come from `CLAUDE.md`, which outranks this plan and the spec. Every task's requirements
implicitly include this section.

- **Write no comments. Anywhere. Ever.** Not in TypeScript, HTML, CSS or JSON. The single exception
  this plan introduces is `public/admin/`, which is third-party application code in an isolated
  directory and is exempt by the spec. `docs/` and `README.md` are documentation, not code.
- **All code is English**: identifiers, types, file names, commit messages, test names, and every
  string not shown to a person. **Spanish is for two things only**: app route paths and user-facing
  UI copy. The CMS form labels, hints and validation messages are user-facing → Spanish. The
  generator's error output is developer-facing → English.
- **Bun is the package manager and the script runtime.** Never `npm`, never `yarn`, never `npx`
  where `bunx` works.
- **Every route is prerendered and there is no server at runtime.** Nothing may depend on a request,
  a header, a cookie or a runtime environment variable. A new dynamic route needs an entry in
  `src/app/app.routes.server.ts` with `getPrerenderParams`.
- **Arena rules hold for anything visual**: no class of ours on an Arena element; no rule targeting
  an `arena-*` class; only `design/fragancia/plugin.css` may select a `data-arena-part`; every value
  read through its token (no hex, no `rgb()`, no bare pixel length); icons are Phosphor class
  strings; no emoji; no gradients; one primary accent per view; danger is outline.
- **Air between components comes from `.arena-stack` / `.arena-row`** with `--group` / `--component`
  / `--section`, on a container we own. Never hand-write `display: flex` + `gap` to separate
  components.
- **Prettier**: 100 columns, single quotes in TS, **double quotes in CSS**, `parser: angular` for
  templates. `bun run format` before every commit.
- **SEO is a first-class requirement**: complete HTML at prerender time, canonical and `og:*` from
  `origin`, the right JSON-LD, an entry in the generated sitemap.
- **Build products are never edited and never committed.** After this plan they are:
  `src/arena.generated.css`, `src/icons.generated.css`, `src/plugin.generated.css`,
  `public/sitemap.xml`, and the new `src/app/catalog/perfumes.generated.ts`.
- **Commit messages follow the tree's convention**: imperative sentence-case subject under ~70
  characters, a body wrapped at ~72 that says _why_, and the trailer
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. No `feat:` / `fix:` prefixes.

## The verification ritual

**Every task ends with all five of these, and none may be skipped or claimed unrun:**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

`arena-to-prod` reports `arena-stack`, `arena-row` and `arena-prose` as unknown components in every
run. That is a known false positive; anything else it reports is real.

Tasks that change a template also require the hand checks `CLAUDE.md` lists: no horizontal overflow
from 320px up (sweep 320, 360, 390, 768, 1024), no request to `fonts.googleapis.com` or
`fonts.gstatic.com`, and the skip link as the first tab stop. Each such task names them again.

## Interpretations this plan fixes

The spec leaves these open or shows them only by example. They are decided here so no task has to
decide them mid-flight.

1. **Generator messages are English.** The spec's sample output is Spanish, but `CLAUDE.md` reserves
   Spanish for route paths and user-facing copy, and that output goes to a build log a developer
   reads. The CMS form messages — which the owner reads — stay Spanish.
2. **`order` lives on `Perfume`.** The generated file is the validated record verbatim, with no
   field surgery between validation and emission, so there is no step where a field can silently go
   missing. The app never reads `order`; the sort is already baked into the array.
3. **"The order declared in `content/lines/`" means `LINE_NAMES`.** The line set is closed
   (`'hombre' | 'mujer'`) and `catalog.schema.ts` exports it as an ordered constant. Lines sort by
   their index in it. A directory listing would order them by accident.
4. **The composed meta description has one implementation**, `metaDescriptionOf()` in
   `src/app/catalog/perfume-meta.ts`, imported by both `perfume-detail.ts` and `catalog.schema.ts`.
   The spec requires the validator to measure the same string the page emits; two copies of that
   template would drift. `perfume-meta.ts` is a leaf module with no Angular import, so the schema
   module still stays out of the bundle.
5. **The `photo` existence check reaches the validator as an injected predicate**
   (`CatalogRules.photoExists`), not as I/O inside it. The rule stays testable and pure; only
   `scripts/generate-catalog.ts` touches the disk.
6. **Existing `order` values are 10, 20, 30 … per line**, following today's array positions. New
   records default to 100, so they land after everything that exists without the owner touching the
   field.
7. **The maquette does not ship the panel.** `scripts/pages-preview.ts` deletes `admin/` from the
   GitHub Pages artefact. A writable editor for the real repository has no business on a showroom
   URL whose callback domain will never match.

## File structure

**Created:**

| Path                                                      | Responsibility                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/catalog/perfume-meta.ts`                         | The composed meta description, and its 160-character ceiling. One function, no I/O, no Angular.                                      |
| `src/app/catalog/catalog.schema.ts`                       | Every catalogue rule, as pure functions over parsed values. Returns issues and, when clean, typed records. Imported by no component. |
| `src/app/catalog/catalog.schema.spec.ts`                  | One case per rule, both directions.                                                                                                  |
| `src/app/pages/perfume-detail/perfume-detail.spec.ts`     | The `inStock` consequences: badge, CTA copy, JSON-LD `availability`.                                                                 |
| `scripts/generate-catalog.ts`                             | Reads `content/`, calls the validator, formats errors, emits the generated catalogue. Writes nothing when anything fails.            |
| `content/lines/*.yml`, `content/perfumes/<line>/*.yml`    | The catalogue. Versioned, Prettier-ignored, CMS-owned formatting.                                                                    |
| `public/admin/index.html`, `config.yml`, `sveltia-cms.js` | The panel. Third-party, isolated, exempt from the Arena and comment rules.                                                           |
| `docs/superpowers/decisions/*.md`                         | One record per open risk the spec declares.                                                                                          |

**Modified:** `src/app/catalog/perfume.model.ts`, `catalog.ts`, `CLAUDE.md`;
`src/app/shared/perfume-card/*`; `src/app/pages/perfume-detail/*`; `src/app/app.routes.ts`;
`src/app/app.routes.server.ts`; `scripts/generate-sitemap.ts`, `pages-preview.ts`, `CLAUDE.md`;
`package.json`; `.gitignore`; `.prettierignore`; `eslint.config.js`; `public/robots.txt`;
`README.md`.

**Deleted, and only at Task 9:** `src/app/catalog/perfumes.data.ts`, plus the two throwaways this
plan creates and removes inside their own tasks (`scripts/migrate-content.ts`,
`src/app/catalog/migration.spec.ts`).

## Phase order, and why it is this order

| Phase                             | Tasks | Needs                                                                                                      |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| 1 — the model and the shop window | 1–3   | Nothing. Pure repo work on today's data file.                                                              |
| 2 — the validator                 | 4–6   | Nothing. Pure functions, TDD, no I/O.                                                                      |
| 3 — `content/` and the generator  | 7–9   | Nothing. Ends with the old data file deleted and the catalogue proven identical.                           |
| 4 — the `/admin` panel            | 10–12 | A Chromium browser. Sveltia's local-repository workflow verifies the whole form without OAuth or a server. |
| 5 — domain, OAuth, Dokploy        | 13–16 | A purchased domain, a GitHub OAuth App and a running Dokploy. **Blocked, and deliberately last.**          |

Phases 1 to 4 are verifiable today against this repository. Phase 5 cannot start and must not block
anything before it.

---

# Phase 1 — the model and the shop window

Everything here runs against `perfumes.data.ts`, which is still the source. The two new fields are
added to the old file on purpose: it keeps every commit green, and it turns the migration check in
Task 8 into a plain deep equality with nothing stripped on either side.

### Task 1: `inStock` and `order` on the model and on today's data

**Files:**

- Modify: `src/app/catalog/perfume.model.ts:3-17`
- Modify: `src/app/catalog/perfumes.data.ts` (all twelve entries)
- Modify: `src/app/shared/perfume-card/perfume-card.spec.ts:6-21`
- Modify: `src/app/catalog/CLAUDE.md` (the `Shape` section)

**Interfaces:**

- Consumes: nothing.
- Produces: `Perfume` gains `readonly inStock: boolean` and `readonly order: number`. Every later
  task reads them by those names.

- [ ] **Step 1: Add the two fields to the model**

In `src/app/catalog/perfume.model.ts`, inside `interface Perfume`, after `readonly featured:
boolean;`:

```ts
  readonly featured: boolean;
  readonly inStock: boolean;
  readonly order: number;
  readonly photo?: string;
```

- [ ] **Step 2: Run the build and watch it fail**

Run: `bun run build`
Expected: FAIL. TypeScript reports twelve errors in `perfumes.data.ts`, one per entry, of the form
`Property 'inStock' is missing in type ... but required in type 'Perfume'`.

- [ ] **Step 3: Give every entry its two values**

In `src/app/catalog/perfumes.data.ts`, insert `inStock: true,` and `order: <n>,` between `featured`
and `photo` in each entry. `khamrah` becomes:

```ts
    featured: true,
    inStock: true,
    order: 10,
    photo: '/img/perfumes/9pm.webp',
```

The `order` values follow today's array positions, per line, and nothing else:

| line   | slug                       | order |
| ------ | -------------------------- | ----- |
| hombre | `khamrah`                  | 10    |
| hombre | `club-de-nuit-intense-man` | 20    |
| hombre | `asad`                     | 30    |
| hombre | `hawas-for-him`            | 40    |
| hombre | `9pm`                      | 50    |
| hombre | `l-aventure`               | 60    |
| mujer  | `yara`                     | 10    |
| mujer  | `hawas-for-her`            | 20    |
| mujer  | `club-de-nuit-woman`       | 30    |
| mujer  | `ameerati`                 | 40    |
| mujer  | `najdia`                   | 50    |
| mujer  | `blue-lady-2`              | 60    |

Every entry gets `inStock: true`: the catalogue is fully stocked today, and the migration must not
invent a change.

- [ ] **Step 4: Repair the card's test fixture**

In `src/app/shared/perfume-card/perfume-card.spec.ts`, in the `PERFUME` constant:

```ts
  featured: true,
  inStock: true,
  order: 100,
  photo: '/img/perfumes/yara.webp',
```

- [ ] **Step 5: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

Expected: all pass. `bun run test` still shows three `Catalog` cases and two `PerfumeCard` cases.

- [ ] **Step 6: Update the catalogue contract**

In `src/app/catalog/CLAUDE.md`, in the `Shape` section, extend the `Perfume` bullet so it reads:

```markdown
- `Perfume` is flat and entirely `readonly`. `featured` drives the landing grid; `line` + `slug` is
  the identity; `priceBob` is a number in bolivianos and is formatted at the call site as `Bs {n}`;
  `inStock` is a boolean and never a count, so `offers.availability` is true in the prerendered
  HTML; `order` is the presentation rank inside a line, ascending, ties broken by `name`.
```

- [ ] **Step 7: Commit**

```bash
git add src/app/catalog/perfume.model.ts src/app/catalog/perfumes.data.ts \
  src/app/catalog/CLAUDE.md src/app/shared/perfume-card/perfume-card.spec.ts
git commit -m "Add inStock and order to the perfume model"
```

Body: the stock is a boolean so `offers.availability` can be true in prerendered HTML rather than a
value that appears after hydration; `order` restores the presentation rank that one-file-per-record
is about to take away. Add the `Co-Authored-By` trailer.

---

### Task 2: the _Agotado_ badge on the card

**Files:**

- Modify: `src/app/shared/perfume-card/perfume-card.ts:6,11`
- Modify: `src/app/shared/perfume-card/perfume-card.html`
- Modify: `src/app/shared/perfume-card/perfume-card.css`
- Test: `src/app/shared/perfume-card/perfume-card.spec.ts`

**Interfaces:**

- Consumes: `Perfume.inStock` from Task 1.
- Produces: nothing other tasks import.

`ArenaBadge` is an Arena element, so **our class goes on the container around it**, never on
`<arena-badge>`. `tone="neutral"` is the spec's requirement: gold is distinction, not a warning, and
one primary accent per view still holds.

- [ ] **Step 1: Write the failing tests**

In `src/app/shared/perfume-card/perfume-card.spec.ts`, replace the `render` helper so it takes the
perfume, and add the two cases. The file becomes:

```ts
import { APP_BASE_HREF } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Perfume } from '../../catalog/perfume.model';
import { PerfumeCard } from './perfume-card';

const PERFUME: Perfume = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Oriental vainilla',
  notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
  sizeMl: 100,
  priceBob: 320,
  concentration: 'Eau de parfum',
  summary: 'Un oriental dulce.',
  description: 'Un oriental dulce de orquídea y vainilla.',
  featured: true,
  inStock: true,
  order: 100,
  photo: '/img/perfumes/yara.webp',
};

function render(baseHref: string, perfume: Perfume = PERFUME): ComponentFixture<PerfumeCard> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: APP_BASE_HREF, useValue: baseHref }],
  });

  const fixture = TestBed.createComponent(PerfumeCard);

  fixture.componentRef.setInput('perfume', perfume);
  fixture.detectChanges();

  return fixture;
}

function refs(fixture: ComponentFixture<PerfumeCard>): readonly (string | null)[] {
  const host: HTMLElement = fixture.nativeElement;

  return [
    host.querySelector('a')?.getAttribute('href') ?? null,
    host.querySelector('img')?.getAttribute('src') ?? null,
  ];
}

function badge(fixture: ComponentFixture<PerfumeCard>): string | null {
  const host: HTMLElement = fixture.nativeElement;

  return host.querySelector('arena-badge')?.textContent?.trim() ?? null;
}

describe('PerfumeCard', () => {
  it('addresses the route and the photo from the root when the base href is the root', () => {
    expect(refs(render('/'))).toEqual(['/perfumes/mujer/yara', '/img/perfumes/yara.webp']);
  });

  it('carries the base href into both when the site is served from a subpath', () => {
    expect(refs(render('/fragancia/'))).toEqual([
      '/fragancia/perfumes/mujer/yara',
      '/fragancia/img/perfumes/yara.webp',
    ]);
  });

  it('draws no badge while the perfume is in stock', () => {
    expect(badge(render('/'))).toBeNull();
  });

  it('marks a perfume that is out of stock', () => {
    expect(badge(render('/', { ...PERFUME, inStock: false }))).toBe('Agotado');
  });
});
```

- [ ] **Step 2: Run the tests and watch the new ones fail**

Run: `bun run test`
Expected: FAIL on `marks a perfume that is out of stock` — `expected null to be 'Agotado'`. The
three older cases pass.

- [ ] **Step 3: Import the badge**

In `src/app/shared/perfume-card/perfume-card.ts`:

```ts
import {
  ArenaBadge,
  ArenaCard,
  ArenaFallback,
  ArenaFigure,
  ArenaMedia,
} from '@dravensoft/arena-angular';
```

and in the decorator:

```ts
  imports: [ArenaCard, ArenaFigure, ArenaMedia, ArenaFallback, ArenaBadge],
```

- [ ] **Step 4: Draw it**

In `src/app/shared/perfume-card/perfume-card.html`, between the `family` paragraph and the price
row:

```
    <p class="perfume-card__family">{{ perfume().family }}</p>

    @if (!perfume().inStock) {
      <p class="perfume-card__stock">
        <arena-badge tone="neutral">Agotado</arena-badge>
      </p>
    }

    <p class="perfume-card__price arena-row arena-row--baseline">
```

(the price row and everything after it stay exactly as they are; the block above is inserted before
that line, at its indentation)

The badge is a child of the body's existing `.arena-stack .arena-stack--group`, so its air comes
from the stack and this template adds none.

- [ ] **Step 5: Kill the paragraph's default margin**

In `src/app/shared/perfume-card/perfume-card.css`, after the `.perfume-card__family` rule:

```css
.perfume-card__stock {
  margin: 0;
}
```

`.perfume-card__body` already centres its text, and the badge is inline, so it centres with it. No
value here is invented: the rule sets no colour, no size and no spacing.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `bun run test`
Expected: PASS, five cases in `PerfumeCard`.

- [ ] **Step 7: Run the ritual and look at it**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

Then `bun start`, temporarily flip one perfume in `perfumes.data.ts` to `inStock: false`, and check
by hand on `/perfumes/mujer`:

- the badge is neutral, not gold, and it is the only new mark on the card;
- the price rows of a grid of cards stay aligned;
- no horizontal overflow at 320, 360, 390, 768 and 1024;
- **restore the flag before committing** — `git diff src/app/catalog/perfumes.data.ts` must be empty.

- [ ] **Step 8: Commit**

```bash
git add src/app/shared/perfume-card
git commit -m "Mark a card whose perfume is out of stock"
```

Body: the badge is neutral because gold is distinction and not a warning, and the class sits on a
container we own rather than on the Arena element. Add the `Co-Authored-By` trailer.

---

### Task 3: the detail page tells the truth, to the reader and to the crawler

**Files:**

- Modify: `src/app/pages/perfume-detail/perfume-detail.ts:5-14,30-38,89-124`
- Modify: `src/app/pages/perfume-detail/perfume-detail.html:23-44`
- Modify: `src/app/pages/perfume-detail/perfume-detail.css`
- Test: `src/app/pages/perfume-detail/perfume-detail.spec.ts` (new)

**Interfaces:**

- Consumes: `Perfume.inStock`, `Catalog.bySlug`, `Catalog.lineProfile`.
- Produces: nothing other tasks import.

The JSON-LD is the point of the whole `inStock`-as-boolean decision, so it gets a test rather than a
look. The test provides a fake `Catalog`, which is also what lets it assert the out-of-stock branch
without touching the real catalogue.

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/perfume-detail/perfume-detail.spec.ts`:

```ts
import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideArenaMetadata } from '@dravensoft/arena-angular/metadata';
import { Catalog } from '../../catalog/catalog';
import { LineProfile, Perfume } from '../../catalog/perfume.model';
import { SITE_NAME, SITE_ORIGIN } from '../../seo/site';
import { PerfumeDetail } from './perfume-detail';

const PROFILE: LineProfile = {
  line: 'mujer',
  path: '/perfumes/mujer',
  label: 'Perfumes para mujer',
  descriptor: 'Femme',
  sloganLead: 'La elegancia',
  slogan: 'se lleva en la piel.',
  lede: 'La línea femenina de la casa.',
  metaDescription: 'Perfumes árabes para mujer en Cochabamba, eau de parfum original.',
  rosegold: true,
};

const PERFUME: Perfume = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Floral gourmand',
  notes: ['Orquídea', 'Vainilla'],
  sizeMl: 100,
  priceBob: 290,
  concentration: 'Eau de parfum',
  summary: 'Orquídea y vainilla, dulce y reconocible.',
  description: 'El femenino más vendido de la casa, dulce sin empalagar y de estela larga.',
  featured: true,
  inStock: true,
  order: 10,
  photo: '/img/perfumes/yara.webp',
};

function render(perfume: Perfume): ComponentFixture<PerfumeDetail> {
  const catalog: Partial<Catalog> = {
    lineProfile: () => PROFILE,
    bySlug: () => perfume,
  };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideArenaMetadata({ origin: SITE_ORIGIN, siteName: SITE_NAME }),
      { provide: APP_BASE_HREF, useValue: '/' },
      { provide: Catalog, useValue: catalog },
    ],
  });

  const fixture = TestBed.createComponent(PerfumeDetail);

  fixture.componentRef.setInput('line', perfume.line);
  fixture.componentRef.setInput('slug', perfume.slug);
  fixture.detectChanges();

  return fixture;
}

function schemaOf(fixture: ComponentFixture<PerfumeDetail>): string {
  fixture.detectChanges();

  const document = TestBed.inject(DOCUMENT);

  return document.head.querySelector('script[data-schema="product-yara"]')?.textContent ?? '';
}

function textOf(fixture: ComponentFixture<PerfumeDetail>): string {
  const host: HTMLElement = fixture.nativeElement;

  return host.textContent ?? '';
}

describe('PerfumeDetail', () => {
  it('offers a stocked perfume as available', () => {
    const fixture = render(PERFUME);

    expect(schemaOf(fixture)).toContain('https://schema.org/InStock');
    expect(textOf(fixture)).toContain('Consultar por Yara');
    expect(fixture.nativeElement.querySelector('arena-badge')).toBeNull();
  });

  it('says out of stock in the page and in the offer', () => {
    const fixture = render({ ...PERFUME, inStock: false });

    expect(schemaOf(fixture)).toContain('https://schema.org/OutOfStock');
    expect(schemaOf(fixture)).not.toContain('https://schema.org/InStock');
    expect(textOf(fixture)).toContain('Agotado');
    expect(textOf(fixture)).toContain('Consultar disponibilidad');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test`
Expected: FAIL on `says out of stock in the page and in the offer` — the schema still contains
`InStock` because `availability` is a constant.

- [ ] **Step 3: Make availability and the call to action follow the field**

In `src/app/pages/perfume-detail/perfume-detail.ts`, import the badge:

```ts
import {
  ArenaBadge,
  ArenaBreadcrumbs,
  ArenaCrumb,
  ArenaFallback,
  ArenaFigure,
  ArenaKeyValue,
  ArenaKeyValueRow,
  ArenaMedia,
  ArenaTag,
} from '@dravensoft/arena-angular';
```

add it to `imports`:

```ts
  imports: [
    ArenaBreadcrumbs,
    ArenaFigure,
    ArenaMedia,
    ArenaFallback,
    ArenaKeyValue,
    ArenaTag,
    ArenaBadge,
    StructuredData,
  ],
```

add the call-to-action copy next to the other computeds, after `total`:

```ts
  protected readonly cta = computed(() =>
    this.perfume().inStock ? `Consultar por ${this.perfume().name}` : 'Consultar disponibilidad',
  );
```

and in `productSchema`, replace the constant:

```ts
      availability: this.perfume().inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
```

- [ ] **Step 4: Draw the badge and use the copy**

In `src/app/pages/perfume-detail/perfume-detail.html`, after the summary paragraph:

```
      <p class="detail__summary">{{ perfume().summary }}</p>

      @if (!perfume().inStock) {
        <p class="detail__stock">
          <arena-badge tone="neutral">Agotado</arena-badge>
        </p>
      }
```

and in the call to action, replace the span:

```
        <span>{{ cta() }}</span>
```

- [ ] **Step 5: Kill that paragraph's default margin too**

In `src/app/pages/perfume-detail/perfume-detail.css`, after `.detail__summary`:

```css
.detail__stock {
  margin: 0;
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `bun run test`
Expected: PASS, two cases in `PerfumeDetail`.

- [ ] **Step 7: Run the ritual and read the rendered HTML**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
grep -o 'schema.org/InStock' dist/fragancia/browser/perfumes/mujer/yara/index.html
```

Expected: the `grep` prints one match — the availability is in the prerendered HTML, which is the
entire point. Then `bun start`, flip one perfume to `inStock: false` by hand, and check the detail
page: the badge is neutral, the button reads _Consultar disponibilidad_, no overflow at 320px, and
the breadcrumbs still render (they carry `ngSkipHydration`; if NG0500 appears, the attribute was
lost). **Restore the flag before committing.**

- [ ] **Step 8: Commit**

```bash
git add src/app/pages/perfume-detail
git commit -m "Let the offer and the call to action follow inStock"
```

Body: `availability` is now a fact in the prerendered HTML rather than a constant, which is why the
stock is a boolean at all; the new spec pins both branches with a fake catalogue. Add the
`Co-Authored-By` trailer.

---

# Phase 2 — the validator

Pure functions over parsed values. No file system, no Angular, no YAML: `catalog.schema.ts` receives
objects and returns issues. That is what lets Vitest test every rule directly, and what keeps the
module out of the bundle — nothing in `src/app` imports it.

### Task 4: one implementation of the composed meta description

**Files:**

- Create: `src/app/catalog/perfume-meta.ts`
- Create: `src/app/catalog/perfume-meta.spec.ts`
- Modify: `src/app/pages/perfume-detail/perfume-detail.ts:126-139`

**Interfaces:**

- Consumes: `Perfume` from Task 1.
- Produces:
  - `interface PerfumeMeta { readonly summary: string; readonly concentration: string; readonly sizeMl: number; readonly priceBob: number }`
  - `function metaDescriptionOf(perfume: PerfumeMeta): string`
  - `const META_DESCRIPTION_MAX = 160`
    Task 5 imports both the function and the constant.

The spec's rule is that the validator measures _the string the page emits_. Two copies of that
template would drift the first time someone edits one. `PerfumeMeta` is a structural subset of
`Perfume`, so the page passes a whole perfume and the validator passes four validated fields.

- [ ] **Step 1: Write the failing test**

Create `src/app/catalog/perfume-meta.spec.ts`:

```ts
import { META_DESCRIPTION_MAX, metaDescriptionOf } from './perfume-meta';

describe('metaDescriptionOf', () => {
  it('appends the concentration, the size and the price to the summary', () => {
    expect(
      metaDescriptionOf({
        summary: 'Orquídea y vainilla, dulce y reconocible.',
        concentration: 'Eau de parfum',
        sizeMl: 100,
        priceBob: 290,
      }),
    ).toBe(
      'Orquídea y vainilla, dulce y reconocible. Eau de parfum de 100 ml por Bs 290 en Cochabamba.',
    );
  });

  it('caps the description at what a search result shows', () => {
    expect(META_DESCRIPTION_MAX).toBe(160);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test`
Expected: FAIL — `Cannot find module './perfume-meta'`.

- [ ] **Step 3: Write the module**

Create `src/app/catalog/perfume-meta.ts`:

```ts
export const META_DESCRIPTION_MAX = 160;

export interface PerfumeMeta {
  readonly summary: string;
  readonly concentration: string;
  readonly sizeMl: number;
  readonly priceBob: number;
}

export function metaDescriptionOf(perfume: PerfumeMeta): string {
  return `${perfume.summary} ${perfume.concentration} de ${perfume.sizeMl} ml por Bs ${perfume.priceBob} en Cochabamba.`;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun run test`
Expected: PASS, two cases in `metaDescriptionOf`.

- [ ] **Step 5: Make the page read it**

In `src/app/pages/perfume-detail/perfume-detail.ts`, add the import:

```ts
import { metaDescriptionOf } from '../../catalog/perfume-meta';
```

and in the constructor's effect replace the inline template:

```ts
this.metadata.apply({
  title: `${perfume.brand} ${perfume.name}`,
  description: metaDescriptionOf(perfume),
  canonical: this.path(),
  image: perfume.photo ? `${SITE_ORIGIN}${perfume.photo}` : SITE_IMAGE,
  type: 'product',
  robots: 'index,follow',
});
```

- [ ] **Step 6: Prove the rendered description did not move**

```bash
bun run build
grep -o '<meta name="description" content="[^"]*"' \
  dist/fragancia/browser/perfumes/mujer/yara/index.html
```

Expected: `Orquídea y vainilla, dulce y reconocible. Eau de parfum de 100 ml por Bs 290 en
Cochabamba.` — byte for byte what the page emitted before this task.

- [ ] **Step 7: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

- [ ] **Step 8: Commit**

```bash
git add src/app/catalog/perfume-meta.ts src/app/catalog/perfume-meta.spec.ts \
  src/app/pages/perfume-detail/perfume-detail.ts
git commit -m "Give the composed meta description one implementation"
```

Body: the validator has to measure the same string the page emits, and the only way that stays true
is for both to call one function. Add the `Co-Authored-By` trailer.

---

### Task 5: the per-perfume rules

**Files:**

- Create: `src/app/catalog/catalog.schema.ts`
- Create: `src/app/catalog/catalog.schema.spec.ts`

**Interfaces:**

- Consumes: `Perfume`, `PerfumeLine` (Task 1), `metaDescriptionOf`, `META_DESCRIPTION_MAX` (Task 4).
- Produces, and Task 6 and Task 7 use these names exactly:
  - `const LINE_NAMES: readonly PerfumeLine[]`, `const CONCENTRATIONS: readonly string[]`,
    `const SLUG_PATTERN: RegExp`, `const PHOTO_PATTERN: RegExp`, `const PERFUME_KEYS: readonly string[]`
  - `interface CatalogIssue { readonly file: string; readonly message: string }`
  - `interface PerfumeCandidate { readonly file: string; readonly line: string; readonly slug: string; readonly value: unknown }`
  - `interface CatalogRules { readonly photoExists: (photo: string) => boolean }`
  - `interface PerfumeResult { readonly issues: readonly CatalogIssue[]; readonly perfume?: Perfume }`
  - `function validatePerfume(candidate: PerfumeCandidate, rules: CatalogRules): PerfumeResult`

- [ ] **Step 1: Write the failing tests**

Create `src/app/catalog/catalog.schema.spec.ts`:

```ts
import { CatalogRules, PerfumeCandidate, validatePerfume } from './catalog.schema';

const RULES: CatalogRules = { photoExists: (photo) => photo === '/img/perfumes/yara.webp' };

const VALID: Record<string, unknown> = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Floral gourmand',
  notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
  sizeMl: 100,
  priceBob: 290,
  concentration: 'Eau de parfum',
  summary: 'Orquídea y vainilla, dulce y reconocible.',
  description:
    'El femenino más vendido de la casa y el que más gente pregunta por su nombre en la calle.',
  featured: true,
  inStock: true,
  order: 10,
  photo: '/img/perfumes/yara.webp',
};

function candidate(
  overrides: Record<string, unknown> = {},
  patch: Partial<PerfumeCandidate> = {},
): PerfumeCandidate {
  return {
    file: 'content/perfumes/mujer/yara.yml',
    line: 'mujer',
    slug: 'yara',
    value: { ...VALID, ...overrides },
    ...patch,
  };
}

function reported(
  overrides: Record<string, unknown> = {},
  patch: Partial<PerfumeCandidate> = {},
): string {
  return validatePerfume(candidate(overrides, patch), RULES)
    .issues.map((issue) => issue.message)
    .join('\n');
}

function without(key: string): Record<string, unknown> {
  const value = { ...VALID };

  delete value[key];

  return value;
}

describe('validatePerfume', () => {
  it('returns the typed record and no issue for a valid file', () => {
    const result = validatePerfume(candidate(), RULES);

    expect(result.issues).toEqual([]);
    expect(result.perfume).toEqual({
      slug: 'yara',
      name: 'Yara',
      brand: 'Lattafa',
      line: 'mujer',
      family: 'Floral gourmand',
      notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
      sizeMl: 100,
      priceBob: 290,
      concentration: 'Eau de parfum',
      summary: 'Orquídea y vainilla, dulce y reconocible.',
      description:
        'El femenino más vendido de la casa y el que más gente pregunta por su nombre en la calle.',
      featured: true,
      inStock: true,
      order: 10,
      photo: '/img/perfumes/yara.webp',
    });
  });

  it('names the file on every issue it reports', () => {
    const result = validatePerfume(candidate({ brand: '' }), RULES);

    expect(result.issues[0].file).toBe('content/perfumes/mujer/yara.yml');
    expect(result.perfume).toBeUndefined();
  });

  it('refuses anything that is not a mapping', () => {
    expect(reported({}, { value: 'yara' })).toContain('file: expected a mapping of fields');
  });

  it('shouts at a misspelled key instead of ignoring it', () => {
    expect(reported({ precioBob: 320 })).toContain('precioBob: unknown field');
  });

  it('takes a slug of lowercase words joined by hyphens', () => {
    expect(reported({ slug: 'club-de-nuit-woman' }, { slug: 'club-de-nuit-woman' })).toBe('');
    expect(reported({ slug: 'Yara' })).toContain(
      'slug: expected lowercase words joined by hyphens, received "Yara"',
    );
  });

  it('requires the slug to match the file name', () => {
    expect(reported({ slug: 'najdia' })).toContain(
      'slug: "najdia" does not match the file name "yara"',
    );
  });

  it('takes a name of 1 to 60 characters', () => {
    expect(reported({ name: 'x'.repeat(60) })).toBe('');
    expect(reported({ name: 'x'.repeat(61) })).toContain('name: expected 1 to 60 characters');
    expect(reported({}, { value: without('name') })).toContain('name: expected 1 to 60 characters');
  });

  it('requires a brand', () => {
    expect(reported({ brand: '   ' })).toContain('brand: expected a non-empty string');
  });

  it('takes a line from the closed set', () => {
    expect(reported({ line: 'unisex' })).toContain(
      'line: expected one of hombre, mujer, received "unisex"',
    );
  });

  it('requires the line to match the directory', () => {
    expect(reported({ line: 'hombre' })).toContain(
      'line: "hombre" does not match the directory "mujer"',
    );
  });

  it('requires a family', () => {
    expect(reported({ family: '' })).toContain('family: expected a non-empty string');
  });

  it('takes between 1 and 8 non-empty notes', () => {
    expect(reported({ notes: ['Rosa'] })).toBe('');
    expect(reported({ notes: [] })).toContain('notes: expected between 1 and 8 non-empty strings');
    expect(reported({ notes: Array(9).fill('Rosa') })).toContain('notes: expected between 1 and 8');
    expect(reported({ notes: ['Rosa', ''] })).toContain('notes: expected between 1 and 8');
    expect(reported({ notes: 'Rosa' })).toContain('notes: expected between 1 and 8');
  });

  it('takes a size in millilitres as an integer from 1 to 1000', () => {
    expect(reported({ sizeMl: 1000 })).toBe('');
    expect(reported({ sizeMl: 0 })).toContain('sizeMl: expected an integer between 1 and 1000');
    expect(reported({ sizeMl: 100.5 })).toContain('sizeMl: expected an integer between 1 and 1000');
  });

  it('takes a price as an integer from 1 to 100000 and never as text', () => {
    expect(reported({ priceBob: '320 Bs' })).toContain(
      'priceBob: expected an integer between 1 and 100000, received "320 Bs"',
    );
    expect(reported({ priceBob: -1 })).toContain('priceBob: expected an integer between 1 and');
  });

  it('takes a concentration from the two the house sells', () => {
    expect(reported({ concentration: 'Eau de toilette' })).toBe('');
    expect(reported({ concentration: 'Parfum' })).toContain(
      'concentration: expected one of Eau de parfum, Eau de toilette, received "Parfum"',
    );
  });

  it('takes a summary of 30 to 110 characters', () => {
    expect(reported({ summary: 'x'.repeat(30) })).toBe('');
    expect(reported({ summary: 'x'.repeat(29) })).toContain(
      'summary: expected 30 to 110 characters, received 29 characters',
    );
    expect(reported({ summary: 'x'.repeat(111) })).toContain('summary: expected 30 to 110');
  });

  it('measures the composed meta description, not the summary alone', () => {
    expect(reported({ summary: 'x'.repeat(110) })).toBe('');
    expect(reported({ summary: 'x'.repeat(110), priceBob: 1000 })).toContain(
      'summary: the composed meta description is 161 characters, over the 160 allowed',
    );
  });

  it('takes a description of at least 80 characters', () => {
    expect(reported({ description: 'x'.repeat(80) })).toBe('');
    expect(reported({ description: 'Dulce.' })).toContain(
      'description: expected at least 80 characters, received 6 characters',
    );
  });

  it('takes featured and inStock as booleans and nothing else', () => {
    expect(reported({ featured: 'true' })).toContain('featured: expected true or false');
    expect(reported({}, { value: without('inStock') })).toContain(
      'inStock: expected true or false',
    );
  });

  it('takes an order from 0 to 999', () => {
    expect(reported({ order: 0 })).toBe('');
    expect(reported({ order: 1000 })).toContain('order: expected an integer between 0 and 999');
  });

  it('accepts a missing photo', () => {
    expect(reported({}, { value: without('photo') })).toBe('');
    expect(
      validatePerfume(candidate({}, { value: without('photo') }), RULES).perfume?.photo,
    ).toBeUndefined();
  });

  it('takes a photo path the templates can address', () => {
    expect(reported({ photo: 'img/yara.webp' })).toContain(
      'photo: expected a path such as /img/perfumes/name.webp, received "img/yara.webp"',
    );
  });

  it('refuses a photo that is not on disk', () => {
    expect(reported({ photo: '/img/perfumes/najdia.webp' })).toContain(
      'photo: /img/perfumes/najdia.webp does not exist',
    );
  });

  it('reports every broken rule at once', () => {
    const result = validatePerfume(candidate({ brand: '', family: '', order: -1 }), RULES);

    expect(result.issues).toHaveLength(3);
  });
});
```

The composed-meta case is measured, not guessed. The tail
` Eau de parfum de 100 ml por Bs 290 en Cochabamba.` is 50 characters, so a 110-character summary
composes to exactly 160 and passes. Raising the price to `1000` adds one character and composes to
161, which **no field rule catches** — `summary` is still 110, `priceBob` is still an integer in
range. That is the spec's point: the limit belongs on the composed string, not on `summary`.

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test`
Expected: FAIL — `Cannot find module './catalog.schema'`.

- [ ] **Step 3: Write the module**

Create `src/app/catalog/catalog.schema.ts`:

```ts
import { Perfume, PerfumeLine } from './perfume.model';
import { META_DESCRIPTION_MAX, metaDescriptionOf } from './perfume-meta';

export const LINE_NAMES: readonly PerfumeLine[] = ['hombre', 'mujer'];
export const CONCENTRATIONS: readonly string[] = ['Eau de parfum', 'Eau de toilette'];
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PHOTO_PATTERN = /^\/img\/perfumes\/[a-z0-9-]+\.(webp|jpg|png)$/;

export const PERFUME_KEYS: readonly string[] = [
  'slug',
  'name',
  'brand',
  'line',
  'family',
  'notes',
  'sizeMl',
  'priceBob',
  'concentration',
  'summary',
  'description',
  'featured',
  'inStock',
  'order',
  'photo',
];

export interface CatalogIssue {
  readonly file: string;
  readonly message: string;
}

export interface PerfumeCandidate {
  readonly file: string;
  readonly line: string;
  readonly slug: string;
  readonly value: unknown;
}

export interface CatalogRules {
  readonly photoExists: (photo: string) => boolean;
}

export interface PerfumeResult {
  readonly issues: readonly CatalogIssue[];
  readonly perfume?: Perfume;
}

export function validatePerfume(candidate: PerfumeCandidate, rules: CatalogRules): PerfumeResult {
  const value = asRecord(candidate.value);

  if (!value) {
    return { issues: [{ file: candidate.file, message: 'file: expected a mapping of fields' }] };
  }

  const messages: string[] = [];

  for (const key of Object.keys(value)) {
    if (!PERFUME_KEYS.includes(key)) {
      messages.push(`${key}: unknown field`);
    }
  }

  const slug = asText(value['slug']);

  if (slug === undefined || !SLUG_PATTERN.test(slug)) {
    messages.push(
      `slug: expected lowercase words joined by hyphens, received ${shown(value['slug'])}`,
    );
  } else if (slug !== candidate.slug) {
    messages.push(`slug: ${shown(slug)} does not match the file name ${shown(candidate.slug)}`);
  }

  const name = asText(value['name']);

  if (name === undefined || name.length > 60) {
    messages.push(`name: expected 1 to 60 characters, received ${sized(value['name'])}`);
  }

  const brand = asText(value['brand']);

  if (brand === undefined) {
    messages.push(`brand: expected a non-empty string, received ${shown(value['brand'])}`);
  }

  const line = asLine(value['line']);

  if (line === undefined) {
    messages.push(
      `line: expected one of ${LINE_NAMES.join(', ')}, received ${shown(value['line'])}`,
    );
  } else if (line !== candidate.line) {
    messages.push(`line: ${shown(line)} does not match the directory ${shown(candidate.line)}`);
  }

  const family = asText(value['family']);

  if (family === undefined) {
    messages.push(`family: expected a non-empty string, received ${shown(value['family'])}`);
  }

  const notes = asNotes(value['notes']);

  if (notes === undefined) {
    messages.push(
      `notes: expected between 1 and 8 non-empty strings, received ${shown(value['notes'])}`,
    );
  }

  const sizeMl = asInteger(value['sizeMl'], 1, 1000);

  if (sizeMl === undefined) {
    messages.push(
      `sizeMl: expected an integer between 1 and 1000, received ${shown(value['sizeMl'])}`,
    );
  }

  const priceBob = asInteger(value['priceBob'], 1, 100000);

  if (priceBob === undefined) {
    messages.push(
      `priceBob: expected an integer between 1 and 100000, received ${shown(value['priceBob'])}`,
    );
  }

  const concentration = asText(value['concentration']);

  if (concentration === undefined || !CONCENTRATIONS.includes(concentration)) {
    messages.push(
      `concentration: expected one of ${CONCENTRATIONS.join(', ')}, received ${shown(value['concentration'])}`,
    );
  }

  const summary = asText(value['summary']);

  if (summary === undefined || summary.length < 30 || summary.length > 110) {
    messages.push(`summary: expected 30 to 110 characters, received ${sized(value['summary'])}`);
  }

  const description = asText(value['description']);

  if (description === undefined || description.length < 80) {
    messages.push(
      `description: expected at least 80 characters, received ${sized(value['description'])}`,
    );
  }

  const featured = asBoolean(value['featured']);

  if (featured === undefined) {
    messages.push(`featured: expected true or false, received ${shown(value['featured'])}`);
  }

  const inStock = asBoolean(value['inStock']);

  if (inStock === undefined) {
    messages.push(`inStock: expected true or false, received ${shown(value['inStock'])}`);
  }

  const order = asInteger(value['order'], 0, 999);

  if (order === undefined) {
    messages.push(
      `order: expected an integer between 0 and 999, received ${shown(value['order'])}`,
    );
  }

  let photo: string | undefined;

  if (value['photo'] !== undefined) {
    const path = asText(value['photo']);

    if (path === undefined || !PHOTO_PATTERN.test(path)) {
      messages.push(
        `photo: expected a path such as /img/perfumes/name.webp, received ${shown(value['photo'])}`,
      );
    } else if (!rules.photoExists(path)) {
      messages.push(`photo: ${path} does not exist`);
    } else {
      photo = path;
    }
  }

  if (
    summary !== undefined &&
    concentration !== undefined &&
    sizeMl !== undefined &&
    priceBob !== undefined
  ) {
    const composed = metaDescriptionOf({ summary, concentration, sizeMl, priceBob });

    if (composed.length > META_DESCRIPTION_MAX) {
      messages.push(
        `summary: the composed meta description is ${composed.length} characters, over the ${META_DESCRIPTION_MAX} allowed`,
      );
    }
  }

  if (messages.length > 0) {
    return { issues: messages.map((message) => ({ file: candidate.file, message })) };
  }

  if (
    slug === undefined ||
    name === undefined ||
    brand === undefined ||
    line === undefined ||
    family === undefined ||
    notes === undefined ||
    sizeMl === undefined ||
    priceBob === undefined ||
    concentration === undefined ||
    summary === undefined ||
    description === undefined ||
    featured === undefined ||
    inStock === undefined ||
    order === undefined
  ) {
    return { issues: [{ file: candidate.file, message: 'file: incomplete record' }] };
  }

  const perfume: Perfume = {
    slug,
    name,
    brand,
    line,
    family,
    notes,
    sizeMl,
    priceBob,
    concentration,
    summary,
    description,
    featured,
    inStock,
    order,
    ...(photo === undefined ? {} : { photo }),
  };

  return { issues: [], perfume };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asInteger(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asLine(value: unknown): PerfumeLine | undefined {
  return LINE_NAMES.find((name) => name === value);
}

function asNotes(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    return undefined;
  }

  const notes: string[] = [];

  for (const item of value) {
    const note = asText(item);

    if (note === undefined) {
      return undefined;
    }

    notes.push(note);
  }

  return notes;
}

function shown(value: unknown): string {
  return value === undefined ? 'nothing' : JSON.stringify(value);
}

function sized(value: unknown): string {
  return typeof value === 'string' ? `${value.length} characters` : shown(value);
}
```

The last guard before the record is what lets it be built without a cast: TypeScript cannot know
that an empty `messages` implies every field parsed, so the guard says it in code. It is one branch,
and it is cheap.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `bun run test`
Expected: PASS, twenty-two cases in `validatePerfume`.

- [ ] **Step 5: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

`bun run build` must not grow: nothing imports `catalog.schema.ts`, so it stays out of the bundle.
Confirm with `grep -rl "validatePerfume" dist/fragancia/browser` — expected: no match.

- [ ] **Step 6: Commit**

```bash
git add src/app/catalog/catalog.schema.ts src/app/catalog/catalog.schema.spec.ts
git commit -m "State every per-perfume rule as a pure function"
```

Body: the rules live in `src/` so Vitest can test them one by one, they take the photo check as an
injected predicate so the module does no I/O, and an unknown key is an error rather than a field
that disappears in silence. Add the `Co-Authored-By` trailer.

---

### Task 6: the line rules, the rules between files, and the order

**Files:**

- Modify: `src/app/catalog/catalog.schema.ts` (append)
- Modify: `src/app/catalog/catalog.schema.spec.ts` (append)

**Interfaces:**

- Consumes: everything Task 5 produced.
- Produces, and Task 7 calls these by name:
  - `const LINE_KEYS: readonly string[]`
  - `interface LineCandidate { readonly file: string; readonly line: string; readonly value: unknown }`
  - `interface LineResult { readonly issues: readonly CatalogIssue[]; readonly profile?: LineProfile }`
  - `function validateLine(candidate: LineCandidate): LineResult`
  - `interface CatalogValidation { readonly issues: readonly CatalogIssue[]; readonly lines: readonly LineProfile[]; readonly perfumes: readonly Perfume[] }`
  - `function validateCatalog(lineCandidates: readonly LineCandidate[], perfumeCandidates: readonly PerfumeCandidate[], rules: CatalogRules): CatalogValidation`
  - `function sortLines(profiles: readonly LineProfile[]): readonly LineProfile[]`
  - `function sortPerfumes(perfumes: readonly Perfume[]): readonly Perfume[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/app/catalog/catalog.schema.spec.ts`, and extend the import at the top of the file to:

```ts
import {
  CatalogRules,
  LineCandidate,
  PerfumeCandidate,
  sortPerfumes,
  validateCatalog,
  validateLine,
  validatePerfume,
} from './catalog.schema';
import { Perfume } from './perfume.model';
```

```ts
const VALID_LINE: Record<string, unknown> = {
  line: 'mujer',
  path: '/perfumes/mujer',
  label: 'Perfumes para mujer',
  descriptor: 'Femme',
  sloganLead: 'La elegancia',
  slogan: 'se lleva en la piel.',
  lede: 'Floral, frutal y almizcle. La línea femenina de la casa.',
  metaDescription:
    'Perfumes árabes para mujer en Cochabamba: Lattafa, Rasasi y Armaf. Eau de parfum original.',
  rosegold: true,
};

function lineCandidate(
  overrides: Record<string, unknown> = {},
  patch: Partial<LineCandidate> = {},
): LineCandidate {
  return {
    file: 'content/lines/mujer.yml',
    line: 'mujer',
    value: { ...VALID_LINE, ...overrides },
    ...patch,
  };
}

function lineReported(
  overrides: Record<string, unknown> = {},
  patch: Partial<LineCandidate> = {},
): string {
  return validateLine(lineCandidate(overrides, patch))
    .issues.map((issue) => issue.message)
    .join('\n');
}

describe('validateLine', () => {
  it('returns the typed profile and no issue for a valid file', () => {
    const result = validateLine(lineCandidate());

    expect(result.issues).toEqual([]);
    expect(result.profile?.line).toBe('mujer');
    expect(result.profile?.rosegold).toBe(true);
  });

  it('shouts at a misspelled key', () => {
    expect(lineReported({ eslogan: 'x' })).toContain('eslogan: unknown field');
  });

  it('takes a line from the closed set and matching the file name', () => {
    expect(lineReported({ line: 'unisex' })).toContain('line: expected one of hombre, mujer');
    expect(lineReported({ line: 'hombre', path: '/perfumes/hombre' })).toContain(
      'line: "hombre" does not match the file name "mujer"',
    );
  });

  it('derives the path from the line', () => {
    expect(lineReported({ path: '/mujer' })).toContain(
      'path: expected "/perfumes/mujer", received "/mujer"',
    );
  });

  it('requires every piece of copy the page reads', () => {
    expect(lineReported({ label: '' })).toContain('label: expected a non-empty string');
    expect(lineReported({ descriptor: '' })).toContain('descriptor: expected a non-empty string');
    expect(lineReported({ sloganLead: '' })).toContain('sloganLead: expected a non-empty string');
    expect(lineReported({ slogan: '' })).toContain('slogan: expected a non-empty string');
    expect(lineReported({ lede: '' })).toContain('lede: expected a non-empty string');
  });

  it('takes a meta description of 50 to 160 characters', () => {
    expect(lineReported({ metaDescription: 'x'.repeat(50) })).toBe('');
    expect(lineReported({ metaDescription: 'x'.repeat(49) })).toContain(
      'metaDescription: expected 50 to 160 characters, received 49 characters',
    );
    expect(lineReported({ metaDescription: 'x'.repeat(161) })).toContain(
      'metaDescription: expected 50 to 160 characters',
    );
  });

  it('takes rosegold as a boolean', () => {
    expect(lineReported({ rosegold: 'sí' })).toContain('rosegold: expected true or false');
  });
});

describe('validateCatalog', () => {
  const RULES_ALL: CatalogRules = { photoExists: () => true };

  function perfumeIn(line: string, slug: string, overrides: Record<string, unknown> = {}) {
    return {
      file: `content/perfumes/${line}/${slug}.yml`,
      line,
      slug,
      value: { ...VALID, slug, line, ...overrides },
    };
  }

  function lineIn(line: string) {
    return {
      file: `content/lines/${line}.yml`,
      line,
      value: {
        ...VALID_LINE,
        line,
        path: `/perfumes/${line}`,
        rosegold: line === 'mujer',
      },
    };
  }

  const HEALTHY = {
    lines: [lineIn('hombre'), lineIn('mujer')],
    perfumes: [
      perfumeIn('hombre', 'khamrah', { featured: true, order: 10 }),
      perfumeIn('hombre', 'asad', { featured: false, order: 20 }),
      perfumeIn('mujer', 'yara', { featured: true, order: 10 }),
      perfumeIn('mujer', 'najdia', { featured: false, order: 20 }),
    ],
  };

  function messagesOf(validation: { issues: readonly { message: string }[] }): string {
    return validation.issues.map((issue) => issue.message).join('\n');
  }

  it('returns both typed lists when everything holds', () => {
    const result = validateCatalog(HEALTHY.lines, HEALTHY.perfumes, RULES_ALL);

    expect(result.issues).toEqual([]);
    expect(result.lines.map((profile) => profile.line)).toEqual(['hombre', 'mujer']);
    expect(result.perfumes.map((perfume) => perfume.slug)).toEqual([
      'khamrah',
      'asad',
      'yara',
      'najdia',
    ]);
  });

  it('returns no record at all when anything fails', () => {
    const result = validateCatalog(
      HEALTHY.lines,
      [...HEALTHY.perfumes, perfumeIn('mujer', 'yara')],
      RULES_ALL,
    );

    expect(result.perfumes).toEqual([]);
    expect(result.lines).toEqual([]);
  });

  it('refuses a slug repeated inside a line and names the first file', () => {
    const result = validateCatalog(
      HEALTHY.lines,
      [...HEALTHY.perfumes, perfumeIn('mujer', 'yara')],
      RULES_ALL,
    );

    expect(messagesOf(result)).toContain(
      'slug: "yara" is already used in content/perfumes/mujer/yara.yml',
    );
  });

  it('allows the same slug in two different lines', () => {
    const result = validateCatalog(
      HEALTHY.lines,
      [...HEALTHY.perfumes, perfumeIn('hombre', 'yara')],
      RULES_ALL,
    );

    expect(result.issues).toEqual([]);
  });

  it('refuses a line with no perfume', () => {
    const result = validateCatalog(
      HEALTHY.lines,
      HEALTHY.perfumes.filter((perfume) => perfume.line === 'mujer'),
      RULES_ALL,
    );

    expect(messagesOf(result)).toContain('line: no perfume belongs to this line');
  });

  it('refuses a perfume whose line has no profile', () => {
    const result = validateCatalog([lineIn('mujer')], HEALTHY.perfumes, RULES_ALL);

    expect(messagesOf(result)).toContain('line: "hombre" has no profile in content/lines');
  });

  it('keeps the featured count between 2 and 8', () => {
    const single = validateCatalog(
      HEALTHY.lines,
      HEALTHY.perfumes.map((perfume) => ({
        ...perfume,
        value: { ...perfume.value, featured: false },
      })),
      RULES_ALL,
    );

    expect(messagesOf(single)).toContain(
      'featured: expected between 2 and 8 featured perfumes, found 0',
    );
  });

  it('requires a featured perfume in every line', () => {
    const result = validateCatalog(
      HEALTHY.lines,
      HEALTHY.perfumes.map((perfume) =>
        perfume.line === 'hombre'
          ? { ...perfume, value: { ...perfume.value, featured: false } }
          : { ...perfume, value: { ...perfume.value, featured: true } },
      ),
      RULES_ALL,
    );

    expect(messagesOf(result)).toContain('featured: line "hombre" has no featured perfume');
  });
});

describe('sortPerfumes', () => {
  function perfume(line: 'hombre' | 'mujer', name: string, order: number): Perfume {
    return { ...(VALID as unknown as Perfume), line, name, slug: name.toLowerCase(), order };
  }

  it('orders by line, then by order, then by name', () => {
    const sorted = sortPerfumes([
      perfume('mujer', 'Yara', 20),
      perfume('hombre', 'Asad', 20),
      perfume('mujer', 'Ameerati', 20),
      perfume('hombre', 'Khamrah', 10),
    ]);

    expect(sorted.map((entry) => entry.name)).toEqual(['Khamrah', 'Asad', 'Ameerati', 'Yara']);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test`
Expected: FAIL — `validateLine`, `validateCatalog` and `sortPerfumes` are not exported.

- [ ] **Step 3: Append the line rules to the module**

In `src/app/catalog/catalog.schema.ts`, extend the model import and add, after `validatePerfume`:

```ts
import { LineProfile, Perfume, PerfumeLine } from './perfume.model';
```

```ts
export const LINE_KEYS: readonly string[] = [
  'line',
  'path',
  'label',
  'descriptor',
  'sloganLead',
  'slogan',
  'lede',
  'metaDescription',
  'rosegold',
];

export interface LineCandidate {
  readonly file: string;
  readonly line: string;
  readonly value: unknown;
}

export interface LineResult {
  readonly issues: readonly CatalogIssue[];
  readonly profile?: LineProfile;
}

export function validateLine(candidate: LineCandidate): LineResult {
  const value = asRecord(candidate.value);

  if (!value) {
    return { issues: [{ file: candidate.file, message: 'file: expected a mapping of fields' }] };
  }

  const messages: string[] = [];

  for (const key of Object.keys(value)) {
    if (!LINE_KEYS.includes(key)) {
      messages.push(`${key}: unknown field`);
    }
  }

  const line = asLine(value['line']);

  if (line === undefined) {
    messages.push(
      `line: expected one of ${LINE_NAMES.join(', ')}, received ${shown(value['line'])}`,
    );
  } else if (line !== candidate.line) {
    messages.push(`line: ${shown(line)} does not match the file name ${shown(candidate.line)}`);
  }

  const path = asText(value['path']);
  const expected = `/perfumes/${candidate.line}`;

  if (path !== expected) {
    messages.push(`path: expected ${shown(expected)}, received ${shown(value['path'])}`);
  }

  const copy: Record<string, string | undefined> = {};

  for (const key of ['label', 'descriptor', 'sloganLead', 'slogan', 'lede']) {
    copy[key] = asText(value[key]);

    if (copy[key] === undefined) {
      messages.push(`${key}: expected a non-empty string, received ${shown(value[key])}`);
    }
  }

  const metaDescription = asText(value['metaDescription']);

  if (
    metaDescription === undefined ||
    metaDescription.length < 50 ||
    metaDescription.length > META_DESCRIPTION_MAX
  ) {
    messages.push(
      `metaDescription: expected 50 to ${META_DESCRIPTION_MAX} characters, received ${sized(value['metaDescription'])}`,
    );
  }

  const rosegold = asBoolean(value['rosegold']);

  if (rosegold === undefined) {
    messages.push(`rosegold: expected true or false, received ${shown(value['rosegold'])}`);
  }

  if (messages.length > 0) {
    return { issues: messages.map((message) => ({ file: candidate.file, message })) };
  }

  const { label, descriptor, sloganLead, slogan, lede } = copy;

  if (
    line === undefined ||
    path === undefined ||
    label === undefined ||
    descriptor === undefined ||
    sloganLead === undefined ||
    slogan === undefined ||
    lede === undefined ||
    metaDescription === undefined ||
    rosegold === undefined
  ) {
    return { issues: [{ file: candidate.file, message: 'file: incomplete record' }] };
  }

  return {
    issues: [],
    profile: {
      line,
      path,
      label,
      descriptor,
      sloganLead,
      slogan,
      lede,
      metaDescription,
      rosegold,
    },
  };
}
```

- [ ] **Step 4: Append the rules between files and the order**

```ts
export interface CatalogValidation {
  readonly issues: readonly CatalogIssue[];
  readonly lines: readonly LineProfile[];
  readonly perfumes: readonly Perfume[];
}

export function validateCatalog(
  lineCandidates: readonly LineCandidate[],
  perfumeCandidates: readonly PerfumeCandidate[],
  rules: CatalogRules,
): CatalogValidation {
  const issues: CatalogIssue[] = [];
  const profiles: LineProfile[] = [];
  const perfumes: Perfume[] = [];
  const seen = new Map<string, string>();

  for (const candidate of lineCandidates) {
    const result = validateLine(candidate);

    issues.push(...result.issues);

    if (result.profile) {
      profiles.push(result.profile);
    }
  }

  for (const candidate of perfumeCandidates) {
    const result = validatePerfume(candidate, rules);

    issues.push(...result.issues);

    const perfume = result.perfume;

    if (perfume === undefined) {
      continue;
    }

    const key = `${perfume.line}/${perfume.slug}`;
    const first = seen.get(key);

    if (first !== undefined) {
      issues.push({
        file: candidate.file,
        message: `slug: ${shown(perfume.slug)} is already used in ${first}`,
      });
      continue;
    }

    seen.set(key, candidate.file);

    if (!profiles.some((profile) => profile.line === perfume.line)) {
      issues.push({
        file: candidate.file,
        message: `line: ${shown(perfume.line)} has no profile in content/lines`,
      });
    }

    perfumes.push(perfume);
  }

  for (const profile of profiles) {
    const inLine = perfumes.filter((perfume) => perfume.line === profile.line);

    if (inLine.length === 0) {
      issues.push({
        file: `content/lines/${profile.line}.yml`,
        message: 'line: no perfume belongs to this line',
      });
      continue;
    }

    if (!inLine.some((perfume) => perfume.featured)) {
      issues.push({
        file: 'catalog',
        message: `featured: line ${shown(profile.line)} has no featured perfume`,
      });
    }
  }

  const featured = perfumes.filter((perfume) => perfume.featured).length;

  if (featured < 2 || featured > 8) {
    issues.push({
      file: 'catalog',
      message: `featured: expected between 2 and 8 featured perfumes, found ${featured}`,
    });
  }

  if (issues.length > 0) {
    return { issues, lines: [], perfumes: [] };
  }

  return { issues, lines: sortLines(profiles), perfumes: sortPerfumes(perfumes) };
}

export function sortLines(profiles: readonly LineProfile[]): readonly LineProfile[] {
  return [...profiles].sort((a, b) => LINE_NAMES.indexOf(a.line) - LINE_NAMES.indexOf(b.line));
}

export function sortPerfumes(perfumes: readonly Perfume[]): readonly Perfume[] {
  return [...perfumes].sort(
    (a, b) =>
      LINE_NAMES.indexOf(a.line) - LINE_NAMES.indexOf(b.line) ||
      a.order - b.order ||
      a.name.localeCompare(b.name, 'es'),
  );
}
```

Lines sort by their index in `LINE_NAMES`, which is the closed set the type already declares. A
directory listing would put them in whatever order the file system answers.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `bun run test`
Expected: PASS. Twenty-two `validatePerfume` cases, eight `validateLine`, eight `validateCatalog`,
one `sortPerfumes`.

- [ ] **Step 6: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/catalog/catalog.schema.ts src/app/catalog/catalog.schema.spec.ts
git commit -m "Add the line rules, the rules between files and the order"
```

Body: the slug is unique inside its line and not across the catalogue, which is why the directory is
split by line; the presentation order is line, then `order`, then name, so adding a record cannot
reshuffle the grid. Add the `Co-Authored-By` trailer.

---

# Phase 3 — `content/` and the generator

This is the phase the fidelity requirement lives in. The catalogue moves file by file, and it does
not move on trust: the migration script re-reads every file it writes, the generated module is
compared to the old constant by a test, and the built site is compared to itself byte for byte
before the old file is deleted.

### Task 7: write `content/` from the current data, and prove the YAML reads back

**Files:**

- Create: `content/lines/hombre.yml`, `content/lines/mujer.yml`
- Create: `content/perfumes/hombre/*.yml` (six), `content/perfumes/mujer/*.yml` (six)
- Create then delete: `scripts/migrate-content.ts`
- Modify: `.prettierignore`

**Interfaces:**

- Consumes: `LINES` and `PERFUMES` from `perfumes.data.ts`, with the fields Task 1 added.
- Produces: `content/`, the source from here on.

The twelve records are not transcribed by hand. A throwaway script writes them from the constant and
parses each file back, so a dropped accent or a mangled apostrophe fails loudly instead of quietly.

- [ ] **Step 1: Write the throwaway migration script**

Create `scripts/migrate-content.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINES, PERFUMES } from '../src/app/catalog/perfumes.data';

const root = process.cwd();

function scalar(value: string | number | boolean): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function toYaml(record: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);

      for (const item of value) {
        lines.push(`  - ${scalar(item as string)}`);
      }
    } else if (value !== undefined) {
      lines.push(`${key}: ${scalar(value as string | number | boolean)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function write(path: string, record: Record<string, unknown>): void {
  writeFileSync(path, toYaml(record), 'utf8');

  const back = Bun.YAML.parse(readFileSync(path, 'utf8'));

  if (JSON.stringify(back) !== JSON.stringify(record)) {
    process.stderr.write(`migrate: ${path} does not read back as it was written\n`);
    process.exit(1);
  }
}

mkdirSync(join(root, 'content', 'lines'), { recursive: true });

for (const line of LINES) {
  mkdirSync(join(root, 'content', 'perfumes', line.line), { recursive: true });
  write(
    join(root, 'content', 'lines', `${line.line}.yml`),
    line as unknown as Record<string, unknown>,
  );
}

for (const perfume of PERFUMES) {
  write(
    join(root, 'content', 'perfumes', perfume.line, `${perfume.slug}.yml`),
    perfume as unknown as Record<string, unknown>,
  );
}

process.stdout.write(`migrate: ${LINES.length} lines, ${PERFUMES.length} perfumes\n`);
```

Every scalar is written double-quoted through `JSON.stringify`, which is also YAML's escaping, so an
apostrophe in `L'Aventure`, a colon inside a description and every accent survive without a special
case. `Bun.YAML.parse` is native in Bun 1.3.14 and adds no dependency.

- [ ] **Step 2: Run it**

Run: `bun run scripts/migrate-content.ts`
Expected: `migrate: 2 lines, 12 perfumes`, and no line about reading back.

- [ ] **Step 3: Check what landed**

```bash
find content -type f | sort
cat content/perfumes/hombre/l-aventure.yml
```

Expected: fourteen files, `content/lines/{hombre,mujer}.yml` and six perfumes under each of
`content/perfumes/hombre/` and `content/perfumes/mujer/`. `l-aventure.yml` reads:

```yaml
slug: 'l-aventure'
name: "L'Aventure"
brand: 'Al Haramain'
line: 'hombre'
family: 'Amaderado aromático'
notes:
  - 'Bergamota'
  - 'Canela'
  - 'Ámbar'
  - 'Vetiver'
  - 'Pachulí'
sizeMl: 100
priceBob: 300
concentration: 'Eau de parfum'
summary: 'Ámbar y vetiver, sobrio de principio a fin.'
description: 'La opción sobria de la línea. Sin salida dulce y sin estridencias: bergamota, ámbar y un vetiver terroso que aguanta la jornada. Para quien no quiere que su perfume entre antes que él.'
featured: false
inStock: true
order: 60
photo: '/img/perfumes/hawas-for-him.webp'
```

- [ ] **Step 4: Keep Prettier out of the content**

In `.prettierignore`, add after the `public/sitemap.xml` line:

```
content
```

The CMS decides the format of those files. Prettier rewriting them would put noise in the owner's
history on every save.

- [ ] **Step 5: Delete the throwaway**

```bash
rm scripts/migrate-content.ts
```

It imports the file Task 9 deletes, and `scripts/CLAUDE.md` describes the scripts that exist. It has
done its job; `content/` is the artefact.

- [ ] **Step 6: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

All five pass unchanged: nothing reads `content/` yet.

- [ ] **Step 7: Commit**

```bash
git add content .prettierignore
git status --short
git commit -m "Move the catalogue into content, one file per record"
```

`git status --short` must show no untracked `scripts/migrate-content.ts`. Body: one file per record
means one file per save, a readable diff and no two edits landing in the same file; the directory is
split by line because the slug is unique inside its line and not across the catalogue. Add the
`Co-Authored-By` trailer.

---

### Task 8: the generator, and the proof that it produces today's catalogue

**Files:**

- Create: `scripts/generate-catalog.ts`
- Create then delete (in Task 9): `src/app/catalog/migration.spec.ts`
- Modify: `package.json:8-10` (the `prepare:assets` chain, and a new `prelint`)
- Modify: `.gitignore`, `.prettierignore`, `eslint.config.js`

**Interfaces:**

- Consumes: `validateCatalog`, `CatalogIssue`, `LineCandidate`, `PerfumeCandidate` from Task 6.
- Produces: `src/app/catalog/perfumes.generated.ts`, exporting
  `export const LINES: readonly LineProfile[]` and `export const PERFUMES: readonly Perfume[]` —
  the same two names `perfumes.data.ts` exports today, so Task 9's cutover is an import path and
  nothing else.

- [ ] **Step 1: Write the generator**

Create `scripts/generate-catalog.ts`:

```ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CatalogIssue,
  LineCandidate,
  PerfumeCandidate,
  validateCatalog,
} from '../src/app/catalog/catalog.schema';
import { LineProfile, Perfume } from '../src/app/catalog/perfume.model';

const root = process.cwd();
const content = join(root, 'content');
const target = join(root, 'src', 'app', 'catalog', 'perfumes.generated.ts');

function yamlFiles(directory: string): string[] {
  return existsSync(directory)
    ? readdirSync(directory)
        .filter((entry) => entry.endsWith('.yml'))
        .sort()
    : [];
}

function parse(path: string): unknown {
  try {
    return Bun.YAML.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function format(issues: readonly CatalogIssue[]): string {
  const order: string[] = [];
  const grouped = new Map<string, string[]>();

  for (const issue of issues) {
    const messages = grouped.get(issue.file);

    if (messages) {
      messages.push(issue.message);
    } else {
      grouped.set(issue.file, [issue.message]);
      order.push(issue.file);
    }
  }

  const lines = order.flatMap((file) => [
    file,
    ...(grouped.get(file) ?? []).map((message) => `  ${message}`),
  ]);

  return `${lines.join('\n')}\ncatalog: ${issues.length} errors\n`;
}

function emit(lines: readonly LineProfile[], perfumes: readonly Perfume[]): string {
  return [
    "import { LineProfile, Perfume } from './perfume.model';",
    '',
    `export const LINES: readonly LineProfile[] = ${JSON.stringify(lines, null, 2)};`,
    '',
    `export const PERFUMES: readonly Perfume[] = ${JSON.stringify(perfumes, null, 2)};`,
    '',
  ].join('\n');
}

const lineCandidates: LineCandidate[] = yamlFiles(join(content, 'lines')).map((file) => ({
  file: `content/lines/${file}`,
  line: file.replace(/\.yml$/, ''),
  value: parse(join(content, 'lines', file)),
}));

const perfumesRoot = join(content, 'perfumes');

const perfumeCandidates: PerfumeCandidate[] = readdirSync(perfumesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .flatMap((line) =>
    yamlFiles(join(perfumesRoot, line)).map((file) => ({
      file: `content/perfumes/${line}/${file}`,
      line,
      slug: file.replace(/\.yml$/, ''),
      value: parse(join(perfumesRoot, line, file)),
    })),
  );

const validation = validateCatalog(lineCandidates, perfumeCandidates, {
  photoExists: (photo) => existsSync(join(root, 'public', photo)),
});

if (validation.issues.length > 0) {
  process.stderr.write(format(validation.issues));
  process.exit(1);
}

writeFileSync(target, emit(validation.lines, validation.perfumes), 'utf8');
process.stdout.write(
  `catalog: ${validation.lines.length} lines, ${validation.perfumes.length} perfumes\n`,
);
```

`writeFileSync` is the last statement and runs only past the exit, so a broken content file leaves
no half-written catalogue on disk. `JSON.stringify` is the serializer because JSON is valid
TypeScript for this shape and it escapes every string for free.

- [ ] **Step 2: Run it**

Run: `bun run scripts/generate-catalog.ts`
Expected: `catalog: 2 lines, 12 perfumes`, and `src/app/catalog/perfumes.generated.ts` exists.

- [ ] **Step 3: Watch it refuse a broken file**

```bash
cp content/perfumes/mujer/yara.yml /tmp/yara.yml
printf 'priceBob: "320 Bs"\nprecioBob: 320\n' >> content/perfumes/mujer/yara.yml
bun run scripts/generate-catalog.ts; echo "exit: $?"
```

Expected, on stderr:

```
content/perfumes/mujer/yara.yml
  precioBob: unknown field
  priceBob: expected an integer between 1 and 100000, received "320 Bs"
catalog: 2 errors
exit: 1
```

Then check nothing was written over: the generated file still holds the good catalogue.

```bash
cp /tmp/yara.yml content/perfumes/mujer/yara.yml && rm /tmp/yara.yml
git status --short content
```

Expected: no change under `content`.

- [ ] **Step 4: Put the generator first in the chain**

In `package.json`, replace the `prepare:assets` script and add `prelint`:

```json
    "prepare:assets": "bun run scripts/generate-catalog.ts && bun run scripts/generate-sitemap.ts && arena-to-prod --src src --src design",
    "prelint": "bun run prepare:assets",
```

The catalogue is generated before the sitemap because the sitemap will read it. `prelint` is new
because `bun run lint` was the one command that could meet a fresh clone with no generated file.

- [ ] **Step 5: Declare the new build product everywhere it has to be declared**

In `.gitignore`, under `# Arena build products`:

```
/src/app/catalog/perfumes.generated.ts
```

In `.prettierignore`, after `public/sitemap.xml`:

```
src/app/catalog/perfumes.generated.ts
```

In `eslint.config.js`, extend the ignores entry:

```js
    ignores: ['dist/**', 'src/*.generated.css', 'src/app/catalog/perfumes.generated.ts', 'public/sitemap.xml'],
```

- [ ] **Step 6: Write the failing equality test**

Create `src/app/catalog/migration.spec.ts`:

```ts
import { LINES as SOURCE_LINES, PERFUMES as SOURCE_PERFUMES } from './perfumes.data';
import { LINES, PERFUMES } from './perfumes.generated';

describe('the generated catalogue', () => {
  it('carries the same lines, in the same order', () => {
    expect(LINES).toEqual(SOURCE_LINES);
  });

  it('carries the same perfumes, in the same order', () => {
    expect(PERFUMES).toEqual(SOURCE_PERFUMES);
  });
});
```

`toEqual` over an array is order-sensitive, so this pins the presentation order as well as every
field of every record. It lives exactly as long as both sources do: Task 9 deletes it together with
`perfumes.data.ts`.

- [ ] **Step 7: Run it**

Run: `bun run test`
Expected: PASS, two cases in `the generated catalogue`. **If either fails, stop**: the migration is
not faithful and Task 9 must not start. Read the diff Vitest prints — it names the record and the
field.

- [ ] **Step 8: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
git status --short
```

`git status --short` must not offer `src/app/catalog/perfumes.generated.ts`: it is a build product.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-catalog.ts src/app/catalog/migration.spec.ts package.json \
  .gitignore .prettierignore eslint.config.js
git commit -m "Generate the typed catalogue from content, or fail the build"
```

Body: the generator accumulates every error and prints them grouped by file, writes nothing when
anything fails, and exits 1, so a bad save breaks the build before Angular starts and Dokploy keeps
serving the last good version. The equality test proves the generated catalogue is the one the site
has been serving. Add the `Co-Authored-By` trailer.

---

### Task 9: cut every reader over, delete the old file, amend the contracts

**Files:**

- Modify: `src/app/catalog/catalog.ts:2`
- Modify: `src/app/app.routes.ts:3`
- Modify: `src/app/app.routes.server.ts:2`
- Modify: `scripts/generate-sitemap.ts:3`
- Delete: `src/app/catalog/perfumes.data.ts`, `src/app/catalog/migration.spec.ts`
- Modify: `CLAUDE.md`, `scripts/CLAUDE.md`, `src/app/catalog/CLAUDE.md`, `README.md`

**Interfaces:**

- Consumes: `perfumes.generated.ts` from Task 8.
- Produces: a tree with exactly one catalogue source.

- [ ] **Step 1: Photograph the site as it stands**

```bash
bun run build
rm -rf /tmp/fragancia-before
cp -r dist/fragancia/browser /tmp/fragancia-before
cp public/sitemap.xml /tmp/sitemap-before.xml
```

This build still reads `perfumes.data.ts`. It is the reference the cutover has to reproduce.

- [ ] **Step 2: Repoint the four importers**

`src/app/catalog/catalog.ts`:

```ts
import { LINES, PERFUMES } from './perfumes.generated';
```

`src/app/app.routes.ts`:

```ts
import { LINES } from './catalog/perfumes.generated';
```

`src/app/app.routes.server.ts`:

```ts
import { PERFUMES } from './catalog/perfumes.generated';
```

`scripts/generate-sitemap.ts`:

```ts
import { LINES, PERFUMES } from '../src/app/catalog/perfumes.generated';
```

- [ ] **Step 3: Prove the equality test still passes on the new wiring**

Run: `bun run test`
Expected: PASS. `migration.spec.ts` is still comparing the two sources, and `catalog.spec.ts` is now
asserting over the generated catalogue.

- [ ] **Step 4: Rebuild and diff the whole artefact**

A raw `diff -r` over the two artefacts is **not** the gate, and it is worth knowing why before
running anything: two consecutive builds of an unchanged tree already differ. The prerender workers
run in parallel and hand out the `ng-state` hydration ids in completion order, so nine pages come
out with different id numbering on every run. The bundle names differ too, and legitimately — the
source module changed its name and its text, so its content hash changed.

What must not have changed is **what a visitor and a crawler see**: the same set of routes, and the
same markup on each, once those two known-variable things are normalised. Write the comparison to a
file and run it, rather than fighting nested heredocs:

```bash
bun run build
diff /tmp/sitemap-before.xml public/sitemap.xml && echo "SITEMAP IDENTICAL"
```

```python
import os, re, hashlib

def normalise(text):
    text = re.sub(r'<script id="ng-state".*?</script>', '', text, flags=re.S)
    return re.sub(r'(main|chunk)-[A-Za-z0-9_-]{8}\.js', r'\1-*.js', text)

def collect(root):
    out = {}
    for dirpath, _, files in os.walk(root):
        for name in files:
            if name.endswith('.html'):
                path = os.path.join(dirpath, name)
                page = normalise(open(path, encoding='utf8').read())
                out[os.path.relpath(path, root)] = hashlib.sha256(page.encode()).hexdigest()
    return out

before = collect('/tmp/fragancia-before')
after = collect('dist/fragancia/browser')

print('pages before:', len(before), ' after:', len(after))
print('same set of routes:', sorted(before) == sorted(after))
print('pages whose visible HTML differs:',
      [k for k in sorted(before) if before[k] != after.get(k)] or 'none')
```

Expected: `SITEMAP IDENTICAL`, eighteen pages on both sides, `same set of routes: True`, and
`pages whose visible HTML differs: none`. **If any page differs, stop and read it before going on.**
Together with the equality test from Task 8, that is the end-to-end statement that the migration
changed nothing anybody can see.

- [ ] **Step 5: Delete the old source and its equality test**

```bash
rm src/app/catalog/perfumes.data.ts src/app/catalog/migration.spec.ts
grep -rn "perfumes.data" --include=*.ts --include=*.md . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=docs
```

Expected from the `grep`: matches only in `src/app/catalog/CLAUDE.md` and `scripts/CLAUDE.md`, which
the next two steps rewrite. Anything under `src/` or `scripts/` is a reader that was missed.

- [ ] **Step 6: Amend `scripts/CLAUDE.md`**

The rule "No script writes a source file" is now false as written, and the directory has a fourth
script. Change the opening line to _Four Bun scripts_, add the section below before
`## generate-sitemap.ts`, and rewrite the first rule.

```markdown
## generate-catalog.ts

- **Emits** `src/app/catalog/perfumes.generated.ts`: `LINES` and `PERFUMES`, typed, validated and
  in presentation order, from the YAML under `content/`.
- **Runs first in `prepare:assets`**, so before `start`, `build`, `test` and `lint`, and ahead of
  `generate-sitemap.ts`, which imports what it writes.
- **Validates through `src/app/catalog/catalog.schema.ts`**, which is pure and is tested by
  `catalog.schema.spec.ts` rule by rule. The script owns the I/O and nothing else: it reads the
  files, injects `photoExists`, formats the errors and writes the output.
- **Accumulates every error, groups them by file, writes nothing at all when anything fails, and
  exits 1.** A bad content file breaks the build before Angular starts, so Dokploy keeps the
  previous container and the site stays up.
```

And the first rule becomes:

```markdown
- **A script writes a build product, never a source file.** `src/app/catalog/perfumes.generated.ts`
  is one, exactly as `src/*.generated.css` is one for `arena-to-prod`: it is in `.gitignore`, in
  `.prettierignore` and in the ESLint `ignores`, and it is rebuilt from `content/` on every
  lifecycle hook. Nothing here may edit a file a person wrote.
- They are plain Bun TypeScript, run as `bun run scripts/<name>.ts`, and use `node:fs` / `node:path`
  plus `Bun.YAML`, which is native in Bun 1.3.14. No Angular, no build tooling, no dependencies.
```

- [ ] **Step 7: Amend `src/app/catalog/CLAUDE.md`**

Replace the opening line and the two sections that describe the data file:

```markdown
# src/app/catalog — the data

Five files: the shapes (`perfume.model.ts`), the rules (`catalog.schema.ts`), the composed meta
description (`perfume-meta.ts`), the read-only accessor (`catalog.ts`), and the build product the
accessor reads (`perfumes.generated.ts`, never edited and never committed).
```

```markdown
## The source is `content/`, and the catalogue is a build product

- `PERFUMES` and `LINES` live in `perfumes.generated.ts`, which `scripts/generate-catalog.ts` writes
  from the YAML under `content/perfumes/<line>/` and `content/lines/`. **Edit the YAML, never the
  generated file**, and run `bun run prepare:assets`.
- They are still typed module constants, read at prerender time and baked into the HTML. There is no
  HTTP call, no store and no loading state, and none may be added: the site has no server at
  runtime.
- `catalog.schema.ts` states every rule as a pure function and is what `catalog.schema.spec.ts`
  tests. It is imported by the generator and by no component, so it never enters the bundle.
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
   `availability` into `OutOfStock`. **It stays listed, prerendered and in the sitemap**: a page
   that says "agotado" beats a 404 on a URL Google already knows.
5. `bun run build` — the route is prerendered from `getPrerenderParams` and the sitemap picks it up,
   both from the generated catalogue. Nothing else to register.
```

Then, in the `photo is optional on purpose` section, add:

```markdown
- The path is a rule: `^/img/perfumes/[a-z0-9-]+\.(webp|jpg|png)$`, **and the file must exist**. The
  CMS always uploads `.webp`; the other two are for shots added by hand.
```

- [ ] **Step 8: Amend the root `CLAUDE.md`**

In `## Commands`, in the `prepare:assets` list, add the new first product:

```markdown
- `src/app/catalog/perfumes.generated.ts`, from `scripts/generate-catalog.ts` reading `content/`;
```

and note that `prelint` runs it too:

```markdown
`prestart`, `prebuild`, `pretest` and `prelint` all run `prepare:assets`, which regenerates:
```

In `## Build products — never edit, never commit`, add:

```markdown
- `src/app/catalog/perfumes.generated.ts`
```

and extend the closing sentence to name `content/` as one of the sources to change instead.

- [ ] **Step 9: Say it in the README**

In `README.md`, under `## Rutas` and before `## SEO`, add a `## El catálogo` section in Spanish:
`content/` is the source, one YAML per record, split by line because the slug is unique inside its
line; `scripts/generate-catalog.ts` validates it and emits the typed catalogue; a broken file fails
the build on purpose, so the deployed site keeps serving the last good version; `inStock` is a
boolean so `availability` is true in the prerendered HTML.

- [ ] **Step 10: Run the ritual on a clean tree**

```bash
rm -f src/app/catalog/perfumes.generated.ts
bun run lint
bun run build
bun run test
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

Deleting the generated file first is the fresh-clone rehearsal: `prelint` must put it back, and
`bun run lint` must not be the command that discovers it missing.

- [ ] **Step 11: Commit**

```bash
git add -A
git status --short
git commit -m "Read the catalogue from content and drop the constant"
```

Body: `content/` is now the only source; the four readers import the generated module; the built
artefact is byte-for-byte the one the previous commit produced, which is what makes the migration
safe to finish. Name both contract amendments — a script may now write a `*.generated.*` build
product under `src/`, and `perfumes.data.ts` is gone. Add the `Co-Authored-By` trailer.

---

# Phase 4 — the `/admin` panel

Sveltia's local-repository workflow opens the real forms against the real files through the File
System Access API, with no OAuth, no proxy and no server. That is what makes this whole phase
verifiable today, and it is why it sits before anything that needs a domain.

`public/admin/` is a third-party application in an isolated directory. **The Arena rules and the
no-comment rule do not apply inside it**, by the spec. Nothing else in the tree gains that exemption.

### Task 10: vendor Sveltia and serve the panel from the build

**Files:**

- Create: `public/admin/index.html`, `public/admin/sveltia-cms.js`
- Modify: `public/robots.txt`
- Modify: `.prettierignore`
- Modify: `scripts/pages-preview.ts:11-21`, `scripts/CLAUDE.md`

**Interfaces:**

- Consumes: nothing.
- Produces: `/admin/` as a real directory in the build output, and its absence from the maquette.

- [ ] **Step 1: Vendor the CMS at a pinned version**

```bash
mkdir -p public/admin
curl -fsSL https://unpkg.com/@sveltia/cms@0.193.0/dist/sveltia-cms.mjs -o public/admin/sveltia-cms.js
sha256sum public/admin/sveltia-cms.js
ls -l public/admin/sveltia-cms.js
```

Keep the printed hash: Task 12's decision record states the version and the hash, and a future
upgrade is a deliberate commit that changes both. No CDN at runtime — the file is served from our
own origin like every other asset.

- [ ] **Step 2: Write the panel's page**

Create `public/admin/index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Fragancia · Administración</title>
    <link rel="icon" href="/favicon.svg" />
  </head>
  <body>
    <!-- Sveltia CMS 0.193.0, vendored. Third-party application, outside the project's rules. -->
    <script type="module" src="./sveltia-cms.js"></script>
  </body>
</html>
```

The script is addressed relatively so the panel also works under a base path. The copy is Spanish
because a person reads it.

- [ ] **Step 3: Keep it out of the index and out of Prettier**

`public/robots.txt` becomes:

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://fragancia.com.bo/sitemap.xml
```

In `.prettierignore`, add:

```
public/admin
```

The sitemap is generated from the catalogue, so `/admin` never enters it and nothing has to exclude
it there.

- [ ] **Step 4: Keep the panel out of the maquette**

In `scripts/pages-preview.ts`, after the `browser` constant and **before** `filesUnder` is called:

```ts
const browser = join(process.cwd(), 'dist', 'fragancia', 'browser');

rmSync(join(browser, 'admin'), { recursive: true, force: true });
```

A writable editor for the real repository has no business on a showroom URL, and its OAuth callback
domain would never match anyway. Then add a bullet to the `pages-preview.ts` section of
`scripts/CLAUDE.md`, beside the two jobs it already lists:

```markdown
- **drops `admin/` from the artefact.** The panel writes to the real repository through an OAuth
  callback registered for the real domain; on the maquette it could only fail, and it should not
  be offered at all.
```

- [ ] **Step 5: Build and check what landed**

```bash
bun run build
ls -l dist/fragancia/browser/admin/
grep -c 'Disallow: /admin/' dist/fragancia/browser/robots.txt
grep -c 'admin' dist/fragancia/browser/sitemap.xml || echo "not in the sitemap"
bun run scripts/pages-preview.ts /fragancia/
ls dist/fragancia/browser/admin 2>&1
```

Expected: `index.html` and `sveltia-cms.js` in the build (`angular.json` already copies `public/**`
except `*.md`, so no configuration changes); `1` for the robots line; `not in the sitemap`; and
after the preview rewrite, `No such file or directory` for the admin directory. Rebuild afterwards
so the working artefact is the real one: `bun run build`.

- [ ] **Step 6: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

`bunx prettier --check .` is the one to watch: without the `public/admin` ignore it fails on the
vendored bundle.

- [ ] **Step 7: Commit**

```bash
git add public/admin public/robots.txt .prettierignore scripts/pages-preview.ts scripts/CLAUDE.md
git commit -m "Vendor Sveltia CMS under public/admin"
```

Body: the bundle is vendored at a pinned version rather than loaded from a CDN, the panel is
`Disallow`ed and `noindex`, and the maquette drops it entirely. Add the `Co-Authored-By` trailer.

---

### Task 11: the form, and the first line of defence

**Files:**

- Create: `public/admin/config.yml`
- Modify: `README.md`

**Interfaces:**

- Consumes: the field names and ranges from Task 5 and Task 6. Every widget here mirrors a rule
  there; when one changes, both change.
- Produces: the owner's form.

Two collections, one per line, so `line` is derived from where the record is saved and is not a
field the owner can get wrong. Labels, hints and messages are Spanish, because the owner reads them.

- [ ] **Step 1: Write the configuration**

Create `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: dravensoft-dev/fragancia
  branch: main
  base_url: https://auth.fragancia.com.bo

site_url: https://fragancia.com.bo
media_folder: public/img/perfumes
public_folder: /img/perfumes

media_libraries:
  default:
    config:
      max_file_size: 5000000
      slugify_filename: true
      transformations:
        jpeg:
          format: webp
          quality: 82
          width: 1400
        png:
          format: webp
          quality: 82
          width: 1400
        webp:
          format: webp
          quality: 82
          width: 1400

collections:
  - name: perfumes_hombre
    label: Perfumes para hombre
    label_singular: Perfume para hombre
    folder: content/perfumes/hombre
    extension: yml
    format: yaml
    create: true
    delete: false
    slug: '{{fields.slug}}'
    summary: '{{name}} · {{brand}}'
    fields: &perfume_fields
      - name: slug
        label: Identificador en la URL
        widget: string
        required: true
        hint: Sólo minúsculas, números y guiones. Es la dirección de la ficha y no debería cambiar.
        pattern:
          - '^[a-z0-9]+(-[a-z0-9]+)*$'
          - Sólo minúsculas, números y guiones, sin espacios ni tildes
      - name: name
        label: Nombre
        widget: string
        required: true
        pattern:
          - '^.{1,60}$'
          - Entre 1 y 60 caracteres
      - name: brand
        label: Marca
        widget: string
        required: true
      - name: family
        label: Familia olfativa
        widget: string
        required: true
        hint: Por ejemplo, Oriental gourmand o Amaderado especiado.
      - name: notes
        label: Notas
        widget: list
        required: true
        min: 1
        max: 8
        field:
          name: note
          label: Nota
          widget: string
          required: true
      - name: sizeMl
        label: Contenido en ml
        widget: number
        value_type: int
        min: 1
        max: 1000
        required: true
      - name: priceBob
        label: Precio en bolivianos
        widget: number
        value_type: int
        min: 1
        max: 100000
        required: true
        hint: Sólo el número. El sitio escribe el Bs.
      - name: concentration
        label: Concentración
        widget: select
        required: true
        default: Eau de parfum
        options:
          - Eau de parfum
          - Eau de toilette
      - name: summary
        label: Resumen
        widget: string
        required: true
        hint: Una frase corta, entre 30 y 110 caracteres. Es lo que se ve en Google.
        pattern:
          - '^.{30,110}$'
          - Entre 30 y 110 caracteres
      - name: description
        label: Descripción
        widget: text
        required: true
        hint: Al menos 80 caracteres.
        pattern:
          - '[\s\S]{80,}'
          - Al menos 80 caracteres
      - name: featured
        label: Destacado en la portada
        widget: boolean
        default: false
        hint: Entre dos y ocho perfumes destacados, al menos uno por línea.
      - name: inStock
        label: Disponible
        widget: boolean
        default: true
        hint: Desactívalo cuando se agote. La ficha sigue publicada y se marca como agotada.
      - name: order
        label: Orden
        widget: number
        value_type: int
        min: 0
        max: 999
        default: 100
        required: true
        hint: Déjalo en 100. Un número menor lo adelanta dentro de su línea.
      - name: photo
        label: Foto
        widget: image
        required: false
        hint: Se convierte a webp automáticamente.
      - name: line
        label: Línea
        widget: hidden
        default: hombre

  - name: perfumes_mujer
    label: Perfumes para mujer
    label_singular: Perfume para mujer
    folder: content/perfumes/mujer
    extension: yml
    format: yaml
    create: true
    delete: false
    slug: '{{fields.slug}}'
    summary: '{{name}} · {{brand}}'
    fields:
      - name: slug
        label: Identificador en la URL
        widget: string
        required: true
        hint: Sólo minúsculas, números y guiones. Es la dirección de la ficha y no debería cambiar.
        pattern:
          - '^[a-z0-9]+(-[a-z0-9]+)*$'
          - Sólo minúsculas, números y guiones, sin espacios ni tildes
      - name: name
        label: Nombre
        widget: string
        required: true
        pattern:
          - '^.{1,60}$'
          - Entre 1 y 60 caracteres
      - name: brand
        label: Marca
        widget: string
        required: true
      - name: family
        label: Familia olfativa
        widget: string
        required: true
        hint: Por ejemplo, Floral gourmand o Chipre floral.
      - name: notes
        label: Notas
        widget: list
        required: true
        min: 1
        max: 8
        field:
          name: note
          label: Nota
          widget: string
          required: true
      - name: sizeMl
        label: Contenido en ml
        widget: number
        value_type: int
        min: 1
        max: 1000
        required: true
      - name: priceBob
        label: Precio en bolivianos
        widget: number
        value_type: int
        min: 1
        max: 100000
        required: true
        hint: Sólo el número. El sitio escribe el Bs.
      - name: concentration
        label: Concentración
        widget: select
        required: true
        default: Eau de parfum
        options:
          - Eau de parfum
          - Eau de toilette
      - name: summary
        label: Resumen
        widget: string
        required: true
        hint: Una frase corta, entre 30 y 110 caracteres. Es lo que se ve en Google.
        pattern:
          - '^.{30,110}$'
          - Entre 30 y 110 caracteres
      - name: description
        label: Descripción
        widget: text
        required: true
        hint: Al menos 80 caracteres.
        pattern:
          - '[\s\S]{80,}'
          - Al menos 80 caracteres
      - name: featured
        label: Destacado en la portada
        widget: boolean
        default: false
        hint: Entre dos y ocho perfumes destacados, al menos uno por línea.
      - name: inStock
        label: Disponible
        widget: boolean
        default: true
        hint: Desactívalo cuando se agote. La ficha sigue publicada y se marca como agotada.
      - name: order
        label: Orden
        widget: number
        value_type: int
        min: 0
        max: 999
        default: 100
        required: true
        hint: Déjalo en 100. Un número menor lo adelanta dentro de su línea.
      - name: photo
        label: Foto
        widget: image
        required: false
        hint: Se convierte a webp automáticamente.
      - name: line
        label: Línea
        widget: hidden
        default: mujer
```

Four things in there are load-bearing:

- **every regex is single-quoted.** YAML processes escapes inside double quotes, so `"[\s\S]{80,}"`
  is a parse error waiting to happen; `'[\s\S]{80,}'` is the literal pattern.
- **`line` is a `hidden` widget with the collection's own default**, so the field the directory
  already implies can never disagree with it.
- **`media_folder` / `public_folder` are the pair the templates expect.** The CMS writes
  `/img/perfumes/<name>.webp` into `photo`, which is exactly what `PHOTO_PATTERN` accepts and what
  `prepareExternalUrl` prefixes at render time.
- **no `publish_mode`.** The spec's decision is direct writes to `main`; an editorial workflow is
  ceremony for one user.

The `&perfume_fields` anchor is written but not referenced: YAML anchors are a file-level feature and
Sveltia reads the parsed result, so the second collection repeats its fields rather than aliasing
across a structure the CMS may re-serialize. Drop the anchor if it bothers the linter.

- [ ] **Step 2: Serve the panel the way production will**

```bash
bun run build
bun run serve:static
```

Open **Chrome, Edge or Brave** (the File System Access API is Chromium-only) at
`http://localhost:4173/admin/`.

- [ ] **Step 3: Open the local repository**

Choose _Work with Local Repository_ and pick the repository root. Expected: two collections in the
sidebar, _Perfumes para hombre_ with six entries and _Perfumes para mujer_ with six.

- [ ] **Step 4: Read an existing record**

Open _Yara_. Expected: every label in Spanish, `notes` as five removable rows, `Disponible` on,
`Destacado en la portada` on, `Orden` 100 — no, **10**, the value Task 1 assigned — and **no `Línea`
field visible**. Close without saving.

- [ ] **Step 5: Create one, with a photo, and watch the whole chain**

In _Perfumes para mujer_, create a record: slug `prueba`, name `Prueba`, brand `Lattafa`, family
`Floral frutal`, one note, 100 ml, 100 Bs, _Eau de parfum_, a summary of about 40 characters, a
description of about 120, `Disponible` on, `Orden` 100, and **upload a JPEG larger than 1 MB** as the
photo. Save. Then, in the terminal:

```bash
cat content/perfumes/mujer/prueba.yml
ls -l public/img/perfumes/prueba.webp
bun run scripts/generate-catalog.ts
bun run build
ls dist/fragancia/browser/perfumes/mujer/prueba/index.html
grep -c 'perfumes/mujer/prueba' public/sitemap.xml
```

Expected: the YAML carries `line: mujer` although no field asked for it; the JPEG arrived as a
**webp** named `prueba.webp` (the transformation and `slugify_filename` both ran, in the owner's
browser, before the write); the generator accepts it; the route is prerendered; the sitemap has it.
That chain is the whole product working without a server.

- [ ] **Step 6: Try to break it from the form**

Still in the panel, attempt each of these and confirm the form refuses to save:

- empty `Marca`;
- slug `Prueba Dos` (uppercase and a space);
- `Precio en bolivianos` typed as `320 Bs`;
- a summary of 10 characters;
- removing the only note.

Note anything the form lets through: it is not a blocker, because the generator catches it, but it
belongs in Task 12's record as a form gap.

- [ ] **Step 7: Note what the panel offers about deletion**

Look at the record's menu. Write down whether a _Delete_ action is offered despite `delete: false`.
That observation is the evidence Task 12 decides on.

- [ ] **Step 8: Clean up the rehearsal**

```bash
rm -f content/perfumes/mujer/prueba.yml public/img/perfumes/prueba.webp
git status --short
bun run scripts/generate-catalog.ts
```

Expected: `git status --short` shows only `public/admin/config.yml` as new, and the generator prints
`catalog: 2 lines, 12 perfumes` again.

- [ ] **Step 9: Say it in the README**

In `README.md`, after the `## El catálogo` section Task 9 added, add `## El panel`: `/admin` is
Sveltia CMS vendored under `public/admin/`, two collections so the line is never typed, the form
carries the same limits as the validator, photos are converted to webp in the browser before
upload, saving writes a commit to `main` as the owner and Dokploy rebuilds. Say plainly that there
is no staging, and that undoing a bad edit is reverting a commit.

- [ ] **Step 10: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

- [ ] **Step 11: Commit**

```bash
git add public/admin/config.yml README.md
git commit -m "Configure the panel as two collections, one per line"
```

Body: one collection per line makes `line` a value the owner cannot mistype, the widgets restate the
validator's limits so the form refuses what the build would refuse later, and the media settings
convert photos to webp in the owner's browser so a 5 MB JPEG never reaches the repository. Add the
`Co-Authored-By` trailer.

---

### Task 12: decide what happens about deleting records (open risk 3)

**Files:**

- Create: `docs/superpowers/decisions/2026-08-18-record-deletion.md`
- Possibly modify: `public/admin/config.yml`, `README.md`

**Interfaces:**

- Consumes: the observation from Task 11 Step 7.
- Produces: a decision, and whatever follows from it.

The spec declares this open: _if Sveltia does not allow deletion to be disabled, decide whether to
accept the risk or document it as a rule of use_. It is a decision, not a fact, and this task takes
it rather than assuming it.

- [ ] **Step 1: Establish what the vendored version actually does**

```bash
grep -n "delete" public/admin/sveltia-cms.js | head -40
```

and re-check the panel with `delete: false` set on both collections: is the action absent, present
and disabled, or present and working? Test it on the throwaway `prueba` record rather than on a real
one — recreate it if Task 11 already cleaned it up.

- [ ] **Step 2: Write the decision record**

Create `docs/superpowers/decisions/2026-08-18-record-deletion.md` with, in order:

1. **The question**, in one sentence.
2. **What was observed**, with the vendored version (`0.193.0`), its sha256 from Task 10, and the
   exact behaviour of the _Delete_ action under `delete: false`.
3. **The decision**, one of:
   - _honoured_ — `delete: false` removes the action; nothing more to do, and the record says so;
   - _not honoured, risk accepted_ — the action stays, and the mitigation is the one the spec
     already relies on: every save and every delete is a commit by the owner, so a deletion is
     reverted with `git revert`. The record names that as the recovery procedure;
   - _not honoured, mitigated_ — the deletion is prevented some other way (a branch protection rule,
     a narrower collaborator permission), described exactly.
4. **What the owner is told**, in Spanish, one sentence: retirar un perfume es marcarlo como no
   disponible, nunca borrarlo.

- [ ] **Step 3: Make the tree agree with the decision**

If the decision is _risk accepted_, leave `delete: false` in place anyway — it costs nothing and it
documents intent — and add the owner-facing sentence to the `## El panel` section of `README.md`.
If the decision is _mitigated_, apply the mitigation and describe it in the same place.

- [ ] **Step 4: Run the ritual**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/decisions public/admin/config.yml README.md
git commit -m "Decide how deleting a record is handled in the panel"
```

Body: state the observed behaviour and the decision, and that retiring a perfume is `inStock: false`
because a page that says _agotado_ beats a 404 on an indexed URL. Add the `Co-Authored-By` trailer.

---

# Phase 5 — domain, OAuth and Dokploy

**None of this can be verified today.** The domain is not bought, the OAuth App is not registered
and the server does not exist. Everything before this phase is finished, tested and deployable
without it; nothing here may be started early "to save time", because an unverifiable step that
looks done is worse than one that is plainly pending.

Each task names what blocks it. Two of them are decisions the spec left open, and they are taken
here with evidence, not assumed.

### Task 13: choose and review the OAuth client (open risk 1)

**Blocked on:** nothing technical — this can be decided as soon as Phase 4 is done, and it should
be, because it is the riskiest open item. It cannot be _deployed_ until Task 15.

**Files:**

- Create: `docs/superpowers/decisions/2026-08-18-oauth-client.md`
- Modify: `public/admin/config.yml` (the `backend` block)

**Interfaces:**

- Consumes: the vendored bundle from Task 10.
- Produces: the `backend` configuration Task 15 deploys against.

The spec is explicit that this is unchosen and that whatever is chosen custodies a secret, so it
gets reviewed before it is used. Three candidates, and the first one may remove the problem
entirely.

- [ ] **Step 1: Find out whether the vendored version can do without a secret at all**

```bash
grep -o 'DEFAULT_PKCE_AUTH_ROOT[^,]*' public/admin/sveltia-cms.js
grep -o 'login/oauth/authorize' public/admin/sveltia-cms.js | head -1
```

Sveltia 0.193.0 ships both a server-side OAuth flow and a PKCE flow for the GitHub backend. **If the
PKCE flow works for a GitHub OAuth App configured with `app_id` and no `base_url`, there is no proxy
to deploy, no second Dokploy application and no secret to custody**, and the risk closes by
deletion rather than by review. Confirm it against the vendored code and against GitHub's current
support for PKCE on the app type being registered — not against a blog post, and not against this
plan.

- [ ] **Step 2: Price the other two**

- **`sveltia-cms-auth`, the project's own client, on Cloudflare Workers.** Not a container, so it
  does not sit in Dokploy, but it is the client the CMS is written against and it is free at this
  volume. The secret lives in a Workers secret.
- **A Decap-compatible OAuth proxy as a container in Dokploy**, as the spec's architecture drawing
  assumes. Requires picking an image and reviewing it.

- [ ] **Step 3: Review whatever is chosen, if it is a container**

A container that holds the GitHub client secret is reviewed before it runs, not after:

- pin it by **digest**, never by `latest`;
- read the source of the exact tag: it must do the code-for-token exchange and nothing else — no
  database, no user store, no analytics, no outbound call other than to GitHub;
- confirm it takes the client ID, the secret and the allowed origin as **environment variables**,
  and that it refuses an origin that is not the site's;
- check when it was last updated and whether the repository is one person's abandoned weekend.

Record the digest and what was read.

- [ ] **Step 4: Write the decision record**

Create `docs/superpowers/decisions/2026-08-18-oauth-client.md`: the question, the three candidates,
what was verified about each, the decision, and the consequence for the architecture — in
particular, **whether `fragancia-auth` exists at all**, because if PKCE works, Task 15 deploys one
application instead of two.

- [ ] **Step 5: Make `config.yml` say the decision**

Either keep

```yaml
backend:
  name: github
  repo: dravensoft-dev/fragancia
  branch: main
  base_url: https://auth.fragancia.com.bo
```

or replace `base_url` with the PKCE form the vendored version documents (`app_id`, no secret, no
`base_url`). Do not leave both.

- [ ] **Step 6: Run the ritual and commit**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
git add docs/superpowers/decisions public/admin/config.yml
git commit -m "Choose the OAuth client for the panel"
```

Body: name the decision and why, and say plainly what the chosen thing custodies. Add the
`Co-Authored-By` trailer.

---

### Task 14: the domain, in one commit

**Blocked on:** the domain being bought.

**Files:**

- Modify: `src/app/seo/site.ts:1`
- Modify: `public/robots.txt`
- Modify: `public/admin/config.yml` (`site_url`, and `base_url` if it survived Task 13)
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**

- Consumes: nothing.
- Produces: one origin, everywhere.

`SITE_ORIGIN` already reads `https://fragancia.com.bo` and the whole tree assumes that root. **If the
domain bought is that one, this task is a no-op except for its checks — run them anyway.** If it is
another, everything below moves together or the canonical, the `og:*` pair, the sitemap, the JSON-LD
and the OAuth callback disagree.

- [ ] **Step 1: Find every place the origin is written**

```bash
grep -rn "fragancia.com.bo" --include=*.ts --include=*.txt --include=*.yml --include=*.md . \
  --exclude-dir=node_modules --exclude-dir=dist
```

Expected: `src/app/seo/site.ts`, `public/robots.txt`, `public/admin/config.yml`, `README.md`,
`CLAUDE.md`, and the spec and plan under `docs/` (which are history and stay as written).

- [ ] **Step 2: Change them together**

`SITE_ORIGIN` first — `SITE_IMAGE`, `provideArenaMetadata`, every JSON-LD `url` and the sitemap all
derive from it — then the hardcoded sitemap URL in `robots.txt`, then `site_url` and `base_url` in
`config.yml`.

- [ ] **Step 3: Register the OAuth App with the same strings**

Homepage: the site root. Authorization callback: `https://auth.<domain>/callback`, or whatever the
client chosen in Task 13 requires. The owner's GitHub account is a collaborator with write
permission on `dravensoft-dev/fragancia`; revoking access later is removing them from
collaborators, and nothing else.

- [ ] **Step 4: Prove the whole artefact agrees**

```bash
bun run build
grep -ro 'https://[a-z.]*fragancia[a-z.]*' dist/fragancia/browser/index.html | sort -u
grep -c '<loc>https://' dist/fragancia/browser/sitemap.xml
grep -o 'canonical" href="[^"]*"' dist/fragancia/browser/perfumes/mujer/yara/index.html
```

Expected: one origin in the output of the first command, fifteen `<loc>` entries in the sitemap
(landing, two lines, twelve perfumes), and a canonical that is **not** doubled — if it reads
`https://…https://…`, an absolute URL was passed to `ArenaMetadataService.apply()` where a path
belongs.

- [ ] **Step 5: Run the ritual and commit**

```bash
bun run build
bun run test
bun run lint
bunx prettier --check .
bunx arena-to-prod --src src --src design --audit
git add -A
git commit -m "Point the site at its domain"
```

Body: `SITE_ORIGIN` is the single source and everything else follows from it, except the three
places that hardcode it — `robots.txt`, the panel's configuration and the OAuth App — which is why
they move in the same commit. Add the `Co-Authored-By` trailer.

---

### Task 15: Dokploy, and the static server that must not be an SPA server (open risk 2)

**Blocked on:** the server existing, Dokploy installed, and Task 14 merged.

**Files:**

- Create: `docs/superpowers/decisions/2026-08-18-static-serving.md`
- Modify: `README.md` (the `## Despliegue` section)

**Interfaces:**

- Consumes: `bun run build` producing `dist/fragancia/browser`, and Task 13's decision about whether
  a second application exists.
- Produces: the deployed site.

The spec names the concrete danger: **an SPA fallback that swallows `/admin/` or `404.html`**. This
site is prerendered and every route has its own `index.html`; a server that rewrites everything to
the root `index.html` breaks the not-found page, may shadow the panel, and turns every unknown URL
into a 200 that Google will index.

- [ ] **Step 1: Create the site application**

In Dokploy: application `fragancia`, source GitHub `dravensoft-dev/fragancia`, branch `main`,
autodeploy on push. Build: `bun install && bun run build`. Serve `dist/fragancia/browser` as static
at the root domain, with TLS.

- [ ] **Step 2: Create the auth application, if Task 13 said there is one**

Application `fragancia-auth` at `auth.<domain>`, with the client ID, the client secret and the
allowed origin as environment variables. The secret exists **only** here: not in the repository, not
in `config.yml`, not in the panel's bundle.

- [ ] **Step 3: Settle the static behaviour, and record it**

Ask the deployed server the questions the spec is worried about:

```bash
curl -sI https://<domain>/ | head -1
curl -sI https://<domain>/perfumes/mujer/yara/ | head -1
curl -s  https://<domain>/perfumes/mujer/yara/ | grep -c 'schema.org/InStock'
curl -sI https://<domain>/admin/ | head -1
curl -s  https://<domain>/admin/ | grep -c 'sveltia-cms.js'
curl -sI https://<domain>/sitemap.xml | head -1
curl -sI https://<domain>/robots.txt | head -1
curl -sI https://<domain>/no-existe | head -1
curl -s  https://<domain>/no-existe | grep -c 'Página no encontrada'
```

Expected: `200` for the root, the detail route, the panel, the sitemap and robots; **one** match for
the prerendered availability, so what arrives is the real page and not a shell; **one** match for the
panel's script; `404` for the unknown path, with the not-found copy in the body. A `200` on
`/no-existe` is the SPA fallback, and it is a defect to fix in the server configuration, not to
accept.

If the platform's static server cannot be told to stop falling back, the fallback is a small nginx
container serving the same directory with `try_files $uri $uri/index.html =404` and
`error_page 404 /404.html`. Take that decision here and write it into
`docs/superpowers/decisions/2026-08-18-static-serving.md`, with the curl output as the evidence.

- [ ] **Step 4: Turn on the notifications**

Dokploy notifications to the developer on failed builds. The owner cannot tell a failed build from a
slow one; the validator's whole promise — the site keeps serving the last good version — depends on
somebody being told that a save did not land.

- [ ] **Step 5: Prove the loop closes**

Change `content/perfumes/mujer/najdia.yml` to `inStock: false`, commit, push. Wait for the deploy,
then:

```bash
curl -s https://<domain>/perfumes/mujer/najdia/ | grep -c 'schema.org/OutOfStock'
curl -s https://<domain>/perfumes/mujer/najdia/ | grep -c 'Agotado'
```

Expected: one and one. Then push a deliberately broken file — `priceBob: "320 Bs"` — and confirm two
things: the build fails, and **the site keeps serving the previous version**. Restore it afterwards.

- [ ] **Step 6: Update the README and commit**

Rewrite `## Despliegue` in `README.md` for what now exists: Dokploy, autodeploy from `main`, the
static serving rule and why (no SPA fallback), the second application if there is one, and the
notifications. Keep the GitHub Pages section: the maquette does not go away.

```bash
git add README.md docs/superpowers/decisions
git commit -m "Record how the static site is served and what it must not do"
```

Add the `Co-Authored-By` trailer.

---

### Task 16: hand the panel over

**Blocked on:** Task 15 being green.

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: everything.
- Produces: an owner who can work without a developer.

- [ ] **Step 1: The owner's first save, watched**

With the owner: `/admin/`, _Iniciar sesión con GitHub_, authorize once, edit a real perfume's price,
save. Confirm the commit is **in their name**, the deploy runs, and the change is live in a minute
or two. They never see a branch, a commit or a merge.

- [ ] **Step 2: The owner's first new record, watched**

A new perfume with a photo taken on their phone. Confirm the photo arrives as webp, the route
exists, and the sitemap grew — all without anybody touching the repository.

- [ ] **Step 3: The drill nobody wants to run cold**

- Break something on purpose from the form, if the form allows it, and show what a failed build
  looks like and who gets told.
- Revert a commit from the history and show the site coming back. That is the whole undo story, and
  the owner should have seen it once.
- Remove the owner from the repository's collaborators, confirm the panel can no longer save, and
  add them back. Revocation is a checkbox, and it should be a checkbox somebody has already
  clicked once.

- [ ] **Step 4: Write the last section of the README**

`## Para el dueño`, in Spanish, short: entrar a `/admin/`, editar, guardar, esperar un minuto.
Marcar agotado en vez de borrar. Las fotos se convierten solas. Si algo no aparece, avisar — el
sitio anterior sigue en pie mientras tanto.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Document the panel for the person who uses it"
```

Add the `Co-Authored-By` trailer.

---

## What this plan does not do

Named so nobody discovers them as surprises:

- **No prices, no numeric stock, no cart, no orders, no second user, no roles.** The spec puts all
  of it out of scope, and `inStock` as a boolean is what keeps the site fully static.
- **No editing of line copy beyond the fields `LineProfile` already has**, and no `content/lines/`
  collection in the CMS: the two line files are edited by a developer, and the validator guards
  them.
- **No i18n and no translations.**
- **No staging environment.** The panel writes to `main` and `main` is what deploys. The recovery is
  `git revert`, and Task 16 rehearses it.
- **No automated test of `public/admin/config.yml` against `catalog.schema.ts`.** They mirror each
  other by hand, and Task 11's rehearsal is what catches a drift. If the form and the validator
  disagree later, the build still refuses the bad record — the form is the first line of defence,
  not the only one.
