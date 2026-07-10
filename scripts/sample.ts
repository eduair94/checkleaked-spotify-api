/**
 * Sample real responses from safe, read-only GET endpoints and store them as
 * fixtures under ./fixtures/<key>.json. These feed quicktype in generate-types.
 *
 * The API key is read from env only and NEVER written to disk:
 *   SPOTIFY_API_KEY=xxx npm run codegen:sample
 * Optional: SPOTIFY_PROVIDER=rapidapi|proxy (default rapidapi), SPOTIFY_BASE_URL.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { OpDef, TagGroup } from './build-endpoints';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const apiKey = process.env.SPOTIFY_API_KEY;
if (!apiKey) {
  console.error('SPOTIFY_API_KEY env var is required.');
  process.exit(1);
}
const provider = (process.env.SPOTIFY_PROVIDER ?? 'rapidapi') as 'rapidapi' | 'proxy';
const baseUrl =
  process.env.SPOTIFY_BASE_URL ??
  (provider === 'proxy' ? 'https://spotify-proxy.checkleaked.cc/spotify-data' : 'https://spotify81.p.rapidapi.com');
const host = provider === 'rapidapi' ? 'spotify81.p.rapidapi.com' : undefined;

const IDS = {
  artist: '06HL4z0CvFAxyc27GXpf02', // Taylor Swift
  album: '4aawyAB9vmqN3uQ7FjRGTy', // Global Warming
  track: '0VjIjW4GlUZAMYd2vXMi3b', // Blinding Lights
  playlist: '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
  user: 'spotify',
  show: '5CfCWKI5pZ28U0uOzXkDHe',
  episode: '512ojhOuo1ktJprKbVcKyQ',
  audiobook: '7iHfbu1YPACw6oZPAFJtqe',
  category: 'toplists',
  isrc: 'USUG11904206',
  upc: '00602557325158',
} as const;
const IDS2: Record<string, string> = {
  artist: '3TVXtAsR1Inumwj472S9r4',
  album: '2noRn2Aes5aoNVsU6iWThc',
  track: '7ouMYWpwJ422jRcDASZB7P',
};

// GET endpoints that mutate server state — never sample.
const SIDE_EFFECT_GET = new Set(['/tracking/track', '/tracking/untrack']);
const SKIP_TAGS = new Set(['AI', 'Downloads']);

function idKind(path: string): keyof typeof IDS {
  const p = path.toLowerCase();
  if (p.includes('audiobook')) return 'audiobook';
  if (p.includes('episode')) return 'episode';
  if (p.includes('show')) return 'show';
  if (p.includes('playlist') || p.includes('seed_to_playlist')) return 'playlist';
  if (p.includes('user')) return 'user';
  if (p.includes('artist')) return 'artist';
  if (p.includes('album')) return 'album';
  if (p.includes('categor')) return 'category';
  return 'track';
}

function fillParam(name: string, path: string): string | undefined {
  const kind = idKind(path);
  switch (name) {
    case 'q':
      return path.includes('lyrics') ? 'coldplay yellow' : 'coldplay';
    case 'query':
      return path.includes('concert-locations') ? 'New York' : 'coldplay';
    case 'id':
      return IDS[kind];
    case 'ids':
      return `${IDS[kind]},${IDS2[kind] ?? IDS[kind]}`;
    case 'isrc':
      return IDS.isrc;
    case 'upc':
      return IDS.upc;
    case 'spotify_track_id':
      return IDS.track;
    case 'uri':
      return `spotify:track:${IDS.track}`;
    case 'seed_tracks':
      return IDS.track;
    case 'seed_artists':
      return IDS.artist;
    case 'seed_genres':
      return 'pop';
    case 'type':
      return path.includes('tracking') ? 'track' : undefined;
    case 'market':
    case 'country':
      return 'US';
    default:
      return undefined;
  }
}

function resolveOp(op: OpDef): { path: string; query: Record<string, string> } | null {
  let path = op.path;
  const query: Record<string, string> = {};
  for (const p of op.params) {
    const value = fillParam(p.name, op.path);
    if (value === undefined) {
      if (p.required) return null;
      continue;
    }
    if (p.in === 'path') path = path.replace(`{${p.name}}`, encodeURIComponent(value));
    else query[p.name] = value;
  }
  if (path.includes('{')) return null;
  return { path, query };
}

function toUrl(path: string, query: Record<string, string>): string {
  const qs = new URLSearchParams(query).toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
}

async function main() {
  const { tags } = JSON.parse(readFileSync(resolve(pkgRoot, 'codegen.json'), 'utf8')) as { tags: TagGroup[] };
  const fixturesDir = resolve(pkgRoot, 'fixtures');
  mkdirSync(fixturesDir, { recursive: true });

  const headers: Record<string, string> = { 'x-rapidapi-key': apiKey!, accept: 'application/json' };
  if (host) headers['x-rapidapi-host'] = host;

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const group of tags) {
    if (SKIP_TAGS.has(group.tag)) {
      skipped += group.ops.length;
      continue;
    }
    for (const op of group.ops) {
      if (op.method !== 'GET' || SIDE_EFFECT_GET.has(op.path)) {
        skipped++;
        continue;
      }
      const resolved = resolveOp(op);
      if (!resolved) {
        skipped++;
        console.log(`  skip   ${op.key} (unresolved params)`);
        continue;
      }
      const url = toUrl(resolved.path, resolved.query);
      try {
        const res = await fetch(url, { headers });
        const text = await res.text();
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          json = undefined;
        }
        const payload =
          typeof json === 'object' && json !== null && 'data' in json ? (json as { data: unknown }).data : json;
        const errorOnly =
          typeof payload === 'object' &&
          payload !== null &&
          !Array.isArray(payload) &&
          Boolean((payload as { error?: unknown }).error) &&
          Object.keys(payload).filter((k) => !['error', 'message', 'success', 'status'].includes(k)).length === 0;
        const ok =
          res.ok &&
          json !== undefined &&
          !(typeof json === 'object' && json && (json as { success?: boolean }).success === false) &&
          !errorOnly;
        if (ok) {
          writeFileSync(resolve(fixturesDir, `${op.key}.json`), JSON.stringify(json, null, 2));
          saved++;
          console.log(`  ok     ${op.key}`);
        } else {
          failed++;
          console.log(`  fail   ${op.key} (HTTP ${res.status})`);
        }
      } catch (err) {
        failed++;
        console.log(`  error  ${op.key} (${(err as Error).message})`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\nDone. saved=${saved} skipped=${skipped} failed=${failed}`);
}

void main();
