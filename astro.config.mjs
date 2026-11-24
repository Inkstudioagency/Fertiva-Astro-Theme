// @ts-check
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs and Open Graph tags. Set SITE_URL in `.env`.
  site: env.SITE_URL || 'https://fertiva.example.com',
  // Keep the original Webflow whitespace so inline text and inline-block spacing match the template 1:1.
  compressHTML: false,
  build: {
    format: 'directory',
    // Always ship CSS as /_astro/*.css files rather than inlining it.
    inlineStylesheets: 'never',
  },
  env: {
    schema: {
      // Not set → content comes from src/data/cms-snapshot.json (see README).
      STRAPI_URL: envField.string({ context: 'server', access: 'public', url: true, optional: true }),
      STRAPI_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/401') })],
});