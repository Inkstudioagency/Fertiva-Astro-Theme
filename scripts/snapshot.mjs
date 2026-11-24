/**
 * Saves the current Strapi content as a static snapshot so the theme can be built
 * without a running CMS (for example the live demo, or a first `npm run dev`).
 *
 *   STRAPI_URL=http://localhost:1337 npm run snapshot
 *
 * Writes:
 *   src/data/cms-snapshot.json   – published services, doctors and articles (raw API data)
 *   public/cms-media/*           – every image they reference (all responsive sizes)
 *
 * The site uses the snapshot whenever STRAPI_URL is not set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { toQueryString } from '../src/lib/query-string.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...loadEnv('development', root, ''), ...process.env };
const STRAPI_URL = (env.STRAPI_URL || '').replace(/\/+$/, '');
const STRAPI_TOKEN = env.STRAPI_TOKEN || '';
if (!STRAPI_URL) {
  console.error('Set STRAPI_URL (in .env or the environment) to the Strapi instance to snapshot.');
  process.exit(1);
}

const queries = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/cms-queries.json'), 'utf8'));
const MEDIA_DIR = path.join(root, 'public/cms-media');
const headers = { Accept: 'application/json', ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}) };

async function fetchAll(collection, params) {
  const items = [];
  for (let page = 1, pageCount = 1; page <= pageCount; page++) {
    const url = `${STRAPI_URL}/api/${collection}?${toQueryString({ ...params, pagination: { page, pageSize: 100 } })}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    const json = await res.json();
    items.push(...json.data);
    pageCount = json.meta.pagination.pageCount;
  }
  return items;
}

const downloads = new Map(); // /uploads/x.webp -> /cms-media/x.webp

/** Rewrites every local upload URL in the data and remembers it for download. */
function rewrite(value) {
  if (typeof value === 'string' && value.startsWith('/uploads/')) {
    const local = `/cms-media/${path.basename(value)}`;
    downloads.set(value, local);
    return local;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)]));
  return value;
}

const snapshot = {};
for (const [collection, params] of Object.entries(queries)) {
  snapshot[collection] = rewrite(await fetchAll(collection, params));
  console.log(`${collection}: ${snapshot[collection].length}`);
}

fs.rmSync(MEDIA_DIR, { recursive: true, force: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });
for (const [remote, local] of downloads) {
  const res = await fetch(`${STRAPI_URL}${remote}`);
  if (!res.ok) throw new Error(`${res.status} for ${remote}`);
  fs.writeFileSync(path.join(root, 'public', local), Buffer.from(await res.arrayBuffer()));
}
fs.writeFileSync(path.join(root, 'src/data/cms-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
console.log(`media: ${downloads.size} files → public/cms-media`);
