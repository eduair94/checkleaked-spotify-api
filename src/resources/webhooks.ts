import { Resource, buildPath } from './base';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Parameters for {@link WebhooksResource.register}. */
export interface WebhooksRegisterParams {
  /** Destination URL that delivery payloads are POSTed to. */
  url?: string;
  /** Event names to subscribe this webhook to. */
  events?: string[];
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
}

/** Webhook management endpoints. */
export class WebhooksResource extends Resource {
  /** List registered webhooks. */
  get(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/webhooks', query, options);
  }

  /** Register a new webhook. */
  register(params: WebhooksRegisterParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>(
      '/webhooks/register',
      { url: params.url, events: params.events },
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
    return this.client.get<unknown>(buildPath('/webhooks/{id}/deliveries', { id: params.id }), undefined, options);
  }
}
