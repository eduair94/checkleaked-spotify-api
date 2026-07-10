/**
 * Core shared types for the Spotify Data API client.
 */

/** Built-in base-URL presets. */
export type Provider = 'rapidapi' | 'proxy';

/** Minimal `fetch` shape the client depends on (injectable for tests / custom runtimes). */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * The standard success envelope every endpoint returns.
 * `data` holds the useful payload; SDK methods return it unwrapped.
 */
export interface SuccessEnvelope<T = unknown> {
  success: boolean;
  data: T;
  metadata?: Record<string, unknown>;
}

/** The standard error envelope returned on failure. */
export interface ErrorEnvelope {
  success: boolean;
  error?: string;
  message?: string;
}

/** A value acceptable in a query string. Arrays are serialized as comma-separated. */
export type QueryValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>;

/** A bag of query parameters. `undefined`/`null` entries are dropped. */
export type QueryParams = Record<string, QueryValue>;

/**
 * Anywhere an ID list is accepted you may pass a comma-separated string, or an
 * array of IDs / URIs / URLs — all are normalized to bare comma-joined IDs.
 */
export type IdList = string | ReadonlyArray<string>;

/** Lifecycle info passed to the retry hook. */
export interface RetryInfo {
  attempt: number;
  method: string;
  url: string;
  status?: number;
  error?: unknown;
  delayMs: number;
}

/** Per-request overrides shared by every verb helper. */
export interface RequestOverrides {
  /** Abort the request from the caller side. */
  signal?: AbortSignal;
  /** Extra headers merged over the defaults for this request only. */
  headers?: Record<string, string>;
}

/** Full description of a single HTTP request. */
export interface RequestOptions extends RequestOverrides {
  method?: string;
  path: string;
  query?: QueryParams;
  body?: unknown;
}

/** User-facing client configuration. */
export interface ClientConfig {
  /**
   * API key sent as `x-rapidapi-key`. If omitted, the client falls back to the
   * `SPOTIFY_API_KEY` or `RAPIDAPI_KEY` environment variable (Node only).
   */
  apiKey?: string;
  /**
   * Base-URL preset. `rapidapi` (default) targets `https://spotify81.p.rapidapi.com`
   * and adds the `x-rapidapi-host` header; `proxy` targets the direct proxy.
   */
  provider?: Provider;
  /** Override the base URL entirely (takes precedence over `provider`). */
  baseUrl?: string;
  /** Override the `x-rapidapi-host` header (takes precedence over `provider`). */
  host?: string;
  /** Per-request timeout in milliseconds. Default `30000`. */
  timeoutMs?: number;
  /** Number of retries on 429 / 5xx / network errors. Default `2`. */
  retries?: number;
  /** Base backoff delay in milliseconds (exponential w/ jitter). Default `500`. */
  retryDelayMs?: number;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Value for the `user-agent` header. */
  userAgent?: string;
  /** Log every request/response/retry to the console (or the provided logger). */
  debug?: boolean | ((message: string, detail?: unknown) => void);
  /** Called just before each request goes out. */
  onRequest?: (info: { method: string; url: string; headers: Record<string, string> }) => void;
  /** Called after each response is received. */
  onResponse?: (info: { method: string; url: string; status: number; durationMs: number }) => void;
  /** Called before each retry (429 / 5xx / network). */
  onRetry?: (info: RetryInfo) => void;
}
