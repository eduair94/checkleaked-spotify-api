/**
 * Normalize openapi.json into a grouped-by-tag `codegen.json` that drives
 * resource-module generation, sampling and type generation.
 *
 * Run: npm run codegen:endpoints
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

interface RawSchema {
  type?: string;
  enum?: unknown[];
  default?: unknown;
  items?: RawSchema;
  properties?: Record<string, RawSchema>;
}
interface RawParam {
  $ref?: string;
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: RawSchema;
}
interface RawOp {
  summary?: string;
  tags?: string[];
  parameters?: RawParam[];
  requestBody?: { required?: boolean; content?: Record<string, { schema?: RawSchema }> };
}

export interface ParamDef {
  name: string;
  in: 'query' | 'path';
  required: boolean;
  type: string;
  enum?: string[];
  default?: unknown;
  description?: string;
}
export interface BodyProp {
  name: string;
  type: string;
  required: boolean;
}
export interface OpDef {
  method: string;
  path: string;
  key: string;
  typeName: string;
  summary?: string;
  params: ParamDef[];
  body: BodyProp[] | null;
  bodyRequired: boolean;
}
export interface TagGroup {
  tag: string;
  namespace: string;
  className: string;
  filename: string;
  ops: OpDef[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'];

function words(input: string): string[] {
  return input
    .replace(/[{}]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}
function pascalCase(input: string): string {
  return words(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}
function camelCase(input: string): string {
  const p = pascalCase(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}
function keyFor(method: string, path: string): string {
  return `${method.toLowerCase()}_${path}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

const spec = JSON.parse(readFileSync(resolve(pkgRoot, 'openapi.json'), 'utf8')) as {
  paths: Record<string, Record<string, RawOp>>;
  components?: { parameters?: Record<string, RawParam> };
};
const sharedParams = spec.components?.parameters ?? {};

function resolveParam(p: RawParam): RawParam {
  if (p.$ref) {
    const name = p.$ref.split('/').pop() as string;
    return sharedParams[name] ?? p;
  }
  return p;
}

const groups = new Map<string, TagGroup>();

for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, def] of Object.entries(methods)) {
    if (!HTTP_METHODS.includes(method)) continue;
    const tag = def.tags?.[0] ?? 'General';
    const key = keyFor(method, path);

    const params: ParamDef[] = (def.parameters ?? []).map(resolveParam).map((p) => ({
      name: p.name as string,
      in: (p.in as 'query' | 'path') ?? 'query',
      required: Boolean(p.required),
      type: p.schema?.type ?? 'string',
      enum: p.schema?.enum as string[] | undefined,
      default: p.schema?.default,
      description: p.description,
    }));

    let body: BodyProp[] | null = null;
    let bodyRequired = false;
    if (def.requestBody) {
      bodyRequired = Boolean(def.requestBody.required);
      const schema = def.requestBody.content?.['application/json']?.schema;
      if (schema?.properties) {
        const requiredList = (schema as RawSchema & { required?: string[] }).required ?? [];
        body = Object.entries(schema.properties).map(([name, prop]) => ({
          name,
          type: prop.type === 'array' ? `${prop.items?.type ?? 'string'}[]` : (prop.type ?? 'string'),
          required: requiredList.includes(name),
        }));
      } else {
        body = [];
      }
    }

    const op: OpDef = {
      method: method.toUpperCase(),
      path,
      key,
      typeName: `${pascalCase(key)}Data`,
      summary: def.summary,
      params,
      body,
      bodyRequired,
    };

    if (!groups.has(tag)) {
      groups.set(tag, {
        tag,
        namespace: camelCase(tag),
        className: `${pascalCase(tag)}Resource`,
        filename: camelCase(tag),
        ops: [],
      });
    }
    groups.get(tag)!.ops.push(op);
  }
}

const tags = [...groups.values()].sort((a, b) => a.tag.localeCompare(b.tag));
const totalOps = tags.reduce((n, t) => n + t.ops.length, 0);

const output = { version: (spec as { info?: { version?: string } }).info?.version ?? '0', totalOps, tags };
writeFileSync(resolve(pkgRoot, 'codegen.json'), JSON.stringify(output, null, 2));

console.log(`codegen.json written: ${tags.length} tags, ${totalOps} operations`);
for (const t of tags) console.log(`  ${t.namespace.padEnd(14)} ${t.className.padEnd(22)} ${t.ops.length} ops`);
