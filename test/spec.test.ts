/**
 * Drift checks between the SDK and the OpenAPI snapshot (openapi.json):
 *  - every resource method calls an operation the spec documents, with the same verb,
 *    and never an operator-only (`x-internal`) one;
 *  - every operation has a unique operationId and public ones document the error responses;
 *  - inside the monorepo, openapi.json matches swagger/swagger-spotify-data.yaml
 *    (refresh it with `npm run codegen:spec`).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const resourcesDir = resolve(pkgRoot, 'src/resources');
const monorepoSpec = resolve(pkgRoot, '../../swagger/swagger-spotify-data.yaml');

type Operation = {
  operationId?: string;
  description?: string;
  responses?: Record<string, unknown>;
  'x-internal'?: boolean;
};
const spec = JSON.parse(readFileSync(resolve(pkgRoot, 'openapi.json'), 'utf8')) as {
  info: { description: string };
  paths: Record<string, Record<string, Operation>>;
};
const VERBS = ['get', 'post', 'put', 'delete', 'patch'];

const normalize = (p: string) => p.replace(/\{[^}]+\}/g, '{}');
const specPathByNormalized = new Map(Object.keys(spec.paths).map((p) => [normalize(p), p]));

/** Every `this.client.<verb>(path, …)` call in a resource file, with the path resolved to a literal. */
function sdkCalls(): Array<{ where: string; verb: string; path: string }> {
  const out: Array<{ where: string; verb: string; path: string }> = [];
  for (const file of readdirSync(resourcesDir).filter((f) => f.endsWith('.ts') && f !== 'base.ts')) {
    const source = ts.createSourceFile(
      file,
      readFileSync(resolve(resourcesDir, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const literalOf = (expr: ts.Expression, scope: ts.Node): string | undefined => {
      if (ts.isStringLiteralLike(expr)) return expr.text;
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'buildPath') {
        return literalOf(expr.arguments[0], scope);
      }
      if (ts.isIdentifier(expr)) {
        let init: ts.Expression | undefined;
        const find = (node: ts.Node): void => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === expr.text)
            init = node.initializer;
          ts.forEachChild(node, find);
        };
        find(scope);
        return init ? literalOf(init, scope) : undefined;
      }
      return undefined;
    };
    const visit = (node: ts.Node, method?: ts.MethodDeclaration): void => {
      const current = ts.isMethodDeclaration(node) ? node : method;
      if (
        current &&
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        node.expression.expression.name.text === 'client'
      ) {
        const where = `${file}:${current.name.getText(source)}`;
        const path = literalOf(node.arguments[0], current);
        if (!path) throw new Error(`${where}: cannot resolve the request path`);
        out.push({ where, verb: node.expression.name.text, path });
      }
      ts.forEachChild(node, (child) => visit(child, current));
    };
    visit(source);
  }
  return out;
}

describe('OpenAPI snapshot drift', () => {
  const calls = sdkCalls();

  it('finds the resource methods', () => {
    expect(calls.length).toBeGreaterThan(100);
  });

  it('every SDK method calls a documented, public operation with the same verb', () => {
    const problems: string[] = [];
    for (const call of calls) {
      const specPath = specPathByNormalized.get(normalize(call.path));
      const op = specPath ? spec.paths[specPath][call.verb] : undefined;
      if (!op) problems.push(`${call.where}: ${call.verb.toUpperCase()} ${call.path} is not in openapi.json`);
      else if (op['x-internal']) problems.push(`${call.where}: ${call.path} is operator-only (x-internal)`);
    }
    expect(problems).toEqual([]);
  });

  it('every operation has a unique operationId; public ones document 401 and 429', () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const verb of VERBS) {
        const op = item[verb];
        if (!op) continue;
        const where = `${verb.toUpperCase()} ${path}`;
        if (!op.operationId) problems.push(`${where}: no operationId`);
        else if (seen.has(op.operationId)) problems.push(`${where}: duplicate operationId ${op.operationId}`);
        else seen.add(op.operationId);
        if (op['x-internal']) continue;
        for (const status of ['401', '429'])
          if (!op.responses?.[status]) problems.push(`${where}: no ${status} response`);
      }
    }
    expect(problems).toEqual([]);
  });

  // The SDK throws on these 2xx bodies, but clients that branch on the HTTP status alone read them as successes
  // unless the spec names them (review R6-7: /search_lyrics answers every failure with 200).
  it('names every endpoint that answers 200 with an error body, with its codes', () => {
    const description = spec.info.description;
    const exceptions = description.slice(description.indexOf('exceptions to "errors are non-2xx"'));
    const twoHundredErrors: Record<string, string[]> = {
      '/track_lyrics': ['LYRICS_NOT_AVAILABLE'],
      '/search_lyrics': ['NOT_FOUND', 'LYRICS_NOT_AVAILABLE', 'UPSTREAM_THROTTLED', 'UPSTREAM_UNAVAILABLE'],
    };
    for (const [path, codes] of Object.entries(twoHundredErrors)) {
      expect(exceptions, `info.description lists ${path}`).toContain(`\`${path}\``);
      const ok = JSON.stringify(spec.paths[path].get.responses?.['200'] ?? null);
      for (const code of codes) expect(ok, `${path} 200 response names ${code}`).toContain(code);
    }
  });

  it('documents the retryable 503 of /download_track (a region lock it could not confirm)', () => {
    const op = spec.paths['/download_track'].get;
    expect(op.description).toMatch(/503\s+`UPSTREAM_UNAVAILABLE`\s+with\s+`Retry-After`/);
    expect(op.responses?.['503']).toBeDefined();
  });

  it.runIf(existsSync(monorepoSpec))('openapi.json matches swagger/swagger-spotify-data.yaml', async (ctx) => {
    let yaml: { load: (text: string) => unknown };
    try {
      yaml = (await import('js-yaml')) as unknown as { load: (text: string) => unknown };
    } catch {
      ctx.skip(); // js-yaml resolves from the monorepo root; without it there is nothing to compare.
      return;
    }
    expect(spec).toEqual(yaml.load(readFileSync(monorepoSpec, 'utf8')));
  });
});
