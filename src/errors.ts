/** Options used to construct a {@link SpotifyApiError}. */
export interface SpotifyApiErrorInit {
  message: string;
  /** HTTP status code, when the failure came from a response. */
  status?: number;
  /** Machine-readable code: upstream `error` field, or `TIMEOUT`/`NETWORK`/`ABORTED`/`CONFIG`. */
  code?: string;
  /** The request URL that failed. */
  url?: string;
  /** Parsed response body (or raw text), when available. */
  body?: unknown;
  /** Underlying error, if any. */
  cause?: unknown;
}

/**
 * Every failure thrown by the client is a `SpotifyApiError`, giving uniform access
 * to `status`, `code`, `url` and the parsed `body`.
 */
export class SpotifyApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly url?: string;
  readonly body?: unknown;

  constructor(init: SpotifyApiErrorInit) {
    super(init.message);
    this.name = 'SpotifyApiError';
    this.status = init.status;
    this.code = init.code;
    this.url = init.url;
    this.body = init.body;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
    // Restore prototype chain when compiled down to ES5-ish targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** True when the server returned HTTP 429. */
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
}
