import { SpotifyApiError } from './errors';
import type { ClientConfig, FetchLike, Provider, RetryInfo } from './types/common';

/** Base-URL / host presets for each provider. */
export const PROVIDERS = {
  rapidapi: { baseUrl: 'https://spotify81.p.rapidapi.com', host: 'spotify81.p.rapidapi.com' },
  proxy: { baseUrl: 'https://spotify-proxy.checkleaked.cc/spotify-data', host: undefined },
} satisfies Record<Provider, { baseUrl: string; host: string | undefined }>;

export const DEFAULT_USER_AGENT = '@checkleaked/spotify-api';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 500;

/** Fully-resolved configuration used internally by the client. */
export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  host?: string;
  timeoutMs: number;
  retries: number;
  retryDelayMs: number;
  headers: Record<string, string>;
  fetch: FetchLike;
  userAgent: string;
  debug?: (message: string, detail?: unknown) => void;
  onRequest?: (info: { method: string; url: string; headers: Record<string, string> }) => void;
  onResponse?: (info: { method: string; url: string; status: number; durationMs: number }) => void;
  onRetry?: (info: RetryInfo) => void;
}

function readEnvKey(): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env.SPOTIFY_API_KEY || process.env.RAPIDAPI_KEY || process.env.SPOTIFY_RAPIDAPI_KEY || undefined;
}

/** Validate and normalize user config into a {@link ResolvedConfig}. */
export function resolveConfig(config: ClientConfig = {}): ResolvedConfig {
  const apiKey = config.apiKey || readEnvKey();
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new SpotifyApiError({
      message: 'A non-empty `apiKey` is required (or set SPOTIFY_API_KEY / RAPIDAPI_KEY).',
      code: 'CONFIG',
    });
  }

  const provider: Provider = config.provider ?? 'rapidapi';
  const preset = PROVIDERS[provider];
  if (!preset) {
    throw new SpotifyApiError({
      message: `Unknown provider "${provider}". Use "rapidapi" or "proxy".`,
      code: 'CONFIG',
    });
  }

  const baseUrl = (config.baseUrl ?? preset.baseUrl).replace(/\/+$/, '');
  const host = config.host ?? preset.host;

  const fetchImpl = config.fetch ?? (globalThis.fetch as FetchLike | undefined);
  if (typeof fetchImpl !== 'function') {
    throw new SpotifyApiError({
      message: 'No global `fetch` found. Provide `config.fetch` or run on Node >= 18.',
      code: 'CONFIG',
    });
  }

  const debug =
    config.debug === true
      ? (msg: string, detail?: unknown) => console.error(`[spotify-api] ${msg}`, detail ?? '')
      : typeof config.debug === 'function'
        ? config.debug
        : undefined;

  return {
    apiKey,
    baseUrl,
    host,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retries: config.retries ?? DEFAULT_RETRIES,
    retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
    headers: config.headers ?? {},
    fetch: fetchImpl,
    userAgent: config.userAgent ?? DEFAULT_USER_AGENT,
    debug,
    onRequest: config.onRequest,
    onResponse: config.onResponse,
    onRetry: config.onRetry,
  };
}
