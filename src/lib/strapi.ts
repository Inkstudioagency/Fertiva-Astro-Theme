/**
 * Thin Strapi v5 REST client used at build time (and on-demand in SSR mode).
 *
 * Configure with environment variables (see `.env.example`):
 *   STRAPI_URL    – base URL of the Strapi instance, e.g. http://localhost:1337.
 *                   When it is not set, content is read from src/data/cms-snapshot.json
 *                   (created with `npm run snapshot`), so the theme builds without a CMS.
 *   STRAPI_TOKEN  – optional read-only API token (only needed when the Public role
 *                   has no `find`/`findOne` permission)
 */
import { STRAPI_URL, STRAPI_TOKEN } from 'astro:env/server';
import { toQueryString } from './query-string.mjs';
import snapshot from '../data/cms-snapshot.json';

export interface StrapiMediaFormat {
  url: string;
  width: number;
  height: number;
}

export interface StrapiMedia {
  id: number;
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, StrapiMediaFormat> | null;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

export type QueryObject = Record<string, unknown>;

export { toQueryString };

/** True when no STRAPI_URL is configured: content comes from the bundled snapshot. */
export const usingSnapshot = !STRAPI_URL;

function baseUrl(): string {
  return (STRAPI_URL ?? '').replace(/\/+$/, '');
}

async function request<T>(path: string, params: QueryObject = {}): Promise<T> {
  const qs = toQueryString(params);
  const url = `${baseUrl()}/api/${path}${qs ? `?${qs}` : ''}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
      },
    });
  } catch (error) {
    throw new Error(
      `[strapi] Could not reach Strapi at ${baseUrl()}. Start the CMS (cd strapi && npm run develop), or unset STRAPI_URL to build from the bundled snapshot. ${(error as Error).message}`
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[strapi] ${response.status} ${response.statusText} for ${url}\n${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

/** Fetches every entry of a collection type, following pagination. */
export async function fetchAll<T>(collection: string, params: QueryObject = {}): Promise<T[]> {
  if (usingSnapshot) {
    const data = (snapshot as unknown as Record<string, T[]>)[collection];
    if (!data) throw new Error(`[strapi] No "${collection}" in src/data/cms-snapshot.json. Run \`npm run snapshot\`.`);
    return data;
  }
  const items: T[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const res = await request<StrapiListResponse<T>>(collection, { ...params, pagination: { page, pageSize: 100 } });
    items.push(...res.data);
    pageCount = res.meta.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);
  return items;
}

/** Converts a Strapi media URL to an absolute URL (local uploads are returned as `/uploads/...`). */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  // Snapshot media is served from public/cms-media.
  if (usingSnapshot || url.startsWith('/cms-media/')) return url;
  return `${baseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}
