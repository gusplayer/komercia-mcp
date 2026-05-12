#!/usr/bin/env node
/**
 * Convert public/og-image.svg → public/og-image.png at build time.
 * Twitter / Facebook / LinkedIn / Slack don't render SVG previews,
 * so we ship both: the SVG stays available for any client that wants
 * it, but the PNG is the one referenced from <meta property="og:image">.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const svgPath = join(publicDir, 'og-image.svg');
const pngPath = join(publicDir, 'og-image.png');

const svg = readFileSync(svgPath, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: '#000000',
  font: {
    // System monospace fallback — works on Linux (Vercel build env)
    // because resvg ships its own font matching. Space Mono falls back
    // to Liberation Mono / DejaVu Sans Mono / SF Mono on macOS.
    loadSystemFonts: true,
  },
});
const pngData = resvg.render().asPng();
writeFileSync(pngPath, pngData);

const kb = (pngData.byteLength / 1024).toFixed(1);
console.log(`✓ og-image.png generated (${kb} KB)`);
