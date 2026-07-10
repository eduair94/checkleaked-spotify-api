import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetIsrcLookupData, GetUpcLookupData } from '../generated/responses';

/** Parameters for {@link LookupsResource.isrc}. */
export interface LookupsIsrcParams {
  /** International Standard Recording Code identifying the track. */
  isrc: string;
}

/** Parameters for {@link LookupsResource.upc}. */
export interface LookupsUpcParams {
  /** Universal Product Code identifying the album. */
  upc: string;
}

/** Identifier lookup endpoints (ISRC / UPC). */
export class LookupsResource extends Resource {
  /** Lookup a track by its ISRC. */
  isrc(params: LookupsIsrcParams, options?: RequestOverrides): Promise<GetIsrcLookupData> {
    return this.client.get<GetIsrcLookupData>('/isrc_lookup', { isrc: params.isrc }, options);
  }

  /** Lookup an album by its UPC. */
  upc(params: LookupsUpcParams, options?: RequestOverrides): Promise<GetUpcLookupData> {
    return this.client.get<GetUpcLookupData>('/upc_lookup', { upc: params.upc }, options);
  }
}
