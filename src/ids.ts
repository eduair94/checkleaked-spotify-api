/**
 * Spotify ID normalization helpers.
 *
 * Every endpoint that takes an `id` / `ids` accepts a bare Spotify ID, a URI
 * (`spotify:artist:…`), or an open.spotify.com URL — these helpers reduce any of
 * those to the bare ID. Non-Spotify values (category slugs, webhook UUIDs, etc.)
 * pass through unchanged, so normalization is always safe to apply.
 */

const URI_RE = /^spotify:[a-z0-9]+:([A-Za-z0-9]+)$/i;
const URL_RE = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?[a-z-]+\/([A-Za-z0-9]+)/i;

/** Reduce a Spotify ID / URI / URL to its bare ID. Unknown formats pass through. */
export function normalizeId(input: string | number): string {
  const s = String(input).trim();
  const uri = URI_RE.exec(s);
  if (uri) return uri[1];
  const url = URL_RE.exec(s);
  if (url) return url[1];
  return s;
}

/** Accept a comma-separated string or an array of IDs/URIs/URLs → comma-joined bare IDs. */
export function normalizeIds(input: string | number | ReadonlyArray<string | number>): string {
  const arr = Array.isArray(input) ? input : String(input).split(',');
  return (arr as ReadonlyArray<string | number>)
    .map((x) => normalizeId(x))
    .filter((x) => x.length > 0)
    .join(',');
}
