# Komercia MCP — Design System Reference (legacy / archived)

> **⚠️ This document describes the original light-theme design system
> (Ghost White + Action Orange + Inter / IBM Plex Mono). It is no longer
> in use.** The landing was reskinned to a terminal aesthetic — black
> background, white monospace, Space Mono only. See
> [`brand.md`](./brand.md) for the current visual identity, logo
> component, favicon stack and color tokens.
>
> Kept here for historical reference and in case the light theme is ever
> revived for a separate surface.

---

> "Architectural blueprint on white marble." A pristine ghost-white surface
> punctuated by precise Action Orange CTAs and Deep Plum brand accents,
> overlaid on a subtle dotted grid pattern.

## 1. Overview

The Komercia MCP marketing surface uses a **Column-inspired light-only**
design system. The aesthetic is fintech / banking-tech: technical, precise,
trust-driven, with restrained chromatic punctuation against an otherwise
near-monochromatic palette.

**Light-only theme.** Dark mode has been removed from the site entirely.
There is no `.dark` block in CSS, no `darkMode` in `tailwind.config.mjs`,
and no theme-detection script in `Base.astro`.

### Font substitutions (license-free Google Fonts)

| Original (Column) | Used here       | Role                                    |
| ----------------- | --------------- | --------------------------------------- |
| Suisse Intl       | **Inter**       | Display + body sans-serif               |
| SFMono            | **IBM Plex Mono** | Code, chips, step numbers, technical UI |

Both fonts are loaded from Google Fonts in `apps/web/src/layouts/Base.astro`.

---

## 2. Color palette

All raw colors are exposed as CSS custom properties in
`apps/web/src/styles/global.css` and as Tailwind theme colors in
`apps/web/tailwind.config.mjs`.

| Name              | Hex       | CSS token                       | Tailwind class       | Role                                   |
| ----------------- | --------- | ------------------------------- | -------------------- | -------------------------------------- |
| Ink Blue          | `#011821` | `--color-ink-blue`              | `ink-blue`           | Primary text                           |
| Code Black        | `#000000` | `--color-code-black`            | `code-black`         | Maximum contrast (rare)                |
| Ghost White       | `#ffffff` | `--color-ghost-white`           | `ghost-white`        | Primary surface (page bg, cards)       |
| Fog Gray          | `#f6f6f8` | `--color-fog-gray`              | `fog-gray`           | Secondary section bg, code blocks      |
| Steel Gray        | `#e3e4e8` | `--color-steel-gray`            | `steel-gray`         | Borders, dividers                      |
| Charcoal          | `#232730` | `--color-charcoal-text`         | `charcoal`           | Nav, softer body text                  |
| Slate Text        | `#7c7f88` | `--color-slate-text`            | `slate-text`         | Secondary / supporting text            |
| Graphite          | `#121610` | `--color-graphite`              | `graphite`           | Dark text on hero / contrast surfaces  |
| Deep Plum         | `#111a4a` | `--color-deep-plum`             | `deep-plum`          | Brand accent (eyebrows, secondary CTA) |
| Action Orange     | `#ec652b` | `--color-action-orange`         | `action-orange`      | Primary CTA fill                       |
| Faded Grid Blue   | `#023247` | `--color-faded-grid-blue`       | `faded-grid-blue`    | Dotted grid pattern                    |
| Success Moss      | `#44b48b` | `--color-success-moss`          | `success-moss`       | Success status                         |
| Info Blue         | `#7ea7e9` | `--color-info-blue`             | `info-blue`          | Info graphics                          |
| Callout Cyan      | `#167e6c` | `--color-callout-cyan`          | `callout-cyan`       | Secondary highlight                    |
| Notification Teal | `#88deeb` | `--color-notification-teal`     | `notification-teal`  | Subtle notification highlights         |

### Status colors

| Token                      | Hex / value                | Purpose                  |
| -------------------------- | -------------------------- | ------------------------ |
| `--color-danger`           | `#dc2626`                  | Error text + border      |
| `--color-danger-subtle`    | `rgba(220,38,38,0.06)`     | Error background tint    |
| `--color-warning`          | `#d97706`                  | Warning text + border    |
| `--color-warning-subtle`   | `rgba(217,119,6,0.08)`     | Warning background tint  |
| `--color-success`          | `#44b48b` (success-moss)   | Success text + border    |
| `--color-success-subtle`   | `rgba(68,180,139,0.08)`    | Success background tint  |

### Gradients

- `--gradient-soft-horizon` — multi-stop diagonal across orange → violet →
  blue → cyan → moss → yellow. Used sparingly for hero accents.
- `--gradient-radial-twilight` — radial purple-into-deep-plum, used as the
  background for `.card-callout-plum`.

### Semantic aliases

```
--bg-page         = ghost-white
--bg-section      = fog-gray
--bg-card         = ghost-white
--text-primary    = ink-blue
--text-secondary  = charcoal
--text-tertiary   = slate-text
--border          = steel-gray
--accent-primary  = action-orange  (main CTA fill)
--accent-brand    = deep-plum      (brand)
--accent-success  = success-moss
```

---

## 3. Typography

### Fonts

```
--font-display: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif
--font-sans:    'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif
--font-mono:    'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
```

Display and body share Inter. Headlines use weights 500–600 with negative
tracking; body copy uses 400 with body-tuned tracking. Code surfaces use
IBM Plex Mono with `cv11` and `salt 2` OpenType features enabled.

### Type scale

| Tailwind class    | Size  | Line-height | Tracking   | Recommended use                       |
| ----------------- | ----- | ----------- | ---------- | ------------------------------------- |
| `text-caption`    | 10px  | 1.5         | —          | Micro-labels, footer fineprint        |
| `text-body-sm`    | 12px  | 1.5         | —          | Captions, badges, code chips          |
| `text-body`       | 14px  | 1.5         | -0.28px    | Default body, button labels           |
| `text-body-lg`    | 16px  | 1.5         | —          | Lead paragraphs, FAQ summary          |
| `text-subheading` | 18px  | 1.4         | -0.36px    | Section subheading / supporting copy  |
| `text-heading-sm` | 24px  | 1.33        | -0.48px    | Card titles, H3                       |
| `text-heading`    | 40px  | 1.1         | -0.8px     | Section heading (default)             |
| `text-display`    | 48px  | 1           | -1.44px    | Hero secondary, larger section heads  |
| `text-display-lg` | 60px  | 1           | -1.8px     | Hero display headline                 |

### Weight usage

| Weight | Token     | Usage                             |
| ------ | --------- | --------------------------------- |
| 300    | light     | Reserved (rare display moments)   |
| 400    | regular   | Body, paragraph copy, alerts      |
| 500    | medium    | Buttons, badges, eyebrows, links  |
| 600    | semibold  | Headings, section titles, hero    |

---

## 4. Spacing & layout

### Base unit

4px. Multiples are exposed as both CSS custom properties (`--spacing-N`)
and Tailwind spacing utilities.

| Token           | Value | Common use                                  |
| --------------- | ----- | ------------------------------------------- |
| `--spacing-4`   | 4px   | Hairline gaps                               |
| `--spacing-8`   | 8px   | Inline icon ↔ text                         |
| `--spacing-12`  | 12px  | Compact padding (badges, alerts)            |
| `--spacing-16`  | 16px  | Default content gap, alert padding          |
| `--spacing-20`  | 20px  | Card-callout, row padding                   |
| `--spacing-24`  | 24px  | Card padding, container padding             |
| `--spacing-32`  | 32px  | Major content blocks                        |
| `--spacing-40`  | 40px  | Inter-block separation                      |
| `--spacing-48`  | 48px  | Sub-section spacing                         |
| `--spacing-64`  | 64px  | Tight section gap                           |
| `--spacing-72`  | 72px  | Layout gutters on wide displays             |
| `--spacing-80`  | 80px  | Hero internal spacing                       |
| `--spacing-96`  | 96px  | Default section vertical gap                |
| `--spacing-100` | 100px | Hero top padding                            |
| `--spacing-144` | 144px | Major section breaks (hero ↔ next section) |

### Containers

| Token                     | Value  | Class               |
| ------------------------- | ------ | ------------------- |
| `--page-max`              | 1200px | `.container`, `max-w-page` |
| `--container-narrow`      | 720px  | `.container-narrow`, `max-w-narrow` |
| `--section-gap`           | 96px   | `.section`          |
| `--section-gap-sm`        | 64px   | `.section-tight`    |
| `--element-gap`           | 24px   | inter-element gap   |

Default horizontal padding is 24px (`padding-inline: 24px`).

---

## 5. Border radius

| Token              | Value | Usage                                   |
| ------------------ | ----- | --------------------------------------- |
| `--radius-sm`      | 2px   | Code chips, alerts                      |
| `--radius-default` | 8px   | Buttons, cards, badges, inputs (default)|
| `--radius-lg`      | 12px  | Larger surfaces                         |
| `--radius-xl`      | 16px  | Modals, hero feature cards              |

The default Tailwind `rounded` class maps to 8px.

---

## 6. Shadows

All shadows are designed for the light surface; they layer micro-rings,
hairline outlines, and a subtle ambient drop to evoke pressed-print feel.

| Token              | Tailwind class | Layered values                                                                                |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------- |
| `--shadow-subtle`  | `shadow-subtle`| Plum-tinted hairline drop + inset highlights                                                  |
| `--shadow-subtle-2`| —              | Single 1px steel ring                                                                         |
| `--shadow-subtle-3`| —              | Inset 1px micro-ring (input recess)                                                           |
| `--shadow-subtle-4`| —              | Drop + ghost-white inset ring                                                                 |
| `--shadow-subtle-5`| —              | Single 2px ambient drop (button base)                                                         |
| `--shadow-card`    | `shadow-card`  | Plum hairline + ambient drop + inset highlight (default for cards)                            |
| `--shadow-sm`      | `shadow-sm`    | Triple-stacked drop (dialog, dropdown)                                                        |
| `--shadow-xl`      | `shadow-xl`    | Five-layer floating shadow (hero panels, modals)                                              |
| `--shadow-callout` | `shadow-callout` | Sharp triple drop for orange callouts                                                       |
| `--shadow-focus`   | —              | `0 0 0 3px rgba(17,26,74,0.15)` — focus ring                                                  |

---

## 7. Component classes

All defined in `@layer components` of `global.css`.

| Class                  | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `.btn-primary`         | Action Orange filled CTA, white text, 8px radius                |
| `.btn-secondary`       | Deep Plum outlined, transparent fill, hover → fog-gray          |
| `.btn-dark`            | Ink-blue filled pill (high-emphasis CTA in light contexts)      |
| `.btn-ghost`           | Steel border, charcoal text, hover darkens border               |
| `.btn-link`            | Underlined plum text link, hover → orange                       |
| `.card`                | Ghost-white card with `shadow-card`, 8px radius, 24px padding   |
| `.card-flat`           | Fog-gray card with steel border, no shadow                      |
| `.card-callout-orange` | Orange-filled callout, white text, 6px radius, callout shadow   |
| `.card-callout-plum`   | Radial twilight gradient panel, white text                      |
| `.badge`               | Default 12px pill — steel border, charcoal text                 |
| `.badge-success`       | Moss text + tinted bg                                           |
| `.badge-info`          | Info blue text + tinted bg                                      |
| `.badge-cyan`          | Callout cyan text + tinted bg                                   |
| `.badge-plum`          | Deep plum text + tinted bg                                      |
| `.badge-orange`        | Action orange text + tinted bg                                  |
| `.input-field`         | Contained input, steel border, plum focus ring                  |
| `.input-field-error`   | Error state — danger border                                     |
| `.code-chip`           | Inline mono token, fog-gray bg, 2px radius                      |
| `.code-block`          | Multi-line mono block, fog-gray bg, 8px radius                  |
| `.step-number`         | 28×28 plum square with white mono digit                         |
| `.navbar`              | Sticky 64px translucent ghost-white bar with blur               |
| `.banner`              | Full-width plum announcement bar                                |
| `.faq-item`            | Bordered details/summary block with rotating chevron            |
| `.alert-error`         | Left-border red alert                                           |
| `.alert-warning`       | Left-border amber alert                                         |
| `.alert-success`       | Left-border moss alert                                          |
| `.section-eyebrow`     | Uppercase 12px deep-plum label                                  |
| `.eyebrow-badge`       | Bordered pill eyebrow with optional 12px icon                   |
| `.section-heading`     | 40px Inter 600, primary text                                    |
| `.section-heading-lg`  | 48px Inter 600 variant                                          |
| `.heading-bicolor`     | Bicolor headline (`<span class="muted">` for slate qualifier); `.lg` / `.sm` modifiers |
| `.section-subheading`  | 18px slate supporting copy, 38rem max width                     |
| `.stat-number`         | 40px Inter 600 deep-plum metric                                 |
| `.stat-label`          | 12px slate caption beneath `.stat-number`                       |
| `.container`           | 1200px max-width with 24px inline padding                       |
| `.container-narrow`    | 720px max-width with 24px inline padding                        |
| `.section`             | `padding-block: 96px`                                            |
| `.section-tight`       | `padding-block: 64px`                                            |
| `.section-fog`         | Fog-gray background section                                     |
| `.grid-pattern`        | 24px dotted grid (8% blueprint blue) — decorative bg            |
| `.grid-pattern-strong` | Same grid at 15% opacity                                        |
| `.row-flat`            | Border-bottom row, 20px vertical padding                        |
| `.tool-row`            | 12-col grid row with hover-tint                                 |
| `.icon-box`            | Tinted square wrapper for `IconBox` (sized via inline style)    |
| `.feature-card`        | Horizontal pill row with leading IconBox + label + desc         |
| `.feature-card-label`  | 16px ink-blue label inside `.feature-card`                      |
| `.feature-card-desc`   | 13px slate description inside `.feature-card`                   |
| `.deco-grid-mask`      | Radial-gradient mask helper for hero background art             |

---

## 8. Reusable Astro components

Located under `apps/web/src/components/`. Each wraps the styled primitives
above in a typed Astro component for consistent reuse.

| Component        | Props                                                                      | Notes                                                         |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `Button.astro`   | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'link'`, `href?`, `type?` | Renders `<a>` if `href` is set, else `<button>`               |
| `Card.astro`     | `variant: 'default' \| 'flat' \| 'callout-orange' \| 'callout-plum'`       | Slot-based body                                               |
| `Badge.astro`    | `variant: 'default' \| 'success' \| 'info' \| 'cyan' \| 'plum' \| 'orange'`| Slot for label                                                |
| `SectionHeading` | `eyebrow?`, `heading`, `subheading?`, `size: 'default' \| 'lg'`            | Renders eyebrow + heading + subheading triplet                |
| `CodeBlock`      | `code`, `language?`, `inline?: boolean`                                    | Switches to `.code-chip` when `inline`                        |
| `Container`      | `width: 'page' \| 'narrow'`                                                | Applies the corresponding container class                     |
| `Section`        | `padding: 'default' \| 'tight'`, `background: 'page' \| 'fog'`             | Wraps slot in `<section class="section ...">`                 |
| `GridPattern`    | `intensity: 'subtle' \| 'strong'`, `position?: 'absolute' \| 'relative'`   | Decorative background overlay                                 |
| `IconBox`        | `variant: 'plum' \| 'orange' \| 'blue' \| 'green' \| 'cyan' \| 'teal' \| 'red'`, `size: 'sm' \| 'md' \| 'lg'` | Tinted square with centered icon (Column-style feature glyph) |

If a component does not yet exist in the codebase, prefer building it on
top of the primitive class first; promote to a component only on the
second usage.

---

## 9. Do's and Don'ts

### Do

- Use **Action Orange** only for the single primary CTA on each viewport.
- Use **Deep Plum** for brand and structural emphasis (eyebrows, secondary CTAs).
- Lead with white space — let the 96px section gap carry the rhythm.
- Use the dotted grid pattern as an architectural underlay, not as decoration.
- Use IBM Plex Mono for **anything technical**: code, chips, step indicators, tool names.
- Pair every section heading with an eyebrow when the section needs categorical context.
- Round numerically: stick to 8/12/16/24 radii. No 6px, 10px, or 20px outliers.

### Don't

- **Do not** introduce a dark mode variant. Light is the only theme.
- **Do not** add new color tokens without registering them in both `global.css` and `tailwind.config.mjs`.
- **Do not** use Action Orange for borders, dividers, or backgrounds beyond the orange callout card.
- **Do not** use the gradient tokens as page or large surface fills — they are for callouts only.
- **Do not** reach for serif faces. Inter is the display family.
- **Do not** use shadows on flat list rows or the navbar in its top state.
- **Do not** preserve any token from the previous design system (eggshell, powder, chalk, obsidian, signal, gravel, slate). They have been removed.

---

## 10. Light-only theme note

The previous editorial system was dual-mode (`.dark` class toggled on
`<html>` from `localStorage`). The Column-inspired system is **light-only**
by design.

Concretely this means:

- `tailwind.config.mjs` **omits** `darkMode`.
- `global.css` contains **no `.dark` block**.
- `Base.astro` renders `<html lang="es">` with no class and **no theme
  initialization script**.
- The Google Fonts link loads only Inter and IBM Plex Mono — Cormorant
  Garamond and JetBrains Mono have been removed.
- Any prior tokens (eggshell, powder, chalk, fog, gravel, slate, obsidian,
  signal) are gone and replaced with the new ink-blue / fog-gray /
  steel-gray / deep-plum / action-orange palette.

If a future requirement reintroduces dark mode, treat it as a new design
exercise rather than a flag flip — the ramp, semantic mapping, and shadow
language all need redesign.

---

## 11. Column-inspired patterns

A second pass of Column reference work introduced a small set of editorial
patterns layered on top of the existing primitives. They are additive — the
older primitives remain canonical; these refine specific moments (heroes,
feature lists, metrics rows, marquee CTAs).

### Bicolor headlines

Use `.heading-bicolor` when a sentence reads as **subject + qualifier** and
you want the qualifier to recede. The `<span class="muted">` half adopts
slate text; the rest stays ink-blue.

```html
<h1 class="heading-bicolor lg">
  Move every store off Komercia
  <span class="muted">before the platform sunsets.</span>
</h1>
```

Sizes follow `text-display` by default; modifier classes `.lg` (60px /
display-lg) and `.sm` (40px / heading) are available for hero and card
contexts respectively.

### Eyebrow badges

`.eyebrow-badge` is a bordered pill version of `.section-eyebrow`. Use it
for hero or major section labels where a flat eyebrow looks unanchored on a
busy hero. Optionally include a 12px leading SVG.

```html
<span class="eyebrow-badge">
  <svg>…</svg>
  Trusted at scale
</span>
```

Reach for `.section-eyebrow` (flat, no border) for in-page sub-sections;
reserve `.eyebrow-badge` for hero/major-section moments.

### Icon boxes

`<IconBox variant size>` renders a tinted square with a centered icon
(passed via slot). Replaces ad-hoc inline `<div class="…">` icon wrappers
across feature grids.

```astro
<IconBox variant="blue" size="md">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- icon paths -->
  </svg>
</IconBox>
```

| Prop      | Values                                                            | Default |
| --------- | ----------------------------------------------------------------- | ------- |
| `variant` | `plum` · `orange` · `blue` · `green` · `cyan` · `teal` · `red`    | `plum`  |
| `size`    | `sm` (32px) · `md` (40px) · `lg` (48px)                           | `md`    |

Background is the variant color at 8–18% opacity; foreground (icon stroke
or fill via `currentColor`) is the variant's full hue. The container has
8px radius and is `aria-hidden`, so the icon is purely decorative — supply
adjacent text for meaning.

### Feature cards

`.feature-card` is the horizontal pill row used in Column's feature grids.
It pairs an `IconBox` with a label and optional one-line description.

```html
<a href="#orders" class="feature-card">
  <IconBox variant="orange" size="md"><svg>…</svg></IconBox>
  <div>
    <div class="feature-card-label">Order export</div>
    <div class="feature-card-desc">Full history with line items and customers.</div>
  </div>
</a>
```

Hover lifts the row 1px and upgrades the shadow from `--shadow-card` to
`--shadow-sm`. Use it inside the right column of the **left-label +
right-grid** asymmetric pattern (below).

### Stat numbers

`.stat-number` + `.stat-label` typeset metrics rows (e.g. "$2T+ moved
annually"). The number uses Inter 600 at 40px in deep-plum; the label sits
beneath in 12px slate. Constrain the wrapper width so the row breathes.

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-12">
  <div>
    <p class="stat-number">12k+</p>
    <p class="stat-label">stores migrated</p>
  </div>
  <!-- … -->
</div>
```

### Black CTA variant

`.btn-dark` is the ink-blue/black filled pill used for high-emphasis
secondary CTAs in light contexts (typically beside `.btn-primary` in a
hero, or as the standalone CTA on a fog-gray section). Reserve it — over
two `.btn-dark` per viewport flattens visual hierarchy.

### Section pattern: left-label + right-grid

A recurring Column section uses an asymmetric 4/8 (or 5/7) split:

- **Left column:** an eyebrow badge, a bicolor heading (sm), one short
  paragraph, and a single text link or `.btn-link`.
- **Right column:** a 2× or 3× grid of `.feature-card` rows.

This keeps the *what we do* description anchored on the left while the
right column carries the inventory of capabilities — visually denser but
still scannable thanks to the shared IconBox rhythm.

```html
<section class="section">
  <div class="container grid md:grid-cols-12 gap-12">
    <div class="md:col-span-4">
      <span class="eyebrow-badge">Exports</span>
      <h2 class="heading-bicolor sm">
        Lightweight payments
        <span class="muted">with first-class data portability.</span>
      </h2>
      <p class="section-subheading">…</p>
    </div>
    <div class="md:col-span-8 grid sm:grid-cols-2 gap-3">
      <a class="feature-card">…</a>
      <a class="feature-card">…</a>
      <!-- … -->
    </div>
  </div>
</section>
```

### Helper utilities

| Class             | Purpose                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `.deco-grid-mask` | Radial-gradient mask for hero background art (fades edges to transparent) |
