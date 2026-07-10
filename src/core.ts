import { resolveConfig, type ResolvedConfig } from './config';
import { SpotifyApiError } from './errors';
import { normalizeId, normalizeIds } from './ids';
import type { ClientConfig, QueryParams, RequestOptions, RequestOverrides, SuccessEnvelope } from './types/common';

/**
 * Low-level HTTP transport for the Spotify Data API.
 *
 * Handles URL/query building, header injection (`x-rapidapi-key` + host),
 * timeouts, retries with backoff (429 / 5xx / network, honoring `Retry-After`),
 * envelope unwrapping and uniform error mapping.
 *
 * The high-level {@link SpotifyApiClient} extends this and adds the typed
 * resource namespaces.
 */
export class SpotifyHttpClient {
  readonly config: ResolvedConfig;

  constructor(config: ClientConfig) {
    this.config = resolveConfig(config);
  }

  /** Perform a request and return the full {@link SuccessEnvelope}. */
  async request<T = unknown>(options: RequestOptions): Promise<SuccessEnvelope<T>> {
    const method = options.method ?? 'GET';
    const url = this.buildUrl(options.path, options.query);
    const cfg = this.config;

    const headers: Record<string, string> = {
      'x-rapidapi-key': cfg.apiKey,
      accept: 'application/json',
      'user-agent': cfg.userAgent,
      ...cfg.headers,
      ...options.headers,
    };
    if (cfg.host) headers['x-rapidapi-host'] = cfg.host;

    let bodyInit: string | undefined;
    if (options.body !== undefined && options.body !== null) {
      bodyInit = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!('content-type' in headers)) headers['content-type'] = 'application/json';
    }

    cfg.onRequest?.({ method, url, headers });
    cfg.debug?.(`→ ${method} ${url}`);

    const maxAttempts = Math.max(1, cfg.retries + 1);
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const attemptStart = Date.now();
      const controller = new AbortController();
      const external = options.signal;
      const onExternalAbort = () => controller.abort();
      if (external) {
        if (external.aborted) controller.abort();
        else external.addEventListener('abort', onExternalAbort, { once: true });
      }
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, cfg.timeoutMs);

      let response: Response;
      try {
        response = await cfg.fetch(url, { method, headers, body: bodyInit, signal: controller.signal });
      } catch (err) {
        clearTimeout(timer);
        external?.removeEventListener('abort', onExternalAbort);

        if (external?.aborted) {
          throw new SpotifyApiError({ message: 'Request aborted by caller.', code: 'ABORTED', url, cause: err });
        }
        lastError = timedOut
          ? new SpotifyApiError({
              message: `Request timed out after ${cfg.timeoutMs}ms.`,
              code: 'TIMEOUT',
              url,
              cause: err,
            })
          : new SpotifyApiError({ message: `Network error: ${errMessage(err)}`, code: 'NETWORK', url, cause: err });

        if (attempt < maxAttempts - 1) {
          const delayMs = this.backoff(attempt);
          cfg.onRetry?.({ attempt: attempt + 1, method, url, error: lastError, delayMs });
          cfg.debug?.(`retry ${attempt + 1} after ${delayMs}ms (${(lastError as SpotifyApiError).code})`);
          await sleep(delayMs);
          continue;
        }
        throw lastError;
      }
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);

      cfg.onResponse?.({ method, url, status: response.status, durationMs: Date.now() - attemptStart });
      cfg.debug?.(`← ${response.status} ${method} ${url} (${Date.now() - attemptStart}ms)`);

      // Retryable status codes.
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts - 1) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        const delayMs = retryAfter ?? this.backoff(attempt);
        cfg.onRetry?.({ attempt: attempt + 1, method, url, status: response.status, delayMs });
        cfg.debug?.(`retry ${attempt + 1} after ${delayMs}ms (status ${response.status})`);
        await sleep(delayMs);
        continue;
      }

      const raw = await response.text();
      let json: unknown;
      if (raw.length > 0) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
      }

      if (!response.ok) {
        throw new SpotifyApiError({
          message: extractMessage(json) ?? `HTTP ${response.status} ${response.statusText}`.trim(),
          status: response.status,
          code: extractCode(json),
          url,
          body: json,
        });
      }

      if (typeof json === 'object' && json !== null) {
        const rec = json as Record<string, unknown>;
        // A `success: false` body is an upstream failure even at HTTP 200 (and even without `data`).
        if (rec.success === false) {
          throw new SpotifyApiError({
            message: extractMessage(json) ?? 'Upstream reported failure.',
            status: response.status,
            code: extractCode(json),
            url,
            body: json,
          });
        }
        if ('success' in rec && 'data' in rec) {
          return json as SuccessEnvelope<T>;
        }
      }

      // Non-enveloped 2xx bodies are wrapped so callers get a consistent shape.
      return { success: true, data: json as T };
    }

    throw lastError ?? new SpotifyApiError({ message: 'Request failed.', url });
  }

  /** GET a path and return the unwrapped `data` payload. */
  async get<T = unknown>(path: string, query?: QueryParams, options?: RequestOverrides): Promise<T> {
    const env = await this.request<T>({ method: 'GET', path, query, ...options });
    return env.data;
  }

  /** POST a JSON body and return the unwrapped `data` payload. */
  async post<T = unknown>(path: string, body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<T> {
    const env = await this.request<T>({ method: 'POST', path, body, query, ...options });
    return env.data;
  }

  /** DELETE a path and return the unwrapped `data` payload. */
  async delete<T = unknown>(path: string, query?: QueryParams, options?: RequestOverrides): Promise<T> {
    const env = await this.request<T>({ method: 'DELETE', path, query, ...options });
    return env.data;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    const qs = serializeQuery(query);
    return `${this.config.baseUrl}${suffix}${qs ? `?${qs}` : ''}`;
  }

  private backoff(attempt: number): number {
    const base = this.config.retryDelayMs * 2 ** attempt;
    return base + Math.floor(Math.random() * this.config.retryDelayMs);
  }
}

// Query keys whose values are Spotify IDs — normalized (URI/URL → bare ID) automatically.
const ID_SINGLE_KEYS = new Set(['id', 'spotify_track_id']);
const ID_MULTI_KEYS = new Set(['ids', 'seed_tracks', 'seed_artists']);

function serializeQuery(query?: QueryParams): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (ID_MULTI_KEYS.has(key)) {
      const normalized = normalizeIds(value as string | ReadonlyArray<string | number>);
      if (normalized.length > 0) params.append(key, normalized);
    } else if (ID_SINGLE_KEYS.has(key) && !Array.isArray(value)) {
      params.append(key, normalizeId(value as string | number));
    } else if (Array.isArray(value)) {
      if (value.length > 0) params.append(key, value.join(','));
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

function extractMessage(json: unknown): string | undefined {
  if (typeof json === 'object' && json !== null) {
    const rec = json as Record<string, unknown>;
    if (typeof rec.message === 'string') return rec.message;
    if (typeof rec.error === 'string') return rec.error;
  }
  return undefined;
}

function extractCode(json: unknown): string | undefined {
  if (typeof json === 'object' && json !== null) {
    const rec = json as Record<string, unknown>;
    if (typeof rec.error === 'string') return rec.error;
    if (typeof rec.code === 'string') return rec.code;
  }
  return undefined;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
