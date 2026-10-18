// Run: node --test scripts/commits/commits.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Chart } from './chart.mjs';
import { parseCsv, toCsv } from './csv.mjs';
import { authorRe, classify, count, estimate, isBranchMerge, newPath, sizesByYear, sourceId, summarize } from './collect.mjs';
import { AUTHOR, PRIVATE_LABEL, PRIVATE_SUBJECT, withCheckouts } from './repos.mjs';
import { FLOOR, logHeight, logTicks } from './scale.mjs';

const fresh = () => ({ sha: new Map(), at: new Map(), pairs: new Map() });
const commit = (hash, at, subject, files = [[10, 0, 'a.ts']]) => ({
  hash: hash.padEnd(40, '0'), date: '2020-01-01', at, subject, files,
});
const source = (commits) => ({ commits, merges: [], generated: new Set() });
const kinds = (rows) => rows.map((r) => r.kind);

test('a rename counts against the new path', () => {
  assert.equal(newPath('src/{old => new}/a.ts'), 'src/new/a.ts');
  assert.equal(newPath('src/{old => }/a.ts'), 'src/a.ts');
  assert.equal(newPath('a.ts => b.ts'), 'b.ts');
});

test('lines split into lock, generated and code by path', () => {
  const n = count([[1, 2, 'pnpm-lock.yaml'], [3, 4, 'api/x.pb.go'], [5, 6, 'src/a.ts'], [7, 8, 'gen/y.go']], new Set(['gen/y.go']));
  assert.deepEqual(n, { added: 5, deleted: 6, gen_added: 10, gen_deleted: 12, lock_added: 1, lock_deleted: 2, files: 4 });
});

test('inside a project a duplicate has the same subject, numbers and author time, a listed hash is a move', () => {
  const project = { name: 'p', moves: ['bbb'] };
  const rows = classify(project, [source([commit('aaa', '1', 'Same'), commit('ccc', '1', 'Same'), commit('bbb', '3', 'Import')])], fresh(), []);
  assert.deepEqual(kinds(rows), ['work', 'move', 'duplicate']);
  // The same subject and numbers at another time are two commits.
  const apart = classify({ name: 'p' }, [source([commit('aaa', '1', 'Same'), commit('ccc', '2', 'Same')])], fresh(), []);
  assert.deepEqual(kinds(apart), ['work', 'work']);
  // A CVS conversion does not keep the time, so there the time is ignored.
  const cvs = classify({ name: 'p', cvs: true }, [source([commit('aaa', '1', 'Same'), commit('ccc', '2', 'Same')])], fresh(), []);
  assert.deepEqual(kinds(cvs).sort(), ['duplicate', 'work']);
});

test('a commit found in an earlier project is a duplicate there, by SHA or by author time and subject', () => {
  const shared = fresh();
  const up = classify({ name: 'up' }, [source([commit('aaa', '100', 'Fix'), commit('bbb', '200', 'Other')])], shared, []);
  const fork = classify(
    { name: 'fork' },
    [source([commit('bbb', '999', 'Renamed'), commit('ccc', '100', 'Fix'), commit('ddd', '300', 'Own')])],
    shared,
    [],
  );
  assert.deepEqual(kinds(up), ['work', 'work']);
  assert.deepEqual(kinds(fork), ['duplicate', 'duplicate', 'work']);
  assert.equal(shared.pairs.get('up\0fork').commits, 2);
});

test('a private project is labelled and loses hashes and subjects', () => {
  const shared = fresh();
  const rows = classify({ name: 'secret', private: true }, [source([commit('aaa', '1', 'Confidential')])], shared, []);
  assert.equal(rows[0].repo, PRIVATE_LABEL);
  assert.equal(rows[0].hash, '');
  assert.equal(rows[0].subject, PRIVATE_SUBJECT);
  assert.equal([...shared.sha.values()][0].project, PRIVATE_LABEL);
});

test("a move's lines stay out of the code totals", () => {
  const files = (added, deleted) => [[added, deleted, 'a.ts']];
  const commits = [commit('aaa', '1', 'Work', files(10, 2)), commit('bbb', '2', 'Import', files(500, 40))];
  const rows = classify({ name: 'p', moves: ['bbb'] }, [source(commits)], fresh(), []);
  const { totals } = summarize(rows, new Map(), [], []);
  assert.deepEqual([totals.commits, totals.moves, totals.commits_all], [1, 1, 2]);
  assert.deepEqual([totals.added, totals.deleted], [10, 2]);
  assert.deepEqual([totals.move_added, totals.move_deleted], [500, 40]);
});

test('CSV round trip keeps commas, quotes and newlines', () => {
  const rows = [{ a: 'x,y', b: 'say "hi"', c: 'two\nlines' }];
  assert.deepEqual(parseCsv(toCsv(['a', 'b', 'c'], rows)), rows);
});

const cvs = { name: 'cvs-project', cvs: true };
const at = (seconds) => String(1_200_000_000 + seconds);
const part = (hash, seconds, subject, lines = 10) => ({ ...commit(hash, at(seconds), subject), files: [[lines, 1, 'p/a.java']] });

test('cvs: parts with one subject, each within ten minutes of the previous, are one logical commit', () => {
  const parts = [
    part('aaa', 0, '* fix', 10),
    part('bbb', 500, '* fix', 11),
    part('ccc', 1000, '* fix', 12),
    part('ddd', 2000, '* fix', 13),
    part('eee', 100, '* other', 14),
  ];
  const rows = classify(cvs, [source(parts)], fresh(), []);
  const fix = rows.filter((r) => r.subject === '* fix');
  assert.equal(rows.length, 3);
  assert.deepEqual(fix.map((r) => r.parts).sort(), [1, 3]);
  const folded = fix.find((r) => r.parts === 3);
  assert.deepEqual([folded.hash, folded.at, folded.added, folded.deleted, folded.files], ['aaa0000000', at(0), 33, 3, 3]);
  const plain = classify({ name: 'git-project' }, [source(parts)], fresh(), []);
  assert.equal(plain.length, 5);
});

test('cvs: a subject that only reports a branch merge becomes a merge, a mixed one stays work', () => {
  for (const merge of ['* merge with HEAD', '*merges with HEAD', '* merge from 6.07.07', '* fixes from HEAD']) {
    assert.equal(isBranchMerge(merge), true, merge);
  }
  for (const work of ['* merge with HEAD. * Improved script builder', '* Merge Tcl completion computers * Fixed display', '* lazy file handle merged']) {
    assert.equal(isBranchMerge(work), false, work);
  }
  const rows = classify(cvs, [source([part('aaa', 0, '* merge with HEAD', 40), part('bbb', 5000, '* merge with HEAD. * Improved builder', 40)])], fresh(), []);
  const [pure, mixed] = rows.sort((a, b) => (a.hash < b.hash ? -1 : 1));
  assert.deepEqual([pure.kind, pure.added, pure.files], ['merge', 0, 0]);
  assert.deepEqual(pure.dropped, { added: 40, deleted: 1 });
  assert.equal(mixed.kind, 'work');
  assert.equal(summarize(rows, new Map(), [], []).excluded.cvs_merges.added, 40);
});

test('cvs: converter stubs are dropped from the rows and counted in the summary', () => {
  const stub = part('aaa', 0, 'file A.java was added on branch R1_0 on 2008-01-01 00:00:00 +0000', 0);
  const real = part('bbb', 9000, '* real change', 5);
  const rows = classify(cvs, [source([stub, real])], fresh(), []);
  assert.deepEqual(rows.map((r) => r.kind).sort(), ['artifact', 'work']);
  assert.equal(summarize(rows, new Map(), [], []).excluded.cvs_artifacts.commits, 1);
  assert.deepEqual(classify({ name: 'git-project' }, [source([stub])], fresh(), []).map((r) => r.kind), ['work']);
});

const made = (repo, year, n, kind = 'work', size = 1) =>
  Array.from({ length: n }, () => ({ repo, kind, date: `${year}-06-01`, added: size, deleted: 0 }));

test('estimate: era averages, their mean, the floor at zero and the range', () => {
  const rows = [
    ...made('A', 2001, 2), ...made('A', 2002, 3), ...made('A', 2002, 1, 'move'),
    ...made('B', 2003, 8), ...made('B', 2004, 10),
    ...made('C', 2010, 4), ...made('C', 2011, 10),
  ];
  // Narrowed to the rows of one project each.
  const config = {
    fullTime: [{ name: 'a', projects: ['A'], years: [2001, 2002] }, { name: 'b', projects: ['B'], years: [2003, 2004] }],
    hidden: [2010, 2011],
  };
  const e = estimate(rows, config);
  assert.deepEqual(e.eras.map((p) => p.average), [3, 9]);
  assert.deepEqual([e.low, e.average, e.high], [3, 6, 9]);
  assert.deepEqual(e.years[2010], { visible: 4, mid: 2, low: 0, high: 5 });
  assert.deepEqual(e.years[2011], { visible: 10, mid: 0, low: 0, high: 0 });
  assert.deepEqual(e.totals, { mid: 2, low: 0, high: 5 });
  assert.match(e.note, /low and high .* not an uncertainty range/);

  // Without a filter an era counts every visible commit of its years, whatever the row.
  const wide = estimate([...rows, ...made('C', 2001, 5), ...made('C', 2003, 1)], {
    fullTime: [{ name: 'a', years: [2001, 2002] }, { name: 'b', years: [2003, 2004] }],
    hidden: [2010, 2011],
  });
  assert.deepEqual(wide.eras.map((p) => p.average), [5.5, 9.5]);
  assert.deepEqual([wide.low, wide.average, wide.high], [5.5, 7.5, 9.5]);
  assert.deepEqual(wide.years[2010], { visible: 4, mid: 3.5, low: 1.5, high: 5.5 });
});

test('source ids: a url gives owner and repo, a lone checkout the project, equal folder names get the index', () => {
  const dirs = (...d) => d.map((dir) => ({ dir }));
  assert.equal(sourceId({ name: 'p', sources: [{ url: 'https://github.com/o/r' }] }, { url: 'https://github.com/o/r' }, 0), 'o__r');
  assert.equal(sourceId({ name: 'p', sources: dirs('/a/x') }, { dir: '/a/x' }, 0), 'p');
  const two = { name: 'p', sources: dirs('/a/x', '/b/x', '/b/y') };
  assert.deepEqual(two.sources.map((s, i) => sourceId(two, s, i)), ['p__x', 'p__x_1', 'p__y']);
});

test('sizes by year: quantiles of work commits, moves and merges left out', () => {
  const rows = [
    ...[1, 2, 3, 4, 10].flatMap((size) => made('p', 2020, 1, 'work', size)),
    ...made('p', 2020, 1, 'move', 5000), ...made('p', 2020, 1, 'merge', 0),
    ...made('p', 2021, 1, 'work', 5),
  ];
  const sizes = sizesByYear(rows);
  assert.deepEqual(sizes[2020], { count: 5, median: 3, p25: 2, p75: 4, mean: 4 });
  assert.deepEqual(sizes[2021], { count: 1, median: 5, p25: 5, p75: 5, mean: 5 });
});

test('log scale: no bar up to the floor, one decade per tenfold, ticks to the first power of ten above the data', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
  for (const v of [0, 1, FLOOR - 1, FLOOR]) assert.equal(logHeight(v, FLOOR, 28), 0);
  assert.ok(logHeight(FLOOR + 1, FLOOR, 28) > 0);
  near(logHeight(FLOOR * 10, FLOOR, 28), 28);
  near(logHeight(FLOOR * 1e4, FLOOR, 28), 112);
  near(logHeight(FLOOR * Math.sqrt(10), FLOOR, 28), 14);
  assert.deepEqual(logTicks(FLOOR, 643933), [100, 1000, 10000, 100000, 1000000]);
  assert.deepEqual(logTicks(FLOOR, 100000), [100, 1000, 10000, 100000]);
  assert.deepEqual(logTicks(FLOOR, 0), [100, 1000]);
});

test('author regex: a listed name with any email, a listed email with any name, no bare first name', () => {
  const extra = new RegExp(authorRe({ names: ['Test Person'], emails: ['t.person@example.org'] }));
  const configured = AUTHOR.names.map((name) => `${name} <any@host.org>`);
  for (const who of ['Test Person <any@host.org>', 'Anyone <t.person@example.org>', ...configured]) {
    assert.ok(extra.test(who), who);
  }
  for (const who of ['Test <any@host.org>', 'Other Person <o@host.org>', 'Test Personal <o@host.org>', 'Anyone <tXperson@example.org>']) {
    assert.ok(!extra.test(who), who);
  }
  assert.ok(!new RegExp(authorRe()).test('Test Person <any@host.org>'));
});

test('chart check: a label on the dashed line, on another label or outside the viewBox fails the render', () => {
  const drawn = (labelY) => {
    const c = new Chart('t');
    c.dashed(10, 600, 100);
    c.text(300, labelY, '380', { size: 12, anchor: 'middle' });
    return c.render(200, 't', 'd');
  };
  assert.throws(() => drawn(100), /"dashed line" overlaps "380"/);
  assert.ok(drawn(80).startsWith('<svg'));
  const twice = new Chart('t');
  twice.text(10, 20, 'aaa');
  twice.text(12, 22, 'bbb');
  assert.throws(() => twice.render(100, 't', 'd'), /overlaps/);
  const wide = new Chart('t');
  wide.text(630, 20, 'long text');
  assert.throws(() => wide.render(100, 't', 'd'), /leaves the viewBox/);
});

test('private checkouts go to the project of that name, an unknown name stops the run', () => {
  const projects = [{ name: 'a', sources: [{ dir: '/x' }] }, { name: 'b', sources: [{ dir: '/y' }] }];
  const [first, plain, optional] = withCheckouts(projects, { a: ['/z', { dir: '/w', optional: true }] })[0].sources;
  assert.equal(first.dir, '/x');
  assert.deepEqual([plain.dir, plain.refs.includes('--all'), plain.optional], ['/z', true, undefined]);
  assert.deepEqual([optional.dir, optional.optional], ['/w', true]);
  assert.equal(withCheckouts(projects, {})[1].sources.length, 1);
  assert.throws(() => withCheckouts(projects, { c: ['/q'] }), /do not exist: c/);
});

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const withData = (dir) => ({ env: { ...process.env, COMMITS_DATA_DIR: dir }, encoding: 'utf8' });

test('a run without a personal config stops and names the expected file and the example', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'commits-config-'));
  for (const script of ['collect', 'github', 'charts']) {
    const run = spawnSync(process.execPath, [here(`${script}.mjs`)], withData(dir));
    assert.equal(run.status, 1, script);
    assert.ok(run.stderr.includes(path.join(dir, 'config.mjs')), script);
    assert.ok(run.stderr.includes('config.example.mjs'), script);
  }
});

test('the example config loads and builds its projects', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'commits-config-'));
  copyFileSync(here('config.example.mjs'), path.join(dir, 'config.mjs'));
  const load = `const m = await import(${JSON.stringify(pathToFileURL(here('repos.mjs')).href)});
    console.log(JSON.stringify({ projects: m.PROJECTS.map((p) => p.name), login: m.GITHUB_LOGIN }));`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', load], withData(dir));
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), { projects: ['hello'], login: 'octocat' });
});
