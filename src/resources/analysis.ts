import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetArtistCompareData, GetPlaylistAnalysisData } from '../generated/responses';

/** Parameters for {@link AnalysisResource.artistCompare}. */
export interface AnalysisArtistCompareParams {
  /** Comma-separated artist IDs (2–10). */
  ids: string | readonly string[];
}

/** Parameters for {@link AnalysisResource.audioFeatures}. */
export interface AnalysisAudioFeaturesParams {
  /** Spotify track ID. */
  id: string;
}

/** Parameters for {@link AnalysisResource.playlistAnalysis}. */
export interface AnalysisPlaylistAnalysisParams {
  /** Spotify playlist ID. */
  id: string;
}

/** Analysis endpoints. */
export class AnalysisResource extends Resource {
  /** Compare artists side by side. */
  artistCompare(params: AnalysisArtistCompareParams, options?: RequestOverrides): Promise<GetArtistCompareData> {
    return this.client.get<GetArtistCompareData>('/artist_compare', { ids: params.ids }, options);
  }

  /** Get audio features for a track. */
  audioFeatures(params: AnalysisAudioFeaturesParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/audio_features', { id: params.id }, options);
  }

  /** Get analysis for a playlist. */
  playlistAnalysis(
    params: AnalysisPlaylistAnalysisParams,
    options?: RequestOverrides,
  ): Promise<GetPlaylistAnalysisData> {
    return this.client.get<GetPlaylistAnalysisData>('/playlist_analysis', { id: params.id }, options);
  }
}
