import { resolveConfig, type ResolvedConfig } from './config';
import { NON_RETRYABLE_CODES, SpotifyApiError, type SpotifyApiErrorCode } from './errors';
import { normalizeId, normalizeIds } from './ids';
import type { ClientConfig, QueryParams, RequestOptions, RequestOverrides, SuccessEnvelope } from './types/common';

/**
 * Low-level HTTP transport for the Spotify Data API.
 *
 * Handles URL/query building, header injection (`x-rapidapi-key` + host),
 * timeouts, retries with backoff (429 / 5xx / network, honoring `Retry-After` up to
 * `maxRetryDelayMs`, retrying a timeout (504, 524, or 503 `UPSTREAM_TIMEOUT`) at most
 * `gatewayTimeoutRetries` times, skipping
 * errors waiting cannot fix), envelope unwrapping and uniform error mapping —
 * including errors the API reports inside a 2xx body.
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
    let gatewayTimeoutRetries = 0;
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

      let response: Response | undefined;
      let raw: string;
      try {
        response = await cfg.fetch(url, { method, headers, body: bodyInit, signal: controller.signal });
        // Fetch resolves on headers; keep timeout/cancellation active until the body finishes too.
        raw = await response.text();
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

        // A write may have succeeded before its response body broke; do not replay it.
        if (attempt < maxAttempts - 1 && (!response || ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()))) {
          const delayMs = this.retryDelay(attempt);
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

      let json: unknown;
      if (raw.length > 0) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
      }
      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after')) ?? bodyRetryAfterMs(json);

      // Retryable status codes — unless the body says waiting cannot help
      // (exhausted quota, bad key, or an explicit `retryable: false`). A timeout already used
      // the API's whole time budget, so it gets at most `gatewayTimeoutRetries` of the retries.
      const upstreamTimeout = isGatewayTimeout(response.status, json);
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < maxAttempts - 1 &&
        worthRetrying(json) &&
        (!upstreamTimeout || gatewayTimeoutRetries < cfg.gatewayTimeoutRetries)
      ) {
        if (upstreamTimeout) gatewayTimeoutRetries++;
        const delayMs = this.retryDelay(attempt, retryAfterMs);
        cfg.onRetry?.({ attempt: attempt + 1, method, url, status: response.status, delayMs });
        cfg.debug?.(`retry ${attempt + 1} after ${delayMs}ms (status ${response.status})`);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        throw this.toError(response, json, url, retryAfterMs, `HTTP ${response.status} ${response.statusText}`.trim());
      }

      if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
        const rec = json as Record<string, unknown>;
        // Some endpoints report a failure inside a 2xx body: `success: false`, `error: true`,
        // or an error `code` (e.g. 200 {error: true, code: 'LYRICS_NOT_AVAILABLE'}).
        if (rec.success === false || rec.error === true || (rec.success !== true && isErrorCode(rec.code))) {
          throw this.toError(response, json, url, retryAfterMs, 'Upstream reported failure.');
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
    const env = await this.request<T>({ method: 'GET', path, ...withOverrides(query, options) });
    return env.data;
  }

  /** POST a JSON body and return the unwrapped `data` payload. */
  async post<T = unknown>(path: string, body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<T> {
    const env = await this.request<T>({ method: 'POST', path, body, ...withOverrides(query, options) });
    return env.data;
  }

  /** DELETE a path and return the unwrapped `data` payload. */
  async delete<T = unknown>(path: string, query?: QueryParams, options?: RequestOverrides): Promise<T> {
    const env = await this.request<T>({ method: 'DELETE', path, ...withOverrides(query, options) });
    return env.data;
  }

  /** Build the {@link SpotifyApiError} for a failed response (non-2xx, or a 2xx error body). */
  private toError(
    response: Response,
    json: unknown,
    url: string,
    retryAfterMs: number | undefined,
    fallbackMessage: string,
  ): SpotifyApiError {
    const rec = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : undefined;
    const bodyRequestId = typeof rec?.request_id === 'string' ? rec.request_id : undefined;
    return new SpotifyApiError({
      message: extractMessage(json) ?? fallbackMessage,
      status: response.status,
      code: extractCode(json) ?? rateLimitCode(response.status, json),
      url,
      body: json,
      requestId: response.headers.get('x-request-id') ?? bodyRequestId,
      retryAfterMs,
      retryable: typeof rec?.retryable === 'boolean' ? rec.retryable : undefined,
    });
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

  /** Wait before the next attempt: the API's `Retry-After` when sent, else backoff — never above `maxRetryDelayMs`. */
  private retryDelay(attempt: number, retryAfterMs?: number): number {
    return Math.min(retryAfterMs ?? this.backoff(attempt), this.config.maxRetryDelayMs);
  }
}

// Query keys whose values are Spotify IDs — normalized (URI/URL → bare ID) automatically.
const ID_SINGLE_KEYS = new Set(['id', 'spotify_track_id', 'spotifyId']);
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

// The machine-readable `code` wins; older endpoints only send an `error` string.
function extractCode(json: unknown): string | undefined {
  if (typeof json === 'object' && json !== null) {
    const rec = json as Record<string, unknown>;
    if (typeof rec.code === 'string') return rec.code;
    if (typeof rec.error === 'string') return rec.error;
  }
  return undefined;
}

/** An API error code: UPPER_SNAKE_CASE, like `LYRICS_NOT_AVAILABLE`. */
function isErrorCode(value: unknown): boolean {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value);
}

// RapidAPI's gateway answers 429 with only a message. Give it the same codes the API uses.
const MONTHLY_QUOTA_RE = /monthly quota/i;

function rateLimitCode(status: number, json: unknown): SpotifyApiErrorCode | undefined {
  if (status !== 429) return undefined;
  return MONTHLY_QUOTA_RE.test(extractMessage(json) ?? '') ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED';
}

/** False when the error body says waiting cannot fix it (quota, bad key, `retryable: false`). */
function worthRetrying(json: unknown): boolean {
  if (typeof json !== 'object' || json === null) return true;
  const rec = json as Record<string, unknown>;
  if (rec.retryable === false) return false;
  if (typeof rec.code === 'string' && NON_RETRYABLE_CODES.has(rec.code)) return false;
  return !MONTHLY_QUOTA_RE.test(extractMessage(json) ?? '');
}

/**
 * A timeout answer: HTTP 504, HTTP 524 (Cloudflare's "origin did not answer in time", about
 * 100 s), or a 5xx whose `code` is `UPSTREAM_TIMEOUT`. Since 2026-10 the API answers timeouts
 * as 503 `UPSTREAM_TIMEOUT` (Cloudflare replaced 504 bodies with plain text), so the status
 * alone no longer tells.
 */
function isGatewayTimeout(status: number, json: unknown): boolean {
  if (status === 504 || status === 524) return true;
  if (status < 500 || typeof json !== 'object' || json === null) return false;
  return (json as Record<string, unknown>).code === 'UPSTREAM_TIMEOUT';
}

/** `retry_after_s` from an error body, in milliseconds. */
function bodyRetryAfterMs(json: unknown): number | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const seconds = (json as Record<string, unknown>).retry_after_s;
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

/** Merge per-call overrides into request options; `options.query` adds to (and wins over) the method's params. */
function withOverrides(
  query: QueryParams | undefined,
  options: RequestOverrides | undefined,
): Pick<RequestOptions, 'query' | 'signal' | 'headers'> {
  const merged = options?.query ? { ...query, ...options.query } : query;
  return { query: merged, signal: options?.signal, headers: options?.headers };
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
