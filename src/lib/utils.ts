/** Normalises a pathname so `/about-us-v1/` and `/about-us-v1` compare equal. */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean || '/';
}

/** True when `href` points at the page currently being rendered. */
export function isCurrentPath(href: string, pathname: string): boolean {
  if (!href.startsWith('/')) return false;
  return normalizePath(href) === normalizePath(pathname);
}

/** Formats an ISO date the way the original template displays it, e.g. "July 8, 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
