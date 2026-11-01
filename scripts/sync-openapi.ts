/**
 * Refresh the checked-in `openapi.json` snapshot that drives codegen (and the
 * Python SDK generator).
 *
 * Source, in order:
 *   1. SPOTIFY_OPENAPI_SOURCE (a local .yaml/.json path or an http(s) URL);
 *   2. the monorepo spec at ../../swagger/swagger-spotify-data.yaml;
 *   3. the public spec at https://spotify-proxy.checkleaked.cc/openapi.json.
 *
 * YAML sources need `js-yaml`, which resolves from the monorepo root.
 *
 * Run: npm run codegen:spec   (then codegen:endpoints / codegen:client)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monorepoSpec = resolve(pkgRoot, '../../swagger/swagger-spotify-data.yaml');
const publicSpec = 'https://spotify-proxy.checkleaked.cc/openapi.json';

async function load(source: string): Promise<unknown> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`GET ${source} -> HTTP ${res.status}`);
    return res.json();
  }
  const text = readFileSync(source, 'utf8');
  if (/\.ya?ml$/i.test(source)) {
    const yaml = (await import('js-yaml')) as { load: (s: string) => unknown };
    return yaml.load(text);
  }
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const source = process.env.SPOTIFY_OPENAPI_SOURCE || (existsSync(monorepoSpec) ? monorepoSpec : publicSpec);
  const spec = (await load(source)) as { openapi?: string; info?: { version?: string }; paths?: object };
  if (!spec?.openapi || !spec.paths) throw new Error(`${source} is not an OpenAPI document`);
  // Compact JSON, matching what the API serves at /openapi.json.
  writeFileSync(resolve(pkgRoot, 'openapi.json'), JSON.stringify(spec));
  console.log(
    `openapi.json written from ${source} (spec ${spec.info?.version ?? '?'}, ${Object.keys(spec.paths).length} paths)`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
