# src/app/shared — reusable pieces

`brand-mark/` and `perfume-card/`. Both set `host: { style: 'display: contents' }` so the parent's
rhythm reaches through them.

## BrandMark is inline SVG, and that is the point

- The mark is written as inline SVG in the component template, not as a file in `public/` behind an
  `<img>`, because **two things have to reach inside it**:
  - `stroke="currentColor"` and `fill="currentColor"`, so the mark takes the colour of whatever
    context it sits in — gold in the header, rose gold under `.arena-femme`, `--color-primary`
    everywhere;
  - `style="font-family: var(--ff-heading)"` on the `F`, so the display face is the real one and not
    a path traced from it.
- An external asset gets neither. Do not "optimise" this into an `<img>` or a sprite.
- It is `aria-hidden="true"` with `focusable="false"`: the accessible name always comes from the
  element around it (`<arena-app-logo name>`, or an `aria-label` on the link).
- It sizes from the outside — the caller sets `width` on the host, from `--logo-mark-lg` /
  `--logo-mark-xl`. The SVG is `width: 100%`.
- This is the one inline SVG the project allows; icons are Phosphor class strings.

## PerfumeCard adds no air

- `<arena-card>` already brings its own `--pad-surface` and its own gap between the figure and the
  body. **The card must not add spacing on top of it** — it did once, and the doubled step is what
  the rhythm rules exist to prevent. The body carries `.arena-stack .arena-stack--group` and nothing
  else about separation.
- `[figure]`, `[media]` and `[fallback]` are projected slots. `ArenaFigure`, `ArenaMedia` and
  `ArenaFallback` are in this component's `imports`; drop one and the slot renders nothing with no
  error.
- `photo` absent is the normal case: the `@else` branch draws the `[fallback]` drop icon rather than
  a broken image.
- `<arena-card [href]>` reports its activation through the component and routing happens in `open()`.
  Do not wrap it in `routerLink`.
- `.perfume-card__name` carries a two-line `min-height` so a grid of cards keeps its price rows
  aligned whatever the name length.
