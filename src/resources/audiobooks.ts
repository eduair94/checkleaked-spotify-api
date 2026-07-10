import { Resource, buildPath } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetAudiobooksData } from '../generated/responses';

/** Parameters for {@link AudiobooksResource.get}. */
export interface AudiobooksGetParams {
  /** Comma-separated Spotify audiobook IDs. */
  ids: string | readonly string[];
  /** An ISO 3166-1 alpha-2 country code to filter availability. */
  market?: string;
}

/** Parameters for {@link AudiobooksResource.getById}. */
export interface AudiobooksGetByIdParams {
  /** Spotify audiobook ID. */
  id: string;
  /** An ISO 3166-1 alpha-2 country code to filter availability. */
  market?: string;
}

/** Parameters for {@link AudiobooksResource.chapters}. */
export interface AudiobooksChaptersParams {
  /** Spotify audiobook ID. */
  id: string;
  /** The index of the first chapter to return. */
  offset?: number;
  /** The maximum number of chapters to return. */
  limit?: number;
}

/** Audiobook endpoints. */
export class AudiobooksResource extends Resource {
  /** Get one or more audiobooks by ID. */
  get(params: AudiobooksGetParams, options?: RequestOverrides): Promise<GetAudiobooksData> {
    return this.client.get<GetAudiobooksData>('/audiobooks', { ids: params.ids, market: params.market }, options);
  }

  /** Get a single audiobook by ID. */
  getById(params: AudiobooksGetByIdParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/audiobooks/{id}', { id: params.id });
    return this.client.get<unknown>(path, { market: params.market }, options);
  }

  /** Get an audiobook's chapters (paginated). */
  chapters(params: AudiobooksChaptersParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/audiobooks/{id}/chapters', { id: params.id });
    return this.client.get<unknown>(path, { offset: params.offset, limit: params.limit }, options);
  }
}
