# scripts — build-lifecycle scripts

Two Bun scripts. Both run from `package.json` hooks; neither is invoked by hand in normal work.

## generate-sitemap.ts

- **Emits** `public/sitemap.xml`: the landing, both line pages, and one entry per perfume, with
  `lastmod` set to the day of the run.
- **Runs** in `prepare:assets`, so before `start`, `build` and `test`, ahead of `arena-to-prod`.
- **Reads** `LINES` and `PERFUMES` from `src/app/catalog/perfumes.data.ts` and `SITE_ORIGIN` from
  `src/app/seo/site.ts` — the same constants the app renders from, imported directly. A perfume in
  the data is a URL in the sitemap; there is no second list to keep in step.
- `public/robots.txt` points at the sitemap with a hardcoded origin and is **not** generated. Edit
  it when `SITE_ORIGIN` changes.

## emit-404.ts

- **Emits** `dist/fragancia/browser/404.html`, copied from the prerendered
  `dist/fragancia/browser/404/index.html`.
- **Runs** in `postbuild`, after the prerender has produced that route.
- It exists because a static host serves its not-found page from `404.html` at the root, while
  Angular prerenders the `/404` route into a directory. It exits 1 if the route was not
  prerendered, which is the signal that the `404` entry left `app.routes.ts`.

## Rules

- **Neither script writes a source file.** `public/sitemap.xml` is an asset the build copies into
  `dist`, and it is in `.gitignore` and `.prettierignore` like the rest of the build products;
  `404.html` is written straight into the build output. Nothing here may edit anything under
  `src/`.
- They are plain Bun TypeScript, run as `bun run scripts/<name>.ts`, and use only `node:fs` /
  `node:path`. No Angular, no build tooling, no dependencies.
- Same code rules as the rest of the tree: English, and no comments.
