/**
 * Pagination helpers for the many `offset`/`limit` endpoints.
 *
 * Because each endpoint nests its items differently, you supply a `getItems`
 * function that extracts the current page's array. Iteration stops when a page
 * returns fewer items than `limit` (or when `maxItems` is reached).
 */

export interface PaginateOptions<T> {
  /** Extract the array of items from a page (default: the page itself if it is an array). */
  getItems?: (page: T) => ReadonlyArray<unknown>;
  /** Starting offset. Default `0`. */
  offset?: number;
  /** Page size. Default `50`. */
  limit?: number;
  /** Stop after collecting this many items. */
  maxItems?: number;
  /** Hard cap on page requests (safety). Default `100`. */
  maxPages?: number;
}

/** A page fetcher: given `{ offset, limit }`, return that page. */
export type PageFetcher<T> = (params: { offset: number; limit: number }) => Promise<T>;

function defaultGetItems(page: unknown): ReadonlyArray<unknown> {
  return Array.isArray(page) ? page : [];
}

/**
 * Async-iterate pages of a paginated endpoint.
 *
 * @example
 * for await (const page of paginate((p) => spotify.artists.albums({ id, ...p }), {
 *   getItems: (p) => p?.data?.artist?.discography?.albums?.items ?? [],
 * })) {
 *   // handle page
 * }
 */
export async function* paginate<T>(fetcher: PageFetcher<T>, options: PaginateOptions<T> = {}): AsyncGenerator<T> {
  const getItems = options.getItems ?? defaultGetItems;
  const limit = options.limit ?? 50;
  let offset = options.offset ?? 0;
  const maxPages = options.maxPages ?? 100;
  let seen = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetcher({ offset, limit });
    const items = getItems(result);
    yield result;
    seen += items.length;
    if (items.length < limit) return;
    if (options.maxItems !== undefined && seen >= options.maxItems) return;
    offset += limit;
  }
}

/** Collect all items across pages into a single flat array (bounded by `maxItems`/`maxPages`). */
export async function collect<T, I = unknown>(fetcher: PageFetcher<T>, options: PaginateOptions<T> = {}): Promise<I[]> {
  const getItems = options.getItems ?? defaultGetItems;
  const out: I[] = [];
  for await (const page of paginate(fetcher, options)) {
    for (const item of getItems(page)) {
      out.push(item as I);
      if (options.maxItems !== undefined && out.length >= options.maxItems) return out;
    }
  }
  return out;
}
