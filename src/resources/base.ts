import type { SpotifyHttpClient } from '../core';
import { normalizeId } from '../ids';

/**
 * Base class for every resource namespace. Holds a reference to the transport
 * client so resource methods can call `this.client.get/post/delete`.
 */
export abstract class Resource {
  constructor(protected readonly client: SpotifyHttpClient) {}
}

/**
 * Interpolate `{name}` placeholders in a path template, URL-encoding each value.
 * `id`-like params accept a Spotify ID, URI, or URL (reduced to the bare ID).
 */
export function buildPath(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter "${key}" for "${template}".`);
    }
    const normalized = /id$/i.test(key) ? normalizeId(value) : String(value);
    return encodeURIComponent(normalized);
  });
}
