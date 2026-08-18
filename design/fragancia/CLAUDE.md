# design/fragancia — the style kernel

This directory is the project's answer to Arena's style kernel. `arena.config.json` names it in
`stylePlugins`, and it is the first (root) entry, so it emits on `:root`.

Two files, and nothing else belongs here:

- `plugin.tokens.json` — the 72 roles, in DTCG form.
- `plugin.css` — the two motifs no role expresses, plus the fluid heading ladder.

## plugin.tokens.json

- **Answer all 72 roles.** The root plugin has no fallback: an unanswered role is a custom property
  with no value, which is invalid at computed-value time, so the declaration reading it is dropped.
  That is a missing border, not a plainer look. `arena-to-prod` refuses the build over it.
- **A colour role takes a `{color.*}` alias and nothing else.** Not a hex, not an Arena colour
  alias like `var(--mute)`. A literal resolves to one palette's value and inherits it into the
  other, so `noche` would bleed into `.arena-femme`.
- **A literal is right where the scale has no step for the answer.** Here that is: every `r-*` at
  `0px` (square corners), the three resting shadows as all-zero objects with a fully transparent
  colour, `press-scale`, `aspect-media`, `grid-min` 264px, `container-max` 1240px, `gutter` 40px,
  `measure-prose` 68, and `step-title-surface` 21px.
- **Four roles need a unit the type does not carry**, through
  `$extensions."com.dravensoft.arena".cssUnit`: `track-heading`, `track-eyebrow` and `track-label`
  take `em`; `measure-prose` takes `ch`. Forget it and the value emits as a bare number, which is
  not a valid letter spacing, and it silently resolves to `normal`.
- **The reading floors refuse the build**, and an ordinary-looking scale step can break one:
  `lh-prose` must be ≥ 1.5, `lh-heading` ≥ 1, `measure-prose` between 45 and 90. `{lh.tight}` is a
  real step and is under the heading floor.
- **Six keys in this file are not roles**: `rhythm-group`, `rhythm-component`, `rhythm-section`,
  `fs-sm`, `fs-md`, `fs-lg`. They are the two scale ladders a plugin is allowed to re-answer,
  because they reach the page through classes rather than through a role. Nothing else here may be
  a scale step.

## plugin.css

- **Selectors are `data-arena-part` hooks, and only this directory may use them.** Application CSS
  reaching one is reported by the audit.
- **Discover a hook by inspecting the served page**, never by guessing it from a component's member
  list. The hook is an attribute on the rendered element; a name that is wrong matches nothing and
  reports nothing. `bun start`, open the element, read the attribute value.
- **Never write `@layer`.** The build wraps this sheet in the reserved layer and restates the layer
  order at its head, so an ordinary selector wins with no `!important`.
- **Do not restate what the slot already paints.** It changes no pixel and it inflates the count of
  painted parts, which is the evidence a new role would be argued from. The audit names it.
- What this file legitimately holds: the rule that follows a section title, the diamond before the
  hero eyebrow, and the `clamp()` over `hero.title`, `page-head.title` and `section.title` — because
  `fs` steps are fixed pixels and the 96px hero title overflowed a 360px phone. **The ceiling of
  every `clamp()` stays the role**, so desktop does not move.

## After a change here

```bash
bun run prepare:assets
bunx arena-to-prod --src src --src design --audit
```

Passing `--src design` is what puts this directory in scope. Then serve the app and look at it, in
both palettes: no gate reads the rendered page.
