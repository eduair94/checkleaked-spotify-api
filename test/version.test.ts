/** The package version must agree everywhere it is written down. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GATEWAY_TIMEOUT_RETRIES,
  DEFAULT_MAX_RETRY_DELAY_MS,
  DEFAULT_USER_AGENT,
  SDK_VERSION,
  resolveConfig,
} from '../src/index';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file: string) => JSON.parse(readFileSync(resolve(pkgRoot, file), 'utf8'));

describe('version', () => {
  it('package.json, package-lock.json, SDK_VERSION, the user agent and the CHANGELOG agree', () => {
    const { version } = readJson('package.json');
    const lock = readJson('package-lock.json');
    expect(SDK_VERSION).toBe(version);
    expect(lock.version).toBe(version);
    expect(lock.packages[''].version).toBe(version);
    expect(DEFAULT_USER_AGENT).toBe(`@checkleaked/spotify-api/${version}`);
    expect(readFileSync(resolve(pkgRoot, 'CHANGELOG.md'), 'utf8')).toContain(`## ${version} `);
  });

  it('is a major release: 2.0.0 removes and renames 1.x methods and parameters', () => {
    expect(Number(SDK_VERSION.split('.')[0])).toBeGreaterThanOrEqual(2);
    expect(readFileSync(resolve(pkgRoot, 'CHANGELOG.md'), 'utf8')).toMatch(
      /## 2\.0\.0[^\n]*\n[\s\S]*?### Breaking changes/,
    );
  });

  it('retry defaults: waits capped at 10 s, one retry for a 504', () => {
    const cfg = resolveConfig({ apiKey: 'k', fetch: async () => new Response('{}') });
    expect(cfg.maxRetryDelayMs).toBe(DEFAULT_MAX_RETRY_DELAY_MS);
    expect(DEFAULT_MAX_RETRY_DELAY_MS).toBe(10_000);
    expect(cfg.gatewayTimeoutRetries).toBe(DEFAULT_GATEWAY_TIMEOUT_RETRIES);
    expect(DEFAULT_GATEWAY_TIMEOUT_RETRIES).toBe(1);
    const custom = resolveConfig({
      apiKey: 'k',
      fetch: async () => new Response('{}'),
      maxRetryDelayMs: 2_500,
      gatewayTimeoutRetries: 0,
    });
    expect(custom.maxRetryDelayMs).toBe(2_500);
    expect(custom.gatewayTimeoutRetries).toBe(0);
  });
});
