# Brand & Visual Identity

This document covers the visual identity of the public landing
([mcp.komercia.co](https://mcp.komercia.co)) — logo, favicons, color
tokens, typography, and the components that ship them.

> Looking for the old light-theme design system (Inter / Ghost White /
> Action Orange)? That lived in `design.md` and is no longer in use — the
> landing was reskinned to a terminal aesthetic. `design.md` is kept for
> historical reference only.

---

## 1. Aesthetic

Terminal-inspired, monochrome. Black background, white text, gray
secondary. The CLI prompt (`user@komercia ~$ ./mcp.connect_`), the
scramble-reveal animation, the ASCII data deco — all of it leans into a
"merchants who feel comfortable in a terminal" vibe.

Brand color is reserved for the favicon and the source `Logo-komercia.svg`
asset. Everywhere else the brand is rendered monochrome (white on black).

---

## 2. Logo

Two parts:

- **Isotype** — the stylized "K" mark. Used by itself in the favicon.
- **Wordmark** — the "komercia" type. Lives next to the isotype in the
  full lockup.

### Where it appears in code

| Surface | Variant | File / component |
|---|---|---|
| Topbar (every page) | Full lockup, monochrome white | `apps/web/src/components/LogoKomercia.astro` (inline SVG) |
| Favicon | Isotype only, brand colors on violet | `apps/web/public/favicon.svg` |
| Apple Touch Icon | Isotype, raster | `apps/web/public/apple-touch-icon.png` (180×180) |
| PWA install | Isotype, raster | `apps/web/public/icon-192.png`, `icon-512.png` |
| Legacy browsers | Isotype, raster | `apps/web/public/favicon-32.png` |

### LogoKomercia.astro

```astro
<LogoKomercia class="brand-mark" />
```

Inline SVG with `fill="currentColor"` — the parent's `color` controls
the fill. Default `viewBox` is tuned (`155 105 2080 360`) to crop empty
space around the lockup so visual centering matches the text next to it.

The CSS rule that sizes it lives in `index.astro` and is marked
`:global(.brand-mark)` because Astro's per-file CSS scoping would
otherwise not reach the SVG inside the child component.

```css
:global(.brand-mark) {
  height: 22px;
  width: 127px;
  display: block;
  flex-shrink: 0;
}
/* On <=768 the logo scales down to 19/110, on <=480 to 17/98. */
```

### Topbar lockup

```html
<a href="/" class="brand" aria-label="Komercia MCP home">
  <LogoKomercia class="brand-mark" />
  <span class="brand-text">/mcp</span>
</a>
```

The `/mcp` suffix is a separate `<span class="brand-text">` so it stays
inheritable plain text (translatable, selectable, no SVG required).

---

## 3. Favicons & PWA icons

All favicon assets ship in `apps/web/public/` and are referenced from
`Base.astro` + `manifest.webmanifest`.

| File | Size | Format | Purpose |
|---|---|---|---|
| `favicon.svg` | 1.4 KB | vectorial | Modern browsers — sharpest at any DPR |
| `favicon-32.png` | 1.7 KB | raster | Legacy/fallback tab icon |
| `apple-touch-icon.png` | 15.6 KB | raster | iOS Home Screen (180×180) |
| `icon-192.png` | 17.2 KB | raster | PWA install (192×192) |
| `icon-512.png` | 69.5 KB | raster | PWA install + maskable (512×512) |
| `manifest.webmanifest` | — | json | PWA metadata, declares icons |

### How they were generated

The source is `images/favicon.jpeg` (brand isotype on violet). The PNG
variants were produced from it with macOS `sips`:

```bash
sips -s format png images/favicon.jpeg --out /tmp/kom-favicon.png
sips -z 32 32   /tmp/kom-favicon.png --out apps/web/public/favicon-32.png
sips -z 180 180 /tmp/kom-favicon.png --out apps/web/public/apple-touch-icon.png
sips -z 192 192 /tmp/kom-favicon.png --out apps/web/public/icon-192.png
sips -z 512 512 /tmp/kom-favicon.png --out apps/web/public/icon-512.png
```

`favicon.svg` is hand-authored to keep the file < 1.5 KB. When the brand
asset changes, re-run the `sips` chain above and update the SVG paths
to match.

### Base.astro wiring

```astro
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

---

## 4. Color tokens (current landing)

Defined as CSS custom properties on `.page` in `apps/web/src/pages/index.astro`:

| Token | Value | Role |
|---|---|---|
| `--c-bg` | `#000000` | Page background |
| `--c-fg` | `#ffffff` | Primary text, primary CTA fill |
| `--c-surface` | `#1d1d1d` | Tool cards, examples panel, terminal demo |
| `--c-border` | `#383838` | Dividers, ghost button borders, nav dot inactive |
| `--c-muted` | `#888888` | Secondary text, comments, dimmed glyphs |
| `--r` | `10px` | Standard border radius |

Source brand colors (used only in `favicon.svg`):

| Hex | Role in source |
|---|---|
| `#4b22f4` | Brand violet (favicon background, source SVG `cls-2`) |
| `#4b24ba` | Wordmark + isotype outline (source SVG `cls-1`) |
| `#02e5a0` | Isotype green stroke (source SVG `cls-3`) |

---

## 5. Typography

Single typeface: **Space Mono** (400 + 700), loaded from Google Fonts in
`Base.astro` along with Inter and IBM Plex Mono (legacy holdovers, not
currently used on the landing).

```css
font-family: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco,
             Consolas, monospace;
line-height: 1.4;
letter-spacing: 0.24px;
font-feature-settings: 'zero';
```

The `'zero'` feature gives slashed zeros — small detail, big terminal
authenticity boost.

### Type scale (canonical)

Defined as CSS custom properties on `.page` in `index.astro` and
`sign-in.astro`. The modal in `RecetasModal.astro` inherits via cascade.
Seven sizes — anything outside this scale is a bug or a decorative
exception (ASCII art).

| Token | Px | Role |
|---|---|---|
| `--fs-xs`   | 12 | Micro: count badges, tool tags inside recipe cards, HIW tool chip |
| `--fs-sm`   | 13 | Small: code blocks, modal meta, captions, footer labels, badges, mini buttons |
| `--fs-base` | 14 | UI default: form labels, ghost buttons, modal info, mobile body, secondary copy |
| `--fs-md`   | 16 | Body text: paragraphs, section headers, tool card names, primary CTA, form inputs |
| `--fs-lg`   | 20 | Sub-display: sign-in page title on mobile (and headings that need a step between body and hero) |
| `--fs-xl`   | 24 | Hero h1 on mobile (≤768), sign-in page title on desktop |
| `--fs-2xl`  | 32 | Hero h1 on desktop |

`.field input` is locked at `--fs-md` (16) regardless of viewport
because iOS Safari zooms the whole page when a form field smaller than
16 px gains focus.

Always reference via `var(--fs-*)`, never hardcode `font-size: 14px`.

### Hierarchy on mobile

Desktop has the luxury of whitespace, so every body-level element can
sit at `--fs-md` (16) without crowding. On phones, all-16 reads as a
soup — nothing is the focus. The mobile override (`@media (max-width:
768px)`) deliberately demotes secondary copy down one step so a clear
three-tier rhythm emerges:

| Tier | Mobile px | Examples |
|---|---|---|
| Display | 24 (`--fs-xl`) | Hero h1 only |
| Body / Important | 16 (`--fs-md`) | Section h2 (`> features`), tool-card name, install step header (`[01] get_token`), page footer |
| Secondary / Auxiliary | 14 (`--fs-base`) | Hero lede, trust line, block-hint, prompt, tool-card desc, all CTAs, step description |
| Captions / Code | 13 (`--fs-sm`) | Modal meta, code blocks, recipe response |
| Micro | 12 (`--fs-xs`) | Count chips, tool tag pills, HIW tool chip |

Desktop preserves the editorial cadence: 32 > 16 > 14 (display > body >
desc), since at 880-px max-width the lede + trust + hint can comfortably
share the same body size with the H1 doing the heavy lifting.

### Application matrix (desktop default)

| Element | Token | Mobile override |
|---|---|---|
| Hero h1 | `--fs-2xl` | `--fs-xl` |
| Hero lede / subtitle | `--fs-md` | `--fs-base` |
| Hero prompt (`user@komercia ~$ ...`) | `--fs-md` | `--fs-base` |
| Body paragraphs, section h2 | `--fs-md` | — (h2 stays 16) |
| Block-hint (section subtitle) | `--fs-md` | `--fs-base` |
| Trust line | `--fs-md` | `--fs-base` |
| Tool card name | `--fs-md` | — (stays 16) |
| Tool card desc | `--fs-base` | — (already 14) |
| Install step header (`[01] …`) | `--fs-md` | — (stays 16) |
| Install step description | `--fs-md` | `--fs-base` |
| Primary CTA (`.btn-primary`) | `--fs-md` | `--fs-base` |
| Ghost pill (topbar buttons) | `--fs-base` | `--fs-xs` (≤480) |
| Form labels, inputs | `--fs-base` | — |
| Modal title | `--fs-base` | `--fs-sm` (≤640) |
| Modal info, filter buttons, close button | `--fs-base` | — |
| Filter count, modal footer, code blocks | `--fs-sm` | — |
| Method name (install modal h3) | `--fs-md` | — |
| Method badge, step num | `--fs-sm` | — |
| Recipe prompt | `--fs-md` | — |
| Recipe response, recipe meta, recipe copy | `--fs-sm` | — |
| Recipe tools chip | `--fs-xs` | — |
| HIW prompt row | `--fs-md` | — |
| HIW calling, output, bar label | `--fs-sm` | — |
| HIW tool chip | `--fs-xs` | — |
| Bottom bar / page footer | `--fs-md` | — |

### Decorative exceptions (NOT in the scale)

- `.hiw-chrome-dots` — `8px`. The "● ● ●" decorative window dots.
- `.deco-frame code` — `11px`. The right-side ASCII data deco on the hero.

These are intentionally outside the scale because they are non-textual
ornaments. Don't try to fit them in.

### How to add a new size

If you genuinely need a size between two tokens, **stop first** and check:

1. Could you use a heavier/lighter weight + an existing token instead?
2. Could you use `color: var(--c-muted)` to demote a token visually?
3. Is the layout problem actually a spacing or padding issue?

If none of the above and a new token is truly needed, add it on `.page`
in both `index.astro` and `sign-in.astro`, update this table, and run a
grep to confirm no orphan hardcoded `font-size: Npx` slipped in.

---

## 6. Updating the brand

If the brand changes (new logo, new colors, new typeface), in order:

1. Drop the new source assets in `images/` (kept out of git as raw
   sources, used only as inputs to generators).
2. Regenerate the PNG favicon variants with `sips` (commands above).
3. Replace the `favicon.svg` paths if the isotype shape changed.
4. Update `LogoKomercia.astro` paths + `viewBox` if the wordmark changed.
5. Update the color tokens in `index.astro` (the `--c-*` block on
   `.page`) if the palette changed.
6. Run `pnpm --filter @komercia-mcp/web build` and verify the topbar +
   favicon visually before committing.
