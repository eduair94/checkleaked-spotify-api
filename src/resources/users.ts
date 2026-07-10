import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetUserProfileData, GetUserFollowersData } from '../generated/responses';

/** Parameters for {@link UsersResource.profile}. */
export interface UsersProfileParams {
  /** Spotify user ID. */
  id: string;
  /** Max number of playlists to include. Default `10`. */
  playlistLimit?: number;
  /** Max number of artists to include. Default `100`. */
  artistLimit?: number;
  /** Max number of episodes to include. Default `100`. */
  episodeLimit?: number;
}

/** Parameters for {@link UsersResource.followers}. */
export interface UsersFollowersParams {
  /** Spotify user ID. */
  id: string;
}

/** User endpoints. */
export class UsersResource extends Resource {
  /** Get a public user profile, including their playlists, artists and episodes. */
  profile(params: UsersProfileParams, options?: RequestOverrides): Promise<GetUserProfileData> {
    return this.client.get<GetUserProfileData>(
      '/user_profile',
      {
        id: params.id,
        playlistLimit: params.playlistLimit,
        artistLimit: params.artistLimit,
        episodeLimit: params.episodeLimit,
      },
      options,
    );
  }

  /** Get a user's followers. */
  followers(params: UsersFollowersParams, options?: RequestOverrides): Promise<GetUserFollowersData> {
    return this.client.get<GetUserFollowersData>('/user_followers', { id: params.id }, options);
  }
}
