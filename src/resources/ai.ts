import { Resource } from './base';
import type { QueryParams, RequestOverrides } from '../types/common';

/**
 * AI-powered analysis endpoints.
 *
 * Every analysis endpoint accepts a free-form JSON body (the subject to
 * analyze plus any options), so these methods take an untyped `body`.
 * Responses are not part of the generated type set and are returned as
 * `unknown`.
 */
export class AiResource extends Resource {
  /** AI module health. */
  health(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/ai/health', query, options);
  }

  /** List the supported AI analysis types. */
  types(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/ai/types', query, options);
  }

  /** Run a generic AI analysis. */
  analyze(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/analyze', body, query, options);
  }

  /** Analyze chart trends. */
  chartTrends(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/chart-trends', body, query, options);
  }

  /** Generate an AI artist summary. */
  artistSummary(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/artist-summary', body, query, options);
  }

  /** Generate an AI album review. */
  albumReview(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/album-review', body, query, options);
  }

  /** Generate an AI track deep dive. */
  trackDeepDive(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/track-deep-dive', body, query, options);
  }

  /** Curate a playlist with AI. */
  playlistCurator(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/playlist-curator', body, query, options);
  }

  /** Generate an AI market comparison. */
  marketComparison(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/market-comparison', body, query, options);
  }

  /** Generate an AI genre landscape. */
  genreLandscape(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/genre-landscape', body, query, options);
  }

  /** Generate an AI mood profile. */
  moodProfile(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/mood-profile', body, query, options);
  }

  /** Assess viral potential with AI. */
  viralPotential(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/viral-potential', body, query, options);
  }

  /** Run a custom AI prompt. */
  custom(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/ai/custom', body, query, options);
  }
}
