// Slashless URLs are canonical (build.format: 'file' -> /posts/x.html served at /posts/x).
// GitHub Pages has no redirect rules, so the previously indexed /posts/x/ addresses would
// start 404-ing. Duplicate each page as x/index.html: the old address answers 200 and its
// canonical already points back to the slashless one, so the twin never competes in search.
import { readdir, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, relative, dirname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://haiodo.github.io';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let copied = 0;

for (const f of await walk(DIST)) {
  if (extname(f) !== '.html') continue;
  const name = f.split('/').pop();
  if (name === 'index.html' || name === '404.html') continue;

  const twin = join(dirname(f), name.slice(0, -'.html'.length), 'index.html');
  await mkdir(dirname(twin), { recursive: true });
  await copyFile(f, twin);
  copied++;
  console.log(`  slash twin ${relative(DIST, twin)}`);
}

console.log(`slash-compat: ${copied} page(s) also reachable with a trailing slash`);

// trailingSlash: 'never' strips the slash off the bare origin as well, so the feeds
// would list the home page as "https://haiodo.github.io" while its canonical says
// ".../". Same resource after normalisation, but the mismatch reads as a bug in audits.
for (const feed of ['sitemap-0.xml', 'rss.xml']) {
  const p = join(DIST, feed);
  const before = await readFile(p, 'utf8').catch(() => null);
  if (before === null) continue;
  const after = before.replaceAll(`>${SITE}<`, `>${SITE}/<`);
  if (after !== before) {
    await writeFile(p, after);
    console.log(`  normalised home URL in ${feed}`);
  }
}
