#!/usr/bin/env node
// Exports the author's commits per project, classifies them, writes commits.csv and summary.json.
// Flags --no-fetch, --reuse-raw, --big and --relations: see README.md.
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parseCsv, toCsv } from './csv.mjs';
import {
  AUTHOR, CVS_WINDOW, DATA_DIR, ESTIMATE, GENERATED_FILES, GROUPS, LOCK_FILES, MARKS, PRIVATE_LABEL, PRIVATE_SUBJECT, PROJECTS,
} from './repos.mjs';

const sh = promisify(execFile);
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const num = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : fallback;
};

const RAW_DIR = path.join(DATA_DIR, 'raw');
const CSV_PATH = path.join(DATA_DIR, 'commits.csv');
const SUMMARY_PATH = path.join(DATA_DIR, 'summary.json');
const RELATIONS_PATH = path.join(DATA_DIR, 'relations.json');
const CONCURRENCY = 6;
const COLUMNS = [
  'repo', 'date', 'at', 'month', 'hash', 'subject', 'kind', 'added', 'deleted',
  'gen_added', 'gen_deleted', 'lock_added', 'lock_deleted', 'files',
];

const LOCK = LOCK_FILES;
const GEN = new RegExp(GENERATED_FILES.map((r) => r.source).join('|'), 'i');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Matched against "Name <email>": a listed name with any email, or a listed email with any name.
// `extra` adds the identities of one private project; a bare first name never matches.
function authorRe(extra) {
  const names = [...AUTHOR.names, ...(extra?.names ?? [])];
  const emails = [...AUTHOR.emails, ...(extra?.emails ?? [])];
  return `^(${names.map(escapeRe).join('|')}) <|<(${emails.map(escapeRe).join('|')})>$`;
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const splitLines = (text) => text.split(/\r\n|\r|\n/);
const secs = (t) => ((Date.now() - t) / 1000).toFixed(1);

// The raw file name of a source. Two local checkouts of one project can share a folder name:
// the later one gets its index.
function sourceId(project, s, i) {
  if (s.url) return s.url.split('/').slice(-2).join('__');
  if (project.sources.length === 1) return project.name;
  const name = path.basename(s.dir);
  const first = project.sources.findIndex((o) => !o.url && path.basename(o.dir) === name);
  return `${project.name}__${name}${first === i ? '' : `_${i}`}`;
}

// One entry per git directory; a project can have several.
// An optional one that is absent is skipped.
const SOURCES = PROJECTS.flatMap((p) =>
  p.sources
    .map((s, i) => ({
      ...s,
      project: p.name,
      private: p.private,
      partial: p.partial,
      authors: p.private ? p.authors : undefined,
      id: sourceId(p, s, i),
    }))
    .filter((s) => !s.optional || existsSync(path.join(s.dir, '.git'))),
);
const clash = SOURCES.find((s, i) => SOURCES.findIndex((o) => o.id === s.id) !== i);
if (clash) throw new Error(`two sources share the raw file name ${clash.id}`);
const rawPath = (src, ext) => path.join(RAW_DIR, `${src.id}.${ext}`);
const label = (src) => (src.private ? PRIVATE_LABEL : src.id);
const projectLabel = (src) => (src.private ? PRIVATE_LABEL : src.project);
const hideDir = (text, src) => (src.private ? text.replaceAll(src.dir, '<private>') : text);
const cloned = (src) => existsSync(path.join(src.dir, '.git'));

const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' };

async function git(dir, gitArgs, okCodes = []) {
  try {
    return (await sh('git', ['-C', dir, '-c', 'core.quotePath=false', ...gitArgs], { maxBuffer: 1 << 30, env })).stdout;
  } catch (e) {
    if (okCodes.includes(e.code)) return e.stdout;
    throw new Error(`git ${gitArgs[0]}: ${String(e.stderr || e.message).trim().split('\n').pop()}`);
  }
}

// Branches arrive as origin/*; the checked out branch is never moved.
async function syncClone(src) {
  if (cloned(src)) return git(src.dir, ['fetch', '--quiet', '--prune', 'origin']);
  await mkdir(path.dirname(src.dir), { recursive: true });
  const filter = src.partial ? ['--filter=blob:none'] : [];
  await sh('git', ['clone', '--quiet', ...filter, src.url, src.dir], { env });
}

async function exportSource(src) {
  const base = ['log', ...src.refs, '-E', `--author=${authorRe(src.authors)}`, '-M', '--date=short', '--format=@@%H|%ad|%at|%aE|%s'];
  const numstat = await git(src.dir, [...base, '--no-merges', '--numstat']);
  const merges = await git(src.dir, [...base, '--merges']);
  let generated = '';
  if (/^\d+\t\d+\t.*\.go$/m.test(numstat)) {
    const found = await git(
      src.dir,
      ['grep', '-l', '-E', '^// Code generated .* DO NOT EDIT', 'HEAD', '--', '*.go'],
      [1],
    );
    generated = splitLines(found).filter(Boolean).map((l) => l.replace(/^HEAD:/, '')).join('\n');
  }
  await mkdir(RAW_DIR, { recursive: true });
  await Promise.all([
    writeFile(rawPath(src, 'numstat'), numstat),
    writeFile(rawPath(src, 'merges'), merges),
    writeFile(rawPath(src, 'generated'), generated),
  ]);
  return generated ? generated.split('\n').length : 0;
}

async function fetchAndExport(src) {
  if (!src.url && !cloned(src)) throw new Error(`no checkout at ${src.dir}`);
  if (src.url && !has('no-fetch')) await syncClone(src);
  else if (src.url && !cloned(src)) throw new Error('not cloned yet, run without --no-fetch');
  return exportSource(src);
}

async function withRetry(fn, attempts = 2) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
    }
  }
}

async function pool(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function header(line) {
  const [hash, date, at, , ...subject] = line.slice(2).split('|');
  return { hash, date, at, subject: subject.join('|') };
}

// A rename counts against the new path.
function newPath(f) {
  if (!f.includes('=>')) return f;
  return f.replace(/\{[^}]*=> ([^}]*)\}/g, '$1').replaceAll('//', '/').split(' => ').at(-1);
}

function parseNumstat(text) {
  const commits = [];
  let cur = null;
  for (const line of splitLines(text)) {
    if (line.startsWith('@@')) {
      cur = { ...header(line), files: [] };
      commits.push(cur);
      continue;
    }
    const p = line.split('\t');
    if (!cur || p.length < 3 || !/^\d+$/.test(p[0])) continue; // binary files print "-"
    cur.files.push([Number(p[0]), Number(p[1]), newPath(p[2])]);
  }
  return commits;
}

const parseMerges = (text) => splitLines(text).filter((l) => l.startsWith('@@')).map(header);

async function readRaw(src) {
  const [numstat, merges, generated] = await Promise.all(
    ['numstat', 'merges', 'generated'].map((ext) => readFile(rawPath(src, ext), 'utf8')),
  );
  return {
    dir: src.dir,
    commits: parseNumstat(numstat),
    merges: parseMerges(merges),
    generated: new Set(splitLines(generated).map((l) => l.trim()).filter(Boolean)),
  };
}

function count(files, generated, extra = null) {
  const n = { added: 0, deleted: 0, gen_added: 0, gen_deleted: 0, lock_added: 0, lock_deleted: 0, files: 0 };
  for (const [a, d, f] of files) {
    n.files++;
    if (LOCK.test(f)) {
      n.lock_added += a;
      n.lock_deleted += d;
    } else if (GEN.test(f) || extra?.test(f) || generated.has(f)) {
      n.gen_added += a;
      n.gen_deleted += d;
    } else {
      n.added += a;
      n.deleted += d;
    }
  }
  return n;
}

const makeRow = (repo, c, kind, n) => ({
  repo, date: c.date, at: c.at, month: c.date.slice(0, 7), hash: c.hash.slice(0, 10), subject: c.subject, kind, ...n,
  sha: c.hash, parts: 1, members: [{ sha: c.hash, dir: c.dir, date: c.date }],
});
const NO_LINES = { added: 0, deleted: 0, gen_added: 0, gen_deleted: 0, lock_added: 0, lock_deleted: 0, files: 0 };
const numbers = (r) => [r.added, r.deleted, r.gen_added, r.gen_deleted, r.lock_added, r.lock_deleted].join(',');
const atKey = (r) => `${r.at}\0${r.subject}`;

// Same SHA, or same author timestamp and subject, in an earlier project: this one is a copy.
const crossHit = (shared, r) => shared.sha.get(r.sha) ?? shared.at.get(atKey(r));

function recordPair(shared, project, r, merge) {
  const key = `${r.hit.project}\0${project}`;
  const p = shared.pairs.get(key) ?? {
    kept: r.hit.project, dropped: project, commits: 0, merges: 0, same_numbers: 0, added: 0, deleted: 0,
  };
  shared.pairs.set(key, p);
  if (merge) p.merges++;
  else {
    p.commits++;
    p.added += r.added;
    p.deleted += r.deleted;
    if (r.hit.nums === numbers(r)) p.same_numbers++;
  }
}

const HEADER_SUBJECT = /\bheaders?\b|copyright|\bEPL\b|licen[cs]e/i;
const SUMMED = ['added', 'deleted', 'gen_added', 'gen_deleted', 'lock_added', 'lock_deleted', 'files'];

// Eclipse's CVS client commits each plugin on its own: parts with one subject, every one within ten
// minutes of the previous one, make one logical commit with the first part's hash, date and time.
function foldCvs(rows) {
  const groups = [];
  const open = new Map();
  for (const r of [...rows].sort((a, b) => Number(a.at) - Number(b.at) || cmp(a.hash, b.hash))) {
    const g = open.get(r.subject);
    if (g && Number(r.at) - Number(g.last) <= CVS_WINDOW) {
      g.parts.push(r);
      g.last = r.at;
    } else {
      const fresh = { parts: [r], last: r.at };
      groups.push(fresh);
      open.set(r.subject, fresh);
    }
  }
  return groups.map(({ parts }) => {
    if (parts.length === 1) return parts[0];
    const row = { ...parts[0], parts: parts.length, members: parts.flatMap((p) => p.members) };
    if (parts.some((p) => p.kind === 'move')) row.kind = 'move';
    for (const f of SUMMED) row[f] = parts.reduce((sum, p) => sum + p[f], 0);
    return row;
  });
}

// The CVS-to-git converter writes these for a file first added on a branch; nobody typed them.
const CONVERTER_STUB = /^file \S+ was (?:initially )?added on branch \S+/;

// A subject that only reports a branch merge, one item: "* merge with HEAD" or "* fixes from HEAD".
// A subject with other items ("* merge ... * fix ...") is work.
function isBranchMerge(subject) {
  const text = subject.replace(/^[\s*+-]+/, '');
  if (text.includes('*')) return false;
  return /\bmerg(?:e|es|ed|ing)\b.*\b(?:head|branch|trunk|\d+\.\d+\.\d+)\b|\b(?:from|with)\s+head\b/i.test(text);
}

// Sources are united by SHA; each commit becomes merge, duplicate, move or work.
function classify(project, parsed, shared, warnings) {
  const name = project.private ? PRIVATE_LABEL : project.name;
  const label = project.private ? PRIVATE_LABEL : GROUPS[project.group]?.label ?? project.name;
  const extra = project.generated?.length ? new RegExp(project.generated.map((g) => g.source).join('|'), 'i') : null;
  const commits = new Map();
  const merges = new Map();
  const generated = new Set();
  for (const s of parsed) {
    for (const c of s.commits) if (!commits.has(c.hash)) commits.set(c.hash, { ...c, dir: s.dir });
    for (const m of s.merges) if (!merges.has(m.hash)) merges.set(m.hash, { ...m, dir: s.dir });
    for (const f of s.generated) generated.add(f);
  }
  const all = [...commits.values()]
    .map((c) => makeRow(label, c, 'work', count(c.files, generated, extra)))
    .sort((a, b) => cmp(a.date, b.date) || cmp(a.hash, b.hash));
  const stubs = project.cvs ? all.filter((r) => CONVERTER_STUB.test(r.subject)) : [];
  for (const r of stubs) r.kind = 'artifact';
  const work = project.cvs ? all.filter((r) => r.kind !== 'artifact') : all;
  const mergeRows = [...merges.values()].map((c) => makeRow(label, c, 'merge', NO_LINES));
  const seen = new Set();
  for (const r of work) {
    if (project.cvs && r.files === 0 && isBranchMerge(r.subject)) {
      r.kind = 'merge';
      r.hit = crossHit(shared, r);
      continue;
    }
    // A copy keeps its author time. The CVS conversion does not: there subject and numbers decide.
    const key = `${r.subject}\0${numbers(r)}${project.cvs ? '' : `\0${r.at}`}`;
    const repeated = seen.has(key);
    seen.add(key);
    r.hit = crossHit(shared, r);
    if (r.hit || repeated) r.kind = 'duplicate';
    else if (project.moves?.some((m) => r.hash.startsWith(m))) r.kind = 'move';
  }
  for (const m of project.moves ?? []) {
    if (!work.some((r) => r.hash.startsWith(m))) warnings.push(`${name}: ${project.private ? 'a listed move' : `move ${m}`} is not in the export`);
  }
  for (const r of mergeRows) {
    r.hit = crossHit(shared, r);
    if (r.hit) r.kind = 'duplicate';
  }
  // Register only now, so commits of one project never hit each other here.
  for (const [list, merge] of [[work, false], [mergeRows, true]]) {
    for (const r of list) {
      if (r.hit) recordPair(shared, name, r, merge);
      const entry = r.hit ?? { project: name, nums: numbers(r) };
      if (!shared.sha.has(r.sha)) shared.sha.set(r.sha, entry);
      if (!shared.at.has(atKey(r))) shared.at.set(atKey(r), entry);
    }
  }
  let kept = work;
  if (project.cvs) {
    const live = work.filter((r) => r.kind === 'work' || r.kind === 'move');
    kept = [...work.filter((r) => r.kind === 'duplicate' || r.kind === 'merge'), ...foldCvs(live)];
    for (const r of kept) {
      if (r.kind !== 'work' || !isBranchMerge(r.subject)) continue;
      r.dropped = { added: r.added, deleted: r.deleted };
      r.kind = 'merge';
      for (const f of SUMMED) r[f] = 0;
    }
  }
  const rows = [...kept, ...mergeRows, ...stubs];
  for (const r of rows) {
    r.header = HEADER_SUBJECT.test(r.subject);
    if (!project.private) r.member = project.name;
    delete r.sha;
    delete r.hit;
    if (project.private) Object.assign(r, { hash: '', subject: PRIVATE_SUBJECT });
  }
  return rows;
}

const bucket = () => ({
  commits: 0, moves: 0, commits_all: 0, duplicates: 0, merges: 0, cvs_parts: 0, cvs_artifacts: 0,
  added: 0, deleted: 0, move_added: 0, move_deleted: 0, added_all: 0, deleted_all: 0,
  gen_added: 0, gen_deleted: 0, lock_added: 0, lock_deleted: 0,
});

// `commits`, `added`, `deleted`, gen and lock count work only, moves keep their lines in `move_*`;
// `commits_all` and the `_all` lines add them back.
function add(b, r) {
  b.cvs_parts += r.parts - 1;
  if (r.kind === 'artifact') b.cvs_artifacts++;
  else if (r.kind === 'merge') b.merges++;
  else if (r.kind === 'duplicate') b.duplicates++;
  else {
    b.commits_all++;
    b.added_all += r.added;
    b.deleted_all += r.deleted;
    if (r.kind === 'move') {
      b.moves++;
      b.move_added += r.added;
      b.move_deleted += r.deleted;
    } else {
      b.commits++;
      b.added += r.added;
      b.deleted += r.deleted;
      b.gen_added += r.gen_added;
      b.gen_deleted += r.gen_deleted;
      b.lock_added += r.lock_added;
      b.lock_deleted += r.lock_deleted;
    }
  }
}

const allLines = () => ({
  commits: 0, added: 0, deleted: 0, gen_added: 0, gen_deleted: 0, lock_added: 0, lock_deleted: 0,
});

const round1 = (n) => Math.round(n * 10) / 10;

// Mean visible commits a year in each full-time era; the years in between, whose history is closed,
// get what is missing from the commits visible that year (never below zero). An era counts every
// visible commit, like the bars of the chart, unless it names `groups` or `projects`.
function estimate(rows, config) {
  if (!config?.fullTime?.length) return null;
  const counted = rows.filter((r) => r.kind === 'work' || r.kind === 'move');
  const yearOf = (r) => Number(r.date.slice(0, 4));
  const visible = new Map();
  for (const r of counted) visible.set(yearOf(r), (visible.get(yearOf(r)) ?? 0) + 1);
  const eras = config.fullTime.map((p) => {
    const labels = new Set([...(p.groups ?? []).map((g) => GROUPS[g].label), ...(p.projects ?? [])]);
    const [from, to] = p.years;
    const commits = Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, 0]));
    for (const r of counted) if ((!labels.size || labels.has(r.repo)) && yearOf(r) in commits) commits[yearOf(r)]++;
    const average = Object.values(commits).reduce((sum, n) => sum + n, 0) / (to - from + 1);
    return { name: p.name, labels: [...labels], years: p.years, commits, average };
  });
  const averages = eras.map((p) => p.average);
  const level = { mid: averages.reduce((sum, a) => sum + a, 0) / averages.length, low: Math.min(...averages), high: Math.max(...averages) };
  const [first, last] = config.hidden;
  const years = {};
  const totals = { mid: 0, low: 0, high: 0 };
  for (let y = first; y <= last; y++) {
    years[y] = { visible: visible.get(y) ?? 0 };
    for (const k of Object.keys(level)) {
      const value = Math.max(0, level[k] - years[y].visible);
      years[y][k] = round1(value);
      totals[k] += value;
    }
  }
  return {
    definitions: {
      fullTime: eras.map(({ name, labels, years: span }) => ({ name, labels, years: span })),
      hidden: config.hidden,
      formula: 'average = mean visible commits a year over the years of an era (all rows, or only the listed groups and projects); mid = mean of the era averages, low and high = the lower and the higher one; estimate(year) = max(0, level - visible commits of that year)',
    },
    eras: eras.map((p) => ({ ...p, average: round1(p.average) })),
    average: round1(level.mid),
    low: round1(level.low),
    high: round1(level.high),
    note: 'low and high are the lower and the higher era mean, kept for transparency. They are not an uncertainty range: eras that happen to agree make it narrow, so the chart shows only mid.',
    years,
    totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round1(v)])),
  };
}

// Linear interpolation between the order statistics of a sorted list.
function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Size of a work commit: changed code lines, no generated or lock lines; moves are imported code.
function sizesByYear(rows) {
  const by = {};
  for (const r of rows) if (r.kind === 'work') (by[r.date.slice(0, 4)] ??= []).push(r.added + r.deleted);
  return Object.fromEntries(
    Object.entries(by)
      .sort(([a], [b]) => cmp(a, b))
      .map(([y, list]) => {
        list.sort((a, b) => a - b);
        const mean = list.reduce((sum, n) => sum + n, 0) / list.length;
        return [y, { count: list.length, median: round1(quantile(list, 0.5)), p25: round1(quantile(list, 0.25)), p75: round1(quantile(list, 0.75)), mean: round1(mean) }];
      }),
  );
}

function summarize(rows, pairs, failures, warnings) {
  const totals = bucket();
  const membersOf = new Map();
  const projects = new Map();
  const years = {};
  const quarters = {};
  const activeMonths = new Set();
  const excluded = { merges: 0, duplicates: allLines(), moves: allLines(), cvs_merges: { commits: 0, added: 0, deleted: 0 }, cvs_artifacts: { commits: 0, added: 0, deleted: 0 } };
  for (const r of rows) {
    const year = r.date.slice(0, 4);
    const quarter = `${year}-Q${Math.ceil(Number(r.date.slice(5, 7)) / 3)}`;
    const p = projects.get(r.repo) ?? { name: r.repo, ...bucket(), first: null, last: null };
    projects.set(r.repo, p);
    years[year] ??= bucket();
    quarters[quarter] ??= bucket();
    let m = null;
    if (r.member) {
      const group = membersOf.get(r.repo) ?? membersOf.set(r.repo, new Map()).get(r.repo);
      m = group.get(r.member) ?? group.set(r.member, { name: r.member, ...bucket(), first: null, last: null }).get(r.member);
    }
    for (const b of [totals, p, m, years[year], quarters[quarter]]) if (b) add(b, r);
    if (r.kind === 'artifact') {
      excluded.cvs_artifacts.commits++;
      excluded.cvs_artifacts.added += r.added;
      excluded.cvs_artifacts.deleted += r.deleted;
    }
    if (r.kind === 'merge') excluded.merges++;
    if (r.dropped) {
      excluded.cvs_merges.commits++;
      excluded.cvs_merges.added += r.dropped.added;
      excluded.cvs_merges.deleted += r.dropped.deleted;
    }
    const side = { duplicate: excluded.duplicates, move: excluded.moves }[r.kind];
    if (side) {
      side.commits++;
      for (const k of Object.keys(side)) if (k !== 'commits') side[k] += r[k];
    }
    if (r.kind === 'work' || r.kind === 'move') {
      activeMonths.add(r.month);
      for (const b of [p, m]) {
        if (!b) continue;
        if (!b.first || r.date < b.first) b.first = r.date;
        if (!b.last || r.date > b.last) b.last = r.date;
      }
    }
  }
  for (const p of projects.values()) {
    const group = membersOf.get(p.name);
    if (group && [...group.keys()].some((k) => k !== p.name)) {
      p.members = [...group.values()].sort((a, b) => cmp(a.first ?? '9999', b.first ?? '9999') || cmp(a.name, b.name));
    }
    const marks = MARKS.filter((mark) => GROUPS[mark.group]?.label === p.name).map(({ date, label }) => ({ date, label }));
    if (marks.length) p.marks = marks;
  }
  const list = [...projects.values()].sort((a, b) => cmp(a.first ?? '9999', b.first ?? '9999') || cmp(a.name, b.name));
  const dated = list.filter((p) => p.first);
  const first = dated.reduce((m, p) => (p.first < m ? p.first : m), '9999');
  const last = dated.reduce((m, p) => (p.last > m ? p.last : m), '');
  const monthIndex = (d) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
  const crossDuplicates = [...pairs.values()].sort((a, b) => b.commits + b.merges - (a.commits + a.merges));
  excluded.cvs_parts = totals.cvs_parts;
  excluded.generated = { added: totals.gen_added, deleted: totals.gen_deleted };
  excluded.lock = { added: totals.lock_added, deleted: totals.lock_deleted };
  excluded.cross_project = crossDuplicates.reduce(
    (s, p) => {
      for (const k of Object.keys(s)) s[k] += p[k];
      return s;
    },
    { commits: 0, merges: 0, same_numbers: 0, added: 0, deleted: 0 },
  );
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    totals: {
      rows: rows.length,
      ...totals,
      first,
      last,
      months_span: monthIndex(last) - monthIndex(first) + 1,
      months_active: activeMonths.size,
      projects: list.length,
    },
    excluded,
    estimate: estimate(rows, ESTIMATE),
    sizes: sizesByYear(rows),
    projects: list,
    years: Object.fromEntries(Object.entries(years).sort(([a], [b]) => cmp(a, b))),
    quarters: Object.fromEntries(Object.entries(quarters).sort(([a], [b]) => cmp(a, b))),
    crossDuplicates,
    failures,
    warnings,
  };
}

function printSummary(s) {
  const n = (v, w) => String(v).padStart(w);
  const t = s.totals;
  const fields = ['commits', 'moves', 'duplicates', 'merges', 'added', 'deleted', 'move_added', 'move_deleted'];
  const line = (name, period, b) =>
    `${name.padEnd(24)} ${period.padEnd(23)} ${n(b.commits, 5)} ${n(b.moves, 3)} ${n(b.duplicates, 4)} ${n(b.merges, 4)} ${n(b.added, 8)} ${n(b.deleted, 8)} ${n(b.move_added, 8)} ${n(b.move_deleted, 8)}`;
  console.log(`\n${'project'.padEnd(24)} ${'period'.padEnd(23)} ${n('work', 5)} ${n('mv', 3)} ${n('dup', 4)} ${n('mrg', 4)} ${n('+code', 8)} ${n('-code', 8)} ${n('+move', 8)} ${n('-move', 8)}`);
  const small = s.projects.filter((p) => p.commits < 20);
  for (const p of s.projects.filter((x) => x.commits >= 20)) console.log(line(p.name, `${p.first}..${p.last}`, p));
  const rest = Object.fromEntries(fields.map((f) => [f, small.reduce((sum, p) => sum + p[f], 0)]));
  console.log(line(`(${small.length} smaller projects)`, '', rest));
  console.log(line('TOTAL', `${t.first}..${t.last}`, t));
  console.log(`excluded: gen +${t.gen_added}/-${t.gen_deleted}, lock +${t.lock_added}/-${t.lock_deleted}; commits with moves ${t.commits_all}; months ${t.months_active} active of ${t.months_span}`);
  console.log(`\n${'year'.padEnd(6)} ${n('work', 5)} ${n('mv', 3)} ${n('+code', 8)} ${n('-code', 8)} ${n('+move', 8)} ${n('-move', 8)}`);
  for (const [y, b] of Object.entries(s.years)) {
    console.log(`${y.padEnd(6)} ${n(b.commits, 5)} ${n(b.moves, 3)} ${n(b.added, 8)} ${n(b.deleted, 8)} ${n(b.move_added, 8)} ${n(b.move_deleted, 8)}`);
  }
  const x = s.excluded.cross_project;
  console.log(`\ncross-project duplicates: ${x.commits} commits (${x.same_numbers} with the same numbers) and ${x.merges} merges, +${x.added}/-${x.deleted} dropped`);
  console.log(`${'kept in'.padEnd(24)} ${'dropped from'.padEnd(24)} ${n('commits', 7)} ${n('merges', 6)} ${n('same', 5)} ${n('+code', 8)} ${n('-code', 8)}`);
  for (const p of s.crossDuplicates.slice(0, 30)) {
    console.log(`${p.kept.padEnd(24)} ${p.dropped.padEnd(24)} ${n(p.commits, 7)} ${n(p.merges, 6)} ${n(p.same_numbers, 5)} ${n(p.added, 8)} ${n(p.deleted, 8)}`);
  }
  for (const w of s.warnings) console.log(`warning: ${w}`);
  for (const f of s.failures) console.log(`FAILED ${f.source}: ${f.error}`);
}

const rawSources = () => new Set(SOURCES.filter((s) => existsSync(rawPath(s, 'numstat'))).map((s) => s.id));

async function listBig() {
  const minLines = num('min-lines', 15000);
  const minFiles = num('min-files', 500);
  const names = args.filter((a) => !a.startsWith('--'));
  const { rows } = await classifyAll(rawSources(), []);
  const size = (r) => r.added + r.deleted;
  const big = rows.filter(
    (r) => r.kind !== 'merge' && (!names.length || names.includes(r.repo) || names.includes(r.member)) && (size(r) >= minLines || r.files >= minFiles),
  );
  const order = new Map(PROJECTS.map((p, i) => [p.name, i]));
  const place = (r) => order.get(r.member) ?? order.get(r.repo) ?? order.size;
  big.sort((a, b) => place(a) - place(b) || size(b) - size(a));
  console.log(`commits with code lines >= ${minLines} or files >= ${minFiles}: ${big.length}`);
  for (const r of big) {
    console.log(
      [
        (r.member ?? r.repo).padEnd(18), r.date, r.hash.padEnd(10), r.kind.padEnd(9),
        `+${r.added}/-${r.deleted}`.padEnd(16), `gen+${r.gen_added}`.padEnd(10), `lock+${r.lock_added}`.padEnd(10),
        `f${r.files}`.padEnd(6), r.subject.slice(0, 70),
      ].join(' '),
    );
  }
}

// Reads the given blobs through one `git cat-file --batch`; a missing object comes back as null.
function catFiles(dir, specs) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', dir, 'cat-file', '--batch'], { env, stdio: ['pipe', 'pipe', 'ignore'] });
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.on('error', reject);
    child.on('close', () => {
      const buf = Buffer.concat(chunks);
      const out = new Map();
      let pos = 0;
      for (const spec of specs) {
        const eol = buf.indexOf(10, pos);
        const head = buf.toString('utf8', pos, eol);
        if (head.endsWith(' missing')) {
          out.set(spec, null);
          pos = eol + 1;
        } else {
          const size = Number(head.split(' ')[2]);
          out.set(spec, buf.toString('utf8', eol + 1, eol + 1 + size));
          pos = eol + 1 + size + 1;
        }
      }
      resolve(out);
    });
    child.stdin.end(`${specs.join('\n')}\n`);
  });
}

// Last line of the leading comment of a file: a block comment, or a run of // or # lines.
function headerEnd(text) {
  const lines = splitLines(text);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (lines[i]?.startsWith('<?xml')) {
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  const first = lines[i]?.trim() ?? '';
  const close = first.startsWith('/*') ? '*/' : first.startsWith('<!--') ? '-->' : null;
  if (close) {
    const j = lines.findIndex((l, k) => k >= i && l.includes(close));
    return j < 0 ? 0 : j + 1;
  }
  const marker = first.startsWith('//') ? '//' : first.startsWith('#') ? '#' : null;
  if (!marker) return 0;
  let end = 0;
  for (let k = i; k < lines.length && (lines[k].trim() === '' || lines[k].trim().startsWith(marker)); k++) {
    if (lines[k].trim() !== '') end = k + 1;
  }
  return end;
}

// Changed code lines of one commit, and how many of them sit in the header comment of their file.
async function headerLines(dir, sha) {
  const diff = await git(dir, ['diff-tree', '-p', '-U0', '-M', '--no-commit-id', '-r', sha]);
  const files = [];
  let cur = null;
  for (const line of splitLines(diff)) {
    const head = line.match(/^diff --git a\/(.*) b\/(.*)$/);
    if (head) {
      cur = { oldPath: head[1], newPath: head[2], old: [], neu: [], skip: LOCK.test(head[2]) || GEN.test(head[2]) };
      files.push(cur);
    } else if (cur && line.startsWith('Binary files')) cur.skip = true;
    else if (cur && line.startsWith('@@')) {
      const h = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);
      cur.o = Number(h[1]);
      cur.n = Number(h[2]);
    } else if (cur && cur.o !== undefined && !cur.skip) {
      if (line.startsWith('-') && !line.startsWith('---')) cur.old.push(cur.o++);
      else if (line.startsWith('+') && !line.startsWith('+++')) cur.neu.push(cur.n++);
    }
  }
  const live = files.filter((f) => !f.skip);
  const blobs = await catFiles(dir, live.flatMap((f) => [`${sha}^:${f.oldPath}`, `${sha}:${f.newPath}`]));
  let lines = 0;
  let header = 0;
  for (const f of live) {
    const before = blobs.get(`${sha}^:${f.oldPath}`);
    const after = blobs.get(`${sha}:${f.newPath}`);
    const oldEnd = before == null ? 0 : headerEnd(before);
    const newEnd = after == null ? 0 : headerEnd(after);
    lines += f.old.length + f.neu.length;
    header += f.old.filter((n) => n <= oldEnd).length + f.neu.filter((n) => n <= newEnd).length;
  }
  return { lines, header };
}

// Commits whose subject mentions headers, copyright, EPL or a license, and their header-line share.
async function listHeaders() {
  const min = num('min-share', 95);
  const names = args.filter((a) => !a.startsWith('--'));
  const { rows } = await classifyAll(rawSources(), []);
  const found = rows.filter(
    (r) => r.header && (r.kind === 'work' || r.kind === 'move') && (!names.length || names.includes(r.repo) || names.includes(r.member)),
  );
  console.log(`commits mentioning headers, copyright, EPL or license: ${found.length}; * = header share above ${min}%`);
  for (const r of found) {
    let lines = 0;
    let header = 0;
    for (const m of r.members) {
      const h = await headerLines(m.dir, m.sha);
      lines += h.lines;
      header += h.header;
    }
    const share = lines ? (100 * header) / lines : 0;
    console.log(
      [
        share > min ? '*' : ' ', (r.member ?? r.repo).padEnd(16), r.date, r.hash.padEnd(10), r.kind.padEnd(9), `parts ${r.parts}`.padEnd(8),
        `${header}/${lines}`.padEnd(12), `${share.toFixed(1)}%`.padStart(6), r.subject.slice(0, 70),
      ].join(' '),
    );
  }
}

// Forks and templates from the GitHub API, shared root commits from the clones.
async function relations() {
  const info = {};
  const open = SOURCES.filter((s) => s.url && !s.private);
  await pool(open, CONCURRENCY, async (src) => {
    const repo = src.url.replace('https://github.com/', '');
    const jq = '{fork, parent: .parent.full_name, template: .template_repository.full_name, size, created_at}';
    try {
      info[src.id] = { project: src.project, repo, ...JSON.parse((await sh('gh', ['api', `repos/${repo}`, '--jq', jq])).stdout) };
    } catch (e) {
      info[src.id] = { project: src.project, repo, error: String(e.stderr || e.message).trim() };
    }
  });
  const roots = new Map();
  await pool(SOURCES.filter(cloned), CONCURRENCY, async (src) => {
    const out = await git(src.dir, ['rev-list', '--max-parents=0', '--exclude=refs/stash', '--all']);
    for (const sha of splitLines(out).filter(Boolean)) {
      const r = roots.get(sha) ?? { projects: new Set(), dir: src.dir, private: false };
      r.projects.add(projectLabel(src));
      r.private ||= Boolean(src.private);
      roots.set(sha, r);
    }
  });
  console.log(`${'project'.padEnd(24)} ${'repository'.padEnd(46)} ${'fork'.padEnd(6)} ${'parent / template'.padEnd(40)} size MB`);
  for (const src of open) {
    const i = info[src.id];
    const link = i.error ? `ERROR ${i.error.split('\n')[0]}` : [i.parent && `parent ${i.parent}`, i.template && `template ${i.template}`].filter(Boolean).join(', ');
    console.log(`${src.project.padEnd(24)} ${i.repo.padEnd(46)} ${String(i.fork ?? '').padEnd(6)} ${link.padEnd(40)} ${i.size === undefined ? '' : Math.round(i.size / 1024)}`);
  }
  const shared = [...roots].filter(([, r]) => r.projects.size > 1);
  console.log(`\nroot commits shared by several projects: ${shared.length}`);
  const sharedOut = [];
  for (const [sha, r] of shared) {
    const what = r.private ? '' : (await git(r.dir, ['log', '-1', '--date=short', '--format=%ad %s', sha])).trim().slice(0, 60);
    const root = r.private ? '-' : sha.slice(0, 10);
    sharedOut.push({ root, what, projects: [...r.projects] });
    console.log(`${root.padEnd(10)} ${[...r.projects].join(', ')}  ${what}`);
  }
  await writeFile(RELATIONS_PATH, JSON.stringify({ github: info, sharedRoots: sharedOut }, null, 2) + '\n');
}

async function classifyAll(ok, warnings) {
  const rows = [];
  const shared = { sha: new Map(), at: new Map(), pairs: new Map() };
  for (const project of PROJECTS) {
    const sources = SOURCES.filter((s) => s.project === project.name && ok.has(s.id));
    if (!sources.length) continue;
    rows.push(...classify(project, await Promise.all(sources.map(readRaw)), shared, warnings));
  }
  rows.sort((a, b) => cmp(a.date, b.date) || cmp(a.repo, b.repo) || cmp(a.hash, b.hash));
  return { rows, pairs: shared.pairs };
}

async function main() {
  if (has('big')) return listBig();
  if (has('headers')) return listHeaders();
  if (has('relations')) return relations();
  const failures = [];
  const warnings = [];
  const ok = new Set();
  if (has('reuse-raw')) {
    for (const src of SOURCES) {
      if (existsSync(rawPath(src, 'numstat'))) ok.add(src.id);
      else failures.push({ project: projectLabel(src), source: label(src), error: 'no raw export, run without --reuse-raw' });
    }
  } else {
    let done = 0;
    await pool(SOURCES, CONCURRENCY, async (src) => {
      const t = Date.now();
      try {
        const generated = await withRetry(() => fetchAndExport(src));
        ok.add(src.id);
        console.log(`[${++done}/${SOURCES.length}] ${label(src)} ok, ${secs(t)}s${generated ? `, ${generated} generated go files` : ''}`);
      } catch (e) {
        const error = hideDir(e.message, src);
        failures.push({ project: projectLabel(src), source: label(src), error });
        console.log(`[${++done}/${SOURCES.length}] ${label(src)} FAILED: ${error}`);
      }
    });
  }
  const { rows, pairs } = await classifyAll(ok, warnings);
  const summary = summarize(rows, pairs, failures, warnings);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CSV_PATH, toCsv(COLUMNS, rows.filter((r) => r.kind !== 'artifact')));
  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n');
  printSummary(summary);
  if (failures.length) process.exitCode = 1;
}

export { authorRe, sourceId, classify, classifyAll, count, estimate, foldCvs, isBranchMerge, newPath, quantile, rawSources, sizesByYear, summarize };

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
