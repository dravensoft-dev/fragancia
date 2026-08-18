# src/app/layout — the shell

`site-header/` and `site-footer/`, the two components `App` places around the router outlet.

## The shell

- `app-root` carries `arena-shell arena-stack arena-stack--section` on its host. **The section step
  is what separates header, content and footer** — without it both gaps are zero and the air under
  the header comes only from the hero's own padding.
- The routed content sits inside `<div class="arena-shell__main">` so it takes the slack and the
  footer never floats halfway up a short page.
- `<arena-skip-link>` is first in `app.html` and must stay the first tab stop. `<arena-main>` is the
  landmark it points at.
- Both components here set `host: { style: 'display: contents' }`, so the shell's stack reaches the
  app bar and the footer directly rather than stopping at our wrapper element.

## App bar slots

`<arena-app-bar>` takes three projected slots, each gated on a directive that **must be in this
component's own `imports`** or the slot renders nothing, silently:

| Attribute | Directive      | What we put there                                                                  |
| --------- | -------------- | ---------------------------------------------------------------------------------- |
| `brand`   | `ArenaBrand`   | an `<a routerLink="/">` wrapping `<arena-app-logo>` with `<app-brand-mark mark />` |
| `nav`     | `ArenaNav`     | the sections nav, an `.arena-row` of plain anchors                                 |
| `actions` | `ArenaActions` | the WhatsApp link                                                                  |

`<arena-app-logo>` takes the mark through its own `mark` slot. The footer uses the same logo and
mark pair at `size="md"`.

The nav anchors are ours, so they are styled here: `routerLinkActive="is-current"` for the current
section, and everything reads a token.

## The one media query in the project

`site-header.css` carries `@media (width < 30rem)`, and it is the only width query in the tree:

- It hides `.site-actions__label` and squares the WhatsApp control to `--dz-ctl-h` in both axes, so
  the touch target stays the size of any Arena control. The header drops from 202px to 133px on a
  390px phone.
- **Why a query and not `arenaViewportBelow`**: `--bp-*` does not resolve during prerender, so the
  signal returns the wide branch server-side and the phone is served the desktop header until
  hydration. Show/hide is a discrete decision at first paint, which is exactly the case the signal
  cannot serve.
- **Why a literal `30rem`**: a media query cannot read a `var()`, so it restates `--bp-sm`. If Arena
  moves that breakpoint, this number has to follow.
- The accessible name does not depend on what is visible — it lives in the anchor's `aria-label` —
  so a screen reader announces the same thing at both widths. Keep it that way.

Do not add a second media query without the same kind of justification. Everything else about width
is the layout's job: `.arena-row` wrapping, `flex: 1 1 var(--grid-min)`, and `clamp()` in the style
plugin.
