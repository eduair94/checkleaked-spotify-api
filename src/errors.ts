/**
 * Machine-readable error codes. The API's codes (`INVALID_PARAMETER`, `UPSTREAM_THROTTLED`, …)
 * plus the client-side `TIMEOUT` / `NETWORK` / `ABORTED` / `CONFIG`. The API may add codes, and
 * older endpoints report their `error` string here, so any other string is possible too.
 */
export type SpotifyApiErrorCode =
  | 'INVALID_PARAMETER'
  | 'MISSING_PARAMETER'
  | 'NOT_FOUND'
  | 'UNKNOWN_ENDPOINT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_THROTTLED'
  | 'UPSTREAM_TIMEOUT'
  | 'LOAD_SHED'
  | 'OUTCOME_UNKNOWN'
  | 'LYRICS_NOT_AVAILABLE'
  | 'VIDEO_UNAVAILABLE'
  | 'AGE_RESTRICTED'
  | 'PREMIUM_ONLY'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'KEY_REVOKED'
  | 'KEY_EXPIRED'
  | 'INTERNAL_ERROR'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'ABORTED'
  | 'CONFIG'
  | (string & {});

/**
 * Codes that are never retried automatically: waiting cannot fix them (an exhausted quota or a
 * bad key, even when sent with a 429), or a retry could repeat a request that already ran
 * (`OUTCOME_UNKNOWN`, a 503: check the request's effect before sending it again).
 */
export const NON_RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'QUOTA_EXCEEDED',
  'MISSING_API_KEY',
  'INVALID_API_KEY',
  'KEY_REVOKED',
  'KEY_EXPIRED',
  'OUTCOME_UNKNOWN',
]);

function defaultRetryable(status: number | undefined, code: SpotifyApiErrorCode | undefined): boolean {
  if (code === 'TIMEOUT' || code === 'NETWORK') return true;
  return typeof status === 'number' && (status === 429 || status >= 500);
}

/** Options used to construct a {@link SpotifyApiError}. */
export interface SpotifyApiErrorInit {
  message: string;
  /** HTTP status code, when the failure came from a response. */
  status?: number;
  /** Machine-readable code: the body's `code` (or legacy `error` string), or `TIMEOUT`/`NETWORK`/`ABORTED`/`CONFIG`. */
  code?: SpotifyApiErrorCode;
  /** The request URL that failed. */
  url?: string;
  /** Parsed response body (or raw text), when available. */
  body?: unknown;
  /** Request id from the `X-Request-Id` header or the body's `request_id`. Quote it to support. */
  requestId?: string;
  /** How long the API asked you to wait (`Retry-After` / `retry_after_s`), in milliseconds. */
  retryAfterMs?: number;
  /** Whether retrying can succeed. Defaults from the body's `retryable`, else from the status; always false for {@link NON_RETRYABLE_CODES}. */
  retryable?: boolean;
  /** Underlying error, if any. */
  cause?: unknown;
}

/**
 * Every failure thrown by the client is a `SpotifyApiError`, giving uniform access
 * to `status`, `code`, `requestId`, `url` and the parsed `body`.
 */
export class SpotifyApiError extends Error {
  readonly status?: number;
  readonly code?: SpotifyApiErrorCode;
  readonly url?: string;
  readonly body?: unknown;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly retryable: boolean;

  constructor(init: SpotifyApiErrorInit) {
    super(init.message);
    this.name = 'SpotifyApiError';
    this.status = init.status;
    this.code = init.code;
    this.url = init.url;
    this.body = init.body;
    this.requestId = init.requestId;
    this.retryAfterMs = init.retryAfterMs;
    // A code waiting cannot fix wins over a body's generic `retryable` (which the API derives from the status).
    this.retryable =
      init.code !== undefined && NON_RETRYABLE_CODES.has(init.code)
        ? false
        : (init.retryable ?? defaultRetryable(init.status, init.code));
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
    // Restore prototype chain when compiled down to ES5-ish targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** True when the server returned HTTP 429 (your own rate limit or quota). */
  get isRateLimit(): boolean {
    return this.status === 429;
  }

  /** True for HTTP 5xx responses. */
  get isServerError(): boolean {
    return typeof this.status === 'number' && this.status >= 500;
  }

  /** True when the request timed out client-side. */
  get isTimeout(): boolean {
    return this.code === 'TIMEOUT';
  }

  /** The query parameter the API rejected (`param` in a 400 body), when it named one. */
  get param(): string | undefined {
    const body = this.body;
    if (typeof body === 'object' && body !== null && typeof (body as { param?: unknown }).param === 'string') {
      return (body as { param: string }).param;
    }
    return undefined;
  }
}
