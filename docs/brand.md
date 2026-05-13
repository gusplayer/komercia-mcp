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
font-size: 16px;
line-height: 1.4;
letter-spacing: 0.24px;
font-feature-settings: 'zero';
```

The `'zero'` feature gives slashed zeros — small detail, big terminal
authenticity boost.

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
