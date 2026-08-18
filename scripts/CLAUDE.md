# scripts — build-lifecycle scripts

Four Bun scripts. Three run from `package.json` hooks; the fourth runs only from the Pages
workflow. None is invoked by hand in normal work.

## generate-catalog.ts

- **Emits** `src/app/catalog/perfumes.generated.ts`: `LINES` and `PERFUMES`, typed, validated and in
  presentation order, from the YAML under `content/`.
- **Runs first in `prepare:assets`**, so before `start`, `build`, `test` and `lint`, and ahead of
  `generate-sitemap.ts`, which imports what it writes.
- **Validates through `src/app/catalog/catalog.schema.ts`**, which is pure and is tested by
  `catalog.schema.spec.ts` rule by rule. The script owns the I/O and nothing else: it reads the
  files, injects `photoExists`, formats the errors and writes the output.
- **Accumulates every error, groups them by file, writes nothing at all when anything fails, and
  exits 1.** A bad content file breaks the build before Angular starts, so the deploy never replaces
  a working container and the site keeps serving the last good version.

## generate-sitemap.ts

- **Emits** `public/sitemap.xml`: the landing, both line pages, and one entry per perfume, with
  `lastmod` set to the day of the run.
- **Runs** in `prepare:assets`, so before `start`, `build` and `test`, ahead of `arena-to-prod`.
- **Reads** `LINES` and `PERFUMES` from `src/app/catalog/perfumes.generated.ts` and `SITE_ORIGIN`
  from `src/app/seo/site.ts` — the same constants the app renders from, imported directly. A perfume
  in `content/` is a URL in the sitemap; there is no second list to keep in step.
- `public/robots.txt` points at the sitemap with a hardcoded origin and is **not** generated. Edit
  it when `SITE_ORIGIN` changes.

## emit-404.ts

- **Emits** `dist/fragancia/browser/404.html`, copied from the prerendered
  `dist/fragancia/browser/404/index.html`.
- **Runs** in `postbuild`, after the prerender has produced that route.
- It exists because a static host serves its not-found page from `404.html` at the root, while
  Angular prerenders the `/404` route into a directory. It exits 1 if the route was not
  prerendered, which is the signal that the `404` entry left `app.routes.ts`.

## pages-preview.ts

- **Rewrites** the built artefact under `dist/fragancia/browser` so it can be shown from
  `dravensoft-dev.github.io/fragancia/`, and nothing else.
- **Runs** only in `.github/workflows/pages.yml`, after `build`, as
  `bun run scripts/pages-preview.ts /fragancia/`. It takes the base path as its one argument and
  refuses anything that does not start and end with a slash.
- It does two jobs:
  - **rebases the stylesheets.** Every other absolute path in the output already carries the base
    href, because `ng build --base-href` puts it there. A `@font-face` `url()` cannot: CSS resolves
    it against the stylesheet, not against `<base>`, so the four font URLs are rewritten here. This
    is the only path in the tree that `--base-href` does not reach.
  - **puts the SEO to sleep.** Every `robots` meta becomes `noindex,nofollow`, `robots.txt` becomes
    `Disallow: /`, and `sitemap.xml` is dropped from the artefact. GitHub Pages is the maquette, not
    the site; the real one is `fragancia.com.bo` and it is the one that gets indexed.
- **It does not touch the canonical, the `og:*` pair or the JSON-LD.** Removing nodes from
  prerendered HTML is what NG0500 is made of, and `noindex` plus `Disallow` already say everything
  a crawler needs. The cost is that a shared link to the maquette previews without an image,
  because `og:image` points at the real domain.

## Rules

- **A script writes a build product, never a source file.** `src/app/catalog/perfumes.generated.ts`
  is one, exactly as `src/*.generated.css` is one for `arena-to-prod`: it is in `.gitignore`, in
  `.prettierignore` and in the ESLint `ignores`, and it is rebuilt from `content/` on every
  lifecycle hook. `public/sitemap.xml` is another; `404.html` and everything `pages-preview.ts`
  rewrites are written straight into the build output. Nothing here may edit a file a person wrote.
- They are plain Bun TypeScript, run as `bun run scripts/<name>.ts`, and use `node:fs` / `node:path`
  plus `Bun.YAML`, which is native in Bun 1.3.14. No Angular, no build tooling, no dependencies.
- Same code rules as the rest of the tree: English, and no comments.
