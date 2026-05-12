import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

// SSR with Vercel serverless functions. The Node adapter is no longer used —
// the app deploys to Vercel and the Postgres pool is sized for serverless
// (max: 1) in src/lib/db.ts.
export default defineConfig({
  site: 'https://mcp.komercia.co',
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
    maxDuration: 30,
  }),
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) =>
        !page.includes('/api/') &&
        !page.includes('/sign-in') &&
        !page.includes('/404'),
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
    }),
  ],
  vite: {
    // Load .env from the monorepo root in local dev.
    // On Vercel, env vars are injected directly into process.env — this has no effect.
    envDir: '../../',
  },
});
