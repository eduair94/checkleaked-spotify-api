/**
 * Post-process the generated resource modules:
 *  1. Upgrade `Promise<unknown>` methods to their real response type when a
 *     fixture-derived type is now available (matched by the endpoint path).
 *  2. Widen multi-id params (`ids` / `seed_tracks` / `seed_artists`) to also
 *     accept an array of IDs.
 *
 * Run: npm run codegen:enhance
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { TagGroup } from './build-endpoints';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const { tags } = JSON.parse(readFileSync(resolve(pkgRoot, 'codegen.json'), 'utf8')) as { tags: TagGroup[] };
const available = new Set<string>(JSON.parse(readFileSync(resolve(pkgRoot, '.codegen-typenames.json'), 'utf8')));

const METHOD_RE = /\n {2}([a-zA-Z][a-zA-Z0-9]*)\(([\s\S]*?)\): Promise<([^>]+)> \{\n([\s\S]*?)\n {2}\}/g;
const MULTI_ID_RE = /^(\s+)(ids|seed_tracks|seed_artists)(\??): string;$/gm;

let upgradedTotal = 0;

for (const group of tags) {
  const file = resolve(pkgRoot, `src/resources/${group.filename}.ts`);
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // module not present (e.g. hand-written exemplar skipped)
  }

  const pathToType = new Map<string, string>();
  for (const op of group.ops) if (available.has(op.typeName)) pathToType.set(op.path, op.typeName);

  const added = new Set<string>();
  text = text.replace(METHOD_RE, (whole, name: string, params: string, ret: string, body: string) => {
    if (ret !== 'unknown') return whole;
    const pathMatch = body.match(/'(\/[^']*)'/);
    if (!pathMatch) return whole;
    const typeName = pathToType.get(pathMatch[1]);
    if (!typeName) return whole;
    added.add(typeName);
    upgradedTotal++;
    const newBody = body.replace(/(\.(?:get|post|delete))<unknown>/, `$1<${typeName}>`);
    return `\n  ${name}(${params}): Promise<${typeName}> {\n${newBody}\n  }`;
  });

  text = text.replace(MULTI_ID_RE, '$1$2$3: string | readonly string[];');

  if (added.size > 0) {
    const importLine = `import type { ${[...added].sort().join(', ')} } from '../generated/responses';\n`;
    text = text.replace(/^(import .*\n)/, `$1${importLine}`);
  }

  writeFileSync(file, text);
  if (added.size)
    console.log(`${group.filename.padEnd(14)} upgraded ${added.size} method(s): ${[...added].join(', ')}`);
}

console.log(`\nTotal methods upgraded unknown -> typed: ${upgradedTotal}`);
