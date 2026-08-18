# src/app/seo — head, constants, structured data

Two files: `site.ts` (the constants) and `structured-data.ts` (the JSON-LD writer).

## site.ts is the single source

- **`SITE_ORIGIN` is the one line to change when the domain changes.** It reaches
  `provideArenaMetadata`, every JSON-LD `url` and `@id`, `SITE_IMAGE`, and the sitemap generator.
- Contact details live here too — `CONTACT_PHONE`, `CONTACT_PHONE_E164`, `CONTACT_WHATSAPP_URL`,
  `CONTACT_INSTAGRAM_URL`, `CONTACT_CITY`, `CONTACT_COUNTRY` — and are imported by the header, the
  footer and the landing. **Never re-type a phone number or a URL in a template.**
- `public/robots.txt` hardcodes the sitemap URL. Changing `SITE_ORIGIN` means editing that file too.

## robots defaults to noindex

`ArenaMetadataService` treats a route as `noindex` until it says otherwise. This project sets
`robots: 'index,follow'` as the application-wide default in `app.config.ts`, and a route still
outranks it — `/404` and `**` carry `noindex,follow` explicitly. **A new private route needs no
opt-out, but a new public route inherits `index,follow` and must be checked**, because the default
was moved.

## Which schema goes on which route

| Route                      | Schema                                                  | Written by                     |
| -------------------------- | ------------------------------------------------------- | ------------------------------ |
| `/`                        | `WebSite` and `Store` (with a `makesOffer` per perfume) | `pages/home`                   |
| `/perfumes/{hombre,mujer}` | `ItemList`                                              | `pages/line`                   |
| `/perfumes/{line}/{slug}`  | `Product` with an `Offer`                               | `pages/perfume-detail`         |
| every route with crumbs    | `BreadcrumbList`                                        | `ArenaBreadcrumbs`, on its own |

Do not hand-write a `BreadcrumbList`; Arena already emits it.

## StructuredData

- `<app-structured-data key="…" [schema]="…" />` writes a `<script type="application/ld+json">`
  into `document.head`, tagged `data-schema="{key}"`.
- **The key is what keeps a re-render from duplicating it**: the effect looks the element up by that
  attribute and reuses it, and `DestroyRef` removes it on teardown. A key that varies with the
  record — `'product-' + slug`, `'line-' + line` — is what makes a client-side navigation between
  two detail pages replace the script instead of stacking two.
- The host is `display: none` and the template is empty; it renders nothing where it sits, so put it
  at the top of the page template.
- `serialize()` escapes every `<` to `\u003c` so no payload can close the script tag. Keep that.
- **`ArenaMetadataService.apply()` prefixes `SITE_ORIGIN` onto `canonical`** — pass a path, never an
  absolute URL. JSON-LD is the opposite: every `url` there is absolute and built with `SITE_ORIGIN`.
