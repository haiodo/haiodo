// Astro emits the original raster next to its optimised webp derivative; only the
// derivative is referenced. Drop the orphans so they don't ship. Idempotent.
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const CANDIDATES = ['.png', '.jpg', '.jpeg'];
const TEXTUAL = ['.html', '.css', '.js', '.xml', '.json', '.svg'];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const haystack = (
  await Promise.all(
    files
      .filter((f) => TEXTUAL.includes(extname(f).toLowerCase()))
      .map((f) => readFile(f, 'utf8')),
  )
).join('\n');

let removed = 0;
let bytes = 0;

for (const f of files) {
  if (!CANDIDATES.includes(extname(f).toLowerCase())) continue;
  const name = f.split('/').pop();
  if (haystack.includes(name)) continue; // still referenced somewhere
  bytes += (await stat(f)).size;
  await unlink(f);
  removed++;
  console.log(`  pruned ${relative(DIST, f)}`);
}

console.log(
  `prune-unused-assets: ${removed} orphan image(s), ${(bytes / 1024 / 1024).toFixed(2)} MB saved`,
);
