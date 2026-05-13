# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-13

First publicly visible cut of the Komercia MCP landing + auth surface.
Backend (MCP server, Komercia client, shared crypto/jwt) is feature-complete
and tested; this release focuses on the merchant-facing site at
[mcp.komercia.co](https://mcp.komercia.co).

### Added

- **Brand identity in the topbar.** Real Komercia logo (isotype + wordmark)
  as a monochrome inline SVG (`apps/web/src/components/LogoKomercia.astro`)
  rendered in white, paired with a `/mcp` suffix.
- **Favicon stack.** Real Komercia isotype as `favicon.svg` (vectorial,
  brand violet background) plus PNG fallbacks at 32, 180, 192 and 512 px
  for iOS Home Screen / PWA install / legacy browsers. Wired up in
  `Base.astro` + `manifest.webmanifest`.
- **Animated "how it works" terminal.** Replaced the static prompt list
  with an auto-cycling demo: typewriter prompt → tool-call indicator →
  scramble-reveal of a realistic data response, across 6 use cases
  (products, revenue, customers, low stock, Shopify export, payment
  gateways). Nav dots, progress bar, pause-on-hover, generation-token
  cancellation, `prefers-reduced-motion` fallback.
- **Hero ASCII deco.** Right-side decorative panel cycles through 5
  store-data "screens" (live store, monthly sales, top products, 30-day
  forecast, top customers) with a soft scramble between transitions.
- **Bilingual (ES / EN) with auto-detection.** Language toggle in the
  topbar; on first visit the site reads `navigator.languages` and picks
  ES or EN accordingly, then persists the choice to `localStorage`.
- **Scrollspy nav.** The active topnav link is underlined as you scroll
  through `#features` → `#como-funciona` → `#install`.
- **Install methods modal.** A single shared modal covers Claude Code,
  Claude.ai, Claude Desktop and ChatGPT with per-client step lists and
  copy-to-clipboard code blocks.
- **Prompt library modal (`/recetas`).** 18 curated prompts, filterable
  by tool, with one-click copy. Reachable from the hero ("see all 18
  curated prompts").
- **Comprehensive SEO + metadata.** Open Graph image (PNG + SVG source),
  Twitter card, JSON-LD `SoftwareApplication` + `Organization`, canonical
  URLs, language alternates, robots/sitemap. CSP headers and security
  headers set in `Base.astro`.
- **PWA manifest** with theme color, icons (any + maskable) and standalone
  display mode.

### Changed

- **Hero copy.** Now reads "Tu e-commerce / conectado a un agente AI"
  (ES) / "Your e-commerce / connected to an AI agent" (EN). Subtitle
  shortened to position MCP as a conversational layer for the store.
- **Tab title.** Simplified to "Komercia MCP".
- **Hero deco contrast.** Dropped to `opacity: 0.55` with a darker gray
  gradient so it reads as ambient background instead of a foreground UI
  element.
- **Body copy contrast.** Switched primary body copy from muted gray to
  white for legibility on the black background.
- **Install step [02].** Gray shell around the terminal panel with a
  single-line illustrative example (no copy button on the public landing
  — the real command is issued on `/sign-in`).
- **Sign-in page.** Rebuilt around three clear options (A / B / C) with
  visually consistent cards, 5 px spacing rhythm and a shared modal for
  "other clients".
- **Tools list.** Now expandable: 6 visible by default + retro pixel-style
  icons; "see the remaining 5" reveals the full set.
- **Topbar buttons.** Unified to a fixed 36 px height (32 px on mobile)
  with identical pill radius across primary / ghost variants.
- **Responsive breakpoints.** Tightened at `<=480 px` and `<=768 px` so
  the logo + topbar actions fit on 320–768 px without horizontal
  overflow. Added `overflow-x: clip` safety net on `body`.

### Fixed

- **How-it-works demo race conditions.** Typewriter and scramble-reveal
  now check a generation token before writing, so rapid dot clicks or
  cycle transitions can't leave two animations fighting over the same
  DOM node.
- **Language toggle re-render.** Switching ES ↔ EN re-types the active
  use-case question in the new locale immediately, instead of waiting
  for the next 7s cycle.
- **ARIA on the demo.** Removed `aria-live="polite"` from the scrambling
  output (was spamming screen readers with random glyphs). Replaced the
  misleading `role="tab"` / `role="tablist"` on nav dots with plain
  buttons + `aria-current` + descriptive `aria-label`s.
- **Tools grid spacing.** Uniform 16 px gap between all rows when the
  list is expanded (previously a 2-row gap appeared after expand).

### Security

- **Dependency overrides** for 5 high-severity transitives via
  `pnpm.overrides`.

### Internal / dev

- Monorepo on Turborepo + pnpm workspaces.
- Shared ESLint flat config (`packages/eslint-config`).
- CI workflow: lint + typecheck + test on every PR.
- 75 tests passing across `shared`, `komercia-client`, `mcp-server`, `web`.
- API discovery CLI for mapping the Komercia surface during development.
