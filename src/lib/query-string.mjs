/**
 * Serialises nested objects into Strapi's bracket query syntax
 * (populate[author][fields][0]=name). Shared by the site and scripts/snapshot.mjs.
 * @param {Record<string, unknown>} params
 * @param {string} [prefix]
 * @returns {string}
 */
export function toQueryString(params, prefix = '') {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === 'object') parts.push(toQueryString(v, `${name}[${i}]`));
        else parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else if (value !== null && typeof value === 'object') {
      parts.push(toQueryString(/** @type {Record<string, unknown>} */ (value), name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join('&');
}
