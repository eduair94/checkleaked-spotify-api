import { Resource, buildPath } from './base';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Playlist events a webhook can subscribe to. */
export type WebhookEvent =
  | 'playlist.tracks.added'
  | 'playlist.tracks.removed'
  | 'playlist.tracks.reordered'
  | 'playlist.metadata.changed'
  | 'playlist.snapshot.created'
  | 'playlist.any';

/** Parameters for {@link WebhooksResource.register}. */
export interface WebhooksRegisterParams {
  /** Spotify playlist ID to watch. */
  playlistId: string;
  /** HTTPS URL that delivery payloads are POSTed to. */
  callbackUrl: string;
  /** Events to deliver. Default `['playlist.any']`. */
  events?: WebhookEvent[];
  /** Optional shared secret used to sign deliveries. */
  secret?: string;
}

/** Parameters for {@link WebhooksResource.delete}. */
export interface WebhooksDeleteParams {
  /** Webhook ID. */
  id: string;
}

/** Parameters for {@link WebhooksResource.test}. */
export interface WebhooksTestParams {
  /** Webhook ID. */
  id: string;
}

/** Parameters for {@link WebhooksResource.deliveries}. */
export interface WebhooksDeliveriesParams {
  /** Webhook ID. */
  id: string;
  /** Max deliveries to return (default 20, max 100). */
  limit?: number;
}

/**
 * Webhook management endpoints. Webhooks belong to the RapidAPI account that registers them;
 * they are not available with direct API keys yet.
 */
export class WebhooksResource extends Resource {
  /** List registered webhooks. */
  get(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/webhooks', query, options);
  }

  /** Register a webhook for a playlist (HTTP 201 when new, 200 when it already existed). */
  register(params: WebhooksRegisterParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>(
      '/webhooks/register',
      { playlistId: params.playlistId, callbackUrl: params.callbackUrl, events: params.events, secret: params.secret },
      undefined,
      options,
    );
  }

  /** Get aggregate webhook delivery statistics. */
  stats(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/webhooks/stats', query, options);
  }

  /** Delete a webhook by ID. */
  delete(params: WebhooksDeleteParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.delete<unknown>(buildPath('/webhooks/{id}', { id: params.id }), undefined, options);
  }

  /** Trigger a test delivery for a webhook. */
  test(params: WebhooksTestParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>(
      buildPath('/webhooks/{id}/test', { id: params.id }),
      undefined,
      undefined,
      options,
    );
  }

  /** Get the delivery log for a webhook. */
  deliveries(params: WebhooksDeliveriesParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>(
      buildPath('/webhooks/{id}/deliveries', { id: params.id }),
      { limit: params.limit },
      options,
    );
  }
}
