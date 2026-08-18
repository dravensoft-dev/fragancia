# src/app/pages — the routed components

`home/`, `line/`, `perfume-detail/`, `not-found/`. All four are lazy-loaded from
`src/app/app.routes.ts` and all four are prerendered.

## Every routed component needs `display: contents`

```ts
host: { style: 'display: contents' },
```

Angular inserts our component's element between `<router-outlet>` and our content, so without this
the shell's stack gap reaches that one element and stops. With it, the page's own sections are
children of the shell again.

`router-outlet { display: none }` in `src/styles.css` is the mirror rule: the outlet draws nothing
but is still a flex item, and without it every page is pushed down by one whole gap.

## The page container is ours

Each page opens with a container we own, and that is where the layout classes go:

```
<div class="arena-band arena-stack arena-stack--section">
```

`.arena-band` centres at `--container-max` with the gutter; the stack sets the step between
sections. Never put either class on an Arena element.

## The femme palette

- `.arena-femme` goes on **a container we own, on the `mujer` routes only**, driven by
  `profile().rosegold` from the catalogue:
  `[class.arena-femme]="profile().rosegold"`.
- It must never reach the header or the footer — the identity manual's rule is one piece, one metal.
  That is why it sits on the page's band and not on `<html>` or `app-root`.
- On the landing, the same class is on the Femme door only, inside the two-lines section.

## The heading ladder

Arena components default to a rung, and the outline must have no gaps. What each page renders:

| Page             | h1                                      | h2                          | h3                                          |
| ---------------- | --------------------------------------- | --------------------------- | ------------------------------------------- |
| `home`           | `<arena-hero>` (default)                | `<arena-section>` (default) | perfume card name, in `shared/perfume-card` |
| `line`           | `<arena-page-head headingLevel="h1">`   | `<arena-section>`           | card name; `<arena-empty-state>` default    |
| `perfume-detail` | `.detail__name`, ours                   | —                           | —                                           |
| `not-found`      | `<arena-empty-state headingLevel="h1">` | —                           | —                                           |

Two overrides, both deliberate: `arena-page-head` defaults to `h2` and is promoted because a line
page has no hero above it; `arena-empty-state` defaults to `h3` and is promoted on `not-found`
because nothing else on that page is a title. **Do not promote the empty state on `line`** — there
it sits inside a section that already names the region.

The footer's column headings are `h2`, so a page must not leave an `h2` rung unused above them.

## Notes

- Arena anchors report their own activation, so a card or crumb is routed from the component's event
  handler (`goTo`, `open`). Never wrap an Arena component in `routerLink`.
- `line` and `perfume-detail` read their route params as signal inputs
  (`withComponentInputBinding()`); `line` also arrives as a route `data` key. A missing record
  throws rather than rendering empty — a bad slug is a build failure, not a state.
- `perfume-detail` is the one page whose metadata describes a record, so it calls
  `ArenaMetadataService.apply()` in an effect. Everything else is `arenaRouteMeta` on the route.
