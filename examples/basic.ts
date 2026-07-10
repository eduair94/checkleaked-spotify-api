/**
 * Basic usage example. Run with:
 *   RAPIDAPI_KEY=xxx npx tsx examples/basic.ts
 */
import { createClient, SpotifyApiError } from '@checkleaked/spotify-api';

const spotify = createClient({
  apiKey: process.env.RAPIDAPI_KEY ?? '',
  // provider: 'rapidapi', // default; use 'proxy' for the direct proxy
});

async function main() {
  // Search for artists.
  const search = await spotify.search.search({ q: 'daft punk', type: 'artists', limit: 3 });
  console.log('search:', search);

  // Artist overview + top tracks.
  const artistId = '4tZwfgrHOc3mvqYlEYSvVi';
  const overview = await spotify.artists.overview({ id: artistId });
  console.log('overview:', overview);

  const top = await spotify.artists.topTracks({ id: artistId, market: 'US' });
  console.log('top tracks:', top);

  // Charts.
  const charts = await spotify.charts.top200Tracks({ country: 'US' });
  console.log('top 200:', charts);

  // Access the full envelope (with metadata) via the low-level request.
  const envelope = await spotify.request({ method: 'GET', path: '/markets' });
  console.log('markets envelope:', envelope);

  // Cancellation with AbortSignal.
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5_000);
  await spotify.search.suggestions({ q: 'mus' }, { signal: controller.signal });
}

main().catch((err) => {
  if (err instanceof SpotifyApiError) {
    console.error(`API error ${err.status ?? ''} [${err.code ?? ''}]: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
