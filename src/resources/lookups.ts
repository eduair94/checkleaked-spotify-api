import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetIsrcLookupData, GetUpcLookupData } from '../generated/responses';

/** Parameters for {@link LookupsResource.isrc}. */
export interface LookupsIsrcParams {
  /** 12-character International Standard Recording Code, e.g. `USUG11904206`. */
  isrc: string;
}

/** Parameters for {@link LookupsResource.upc}. */
export interface LookupsUpcParams {
  /** Universal Product Code / EAN identifying the album. */
  upc: string;
  /** ISO 3166-1 alpha-2 market code. Default `US`. */
  market?: string;
}

/** Identifier lookup endpoints (ISRC / UPC). */
export class LookupsResource extends Resource {
  /** Lookup a track by its ISRC. */
  isrc(params: LookupsIsrcParams, options?: RequestOverrides): Promise<GetIsrcLookupData> {
    return this.client.get<GetIsrcLookupData>('/isrc_lookup', { isrc: params.isrc }, options);
  }

  /** Lookup an album by its UPC. */
  upc(params: LookupsUpcParams, options?: RequestOverrides): Promise<GetUpcLookupData> {
    return this.client.get<GetUpcLookupData>('/upc_lookup', { upc: params.upc, market: params.market }, options);
  }
}
