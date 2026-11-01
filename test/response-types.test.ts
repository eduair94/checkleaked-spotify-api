/**
 * The generated response types against what the API sends SDK callers. The health endpoints keep
 * their per-request records (`lastRequests`, `failedRequests`, `lastUpdateTimestamp`) for the
 * operator (MONITOR_KEY); RapidAPI and direct-API callers get `failedRequestsCount` (plus `isStale`
 * and `staleReason` for a stale instance) instead. Typed as required, the records let
 * `instances[0].lastRequests.length` type-check and then throw at runtime (review FIXC2-02).
 */
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const probeFile = resolve(here, '__response-types-probe__.ts');

/** Type-checks `source` as if it were a file in test/ (strict, like the package): `file:line TScode` per error. */
function typeErrors(source: string, types: string[] = []): string[] {
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2021,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    types,
  };
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  const isProbe = (name: string) => resolve(name) === probeFile;
  host.getSourceFile = (name, languageVersion, ...rest) =>
    isProbe(name)
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile.call(host, name, languageVersion, ...rest);
  host.fileExists = (name) => isProbe(name) || fileExists.call(host, name);
  host.readFile = (name) => (isProbe(name) ? source : readFile.call(host, name));
  return ts.getPreEmitDiagnostics(ts.createProgram([probeFile], options, host)).map((d) => {
    const line = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
    return `${d.file ? basename(d.file.fileName) : '-'}:${line} TS${d.code}`;
  });
}

const imports = `import type {
  GetHealthClusterData,
  GetHealthClusterDataInstance,
  GetHealthClusterStrictData,
  GetHealthInstanceData,
  LastRequestsTrackingInstance,
} from '../src/generated/responses';
import { InstanceName, Status } from '../src/generated/responses';
`;

describe('health response types (records are operator-only)', () => {
  it('allows unknown public status when no fresh telemetry exists', () => {
    expect(typeErrors(`import type { ApiStatus } from '../src/resources/health';
      const status: ApiStatus = { status: 'unknown', updatedAt: '2026-10-25T00:00:00Z', components: [
        { id: 'search', name: 'Search', status: 'unknown', successRate15m: null },
      ] };`, ['node'])).toEqual([]);
  });

  it('accept the bodies every SDK caller receives', () => {
    const source = `${imports}
// /health/cluster/strict \`lastRequestsTracking.instances[]\`, a healthy and a stale instance.
export const tracked: LastRequestsTrackingInstance[] = [
  { instanceId: '0', healthy: true, failedRequestsCount: 0 },
  { instanceId: '1', healthy: false, isStale: true, staleReason: 'No updates in 95 seconds', failedRequestsCount: 2 },
];
// /health/cluster and /health/cluster/strict \`instances[]\`: no lastRequests.
export const instance: GetHealthClusterDataInstance = {
  instanceId: '0',
  instanceName: InstanceName.Trustpilot,
  pid: 4242,
  uptime: 3600,
  lastHeartbeat: new Date(),
  metrics: { totalRequests: 10, successCount: 10, errorCount: 0, successRate: 100, averageResponseTime: 120 },
  status: Status.Healthy,
  isClusterMode: true,
};
// /health/instance: the aggregates, no lastRequests.
export const metrics: GetHealthInstanceData = {
  status: Status.Healthy,
  instance: 'trustpilot-0',
  timestamp: new Date(),
  windowSeconds: 300,
  totalRequests: 10,
  successCount: 10,
  errorCount: 0,
  successRate: 100,
  averageResponseTime: 120,
  statusCodeDistribution: { '200': 10 },
  endpoints: { '/tracks': { count: 10, successRate: 100 } },
};
export const failed: number = tracked[1].failedRequestsCount;
`;
    expect(typeErrors(source)).toEqual([]);
  });

  it('make reading a record without a guard a type error', () => {
    const source = `${imports}
export function counts(cluster: GetHealthClusterData, strict: GetHealthClusterStrictData, instance: GetHealthInstanceData) {
  return [
    cluster.instances[0].lastRequests.length,
    strict.instances[0].lastRequests.length,
    strict.lastRequestsTracking.instances[0].lastRequests.length,
    strict.lastRequestsTracking.instances[0].failedRequests.length,
    instance.lastRequests.length,
    strict.lastRequestsTracking.instances[0].lastUpdateTimestamp.toFixed(),
  ];
}
`;
    const first = source.split('\n').findIndex((line) => line.includes('cluster.instances[0]')) + 1;
    // "… is possibly 'undefined'" (TS2532, or TS18048 when the compiler can name the value), once per read.
    const possiblyUndefined = typeErrors(source).map((error) =>
      error.replace(/ TS(?:2532|18048)$/, ' possibly-undefined'),
    );
    expect(possiblyUndefined).toEqual(
      [0, 1, 2, 3, 4, 5].map((i) => `__response-types-probe__.ts:${first + i} possibly-undefined`),
    );
  });
});
