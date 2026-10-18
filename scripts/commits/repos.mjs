// Folders, helpers and loaders; nothing personal lives here. The config comes from
// ${DATA_DIR}config.mjs (template: config.example.mjs), closed repositories from private-repos.mjs.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Outputs and SVGs stay in the blog by default; clones go to REPOS_DEFAULT of the config or next to
// the outputs. COMMITS_REPOS_DIR, COMMITS_DATA_DIR and COMMITS_ASSETS_DIR override all three.
const folder = (value) => (value.endsWith('/') ? value : `${value}/`);
const here = (file) => fileURLToPath(new URL(file, import.meta.url));
export const DATA_DIR = folder(process.env.COMMITS_DATA_DIR ?? here('../../not-shared/commit-stats/'));
export const ASSETS_DIR = folder(process.env.COMMITS_ASSETS_DIR ?? here('../../src/assets/020/'));

// A run needs the personal config and stops without it; the tests only import this module.
const CONFIG_FILE = `${DATA_DIR}config.mjs`;
const config = existsSync(CONFIG_FILE) ? await import(pathToFileURL(CONFIG_FILE).href) : null;
const RUNS = ['collect', 'github', 'charts'].map((name) => here(`${name}.mjs`));
if (!config && RUNS.includes(path.resolve(process.argv[1] ?? ''))) {
  console.error(`No config at ${CONFIG_FILE}\nCopy ${here('config.example.mjs')} there and edit it; see README.md.`);
  process.exit(1);
}
const cfg = config ?? {};

export const REPOS_DIR = (process.env.COMMITS_REPOS_DIR || cfg.REPOS_DEFAULT || `${DATA_DIR}repos`).replace(/\/+$/, '');

// GitHub login whose contributions github.mjs counts.
export const GITHUB_LOGIN = cfg.GITHUB_LOGIN ?? '';

// Matched against "Name <email>": a listed name with any email, a listed email with any name.
export const AUTHOR = cfg.AUTHOR ?? { names: [], emails: [] };

// What every private project is called in the CSV, summary.json, relations.json and the SVGs, and
// the subject of its commits there.
export const PRIVATE_LABEL = cfg.PRIVATE_LABEL ?? 'закрытые проекты';
export const PRIVATE_SUBJECT = cfg.PRIVATE_SUBJECT ?? 'приватный репозиторий';

// Repositories that carry one history: GitHub counts each of them. `note` and `without` are chart
// words; an empty `repos` drops that bar.
export const COPIES = cfg.COPIES ?? { repos: [], note: '', without: '' };

// A project with `group` shows under the group's label in the CSV, summary.json and the charts, as
// one timeline row. `continuous` draws one bar from the first to the last commit of the row.
export const GROUPS = cfg.GROUPS ?? {};

// Ticks on a row of the timeline, { group, date, label }: a fork, a move to another repository.
export const MARKS = cfg.MARKS ?? [];

// Eras of full-time work with a visible history, and the years in between whose commits went to
// closed repositories: the estimate of hidden commits (README.md). An era counts every visible
// commit of its years; `groups` or `projects` would narrow it. Empty `fullTime` turns it off.
export const ESTIMATE = cfg.ESTIMATE ?? { fullTime: [], hidden: [] };

// Eclipse's CVS client commits every plugin on its own: parts of a `cvs` project with one subject,
// each at most this many seconds after the previous one, are one commit.
export const CVS_WINDOW = 600;

// Lines of these files are counted apart from code in every number.
export const LOCK_FILES = /(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|shrinkwrap\.yaml|\.lock|go\.sum|Package\.resolved)$/;

// Generated, vendored and data files; the config adds its own rules and a project adds more through
// `generated`.
export const GENERATED_FILES = [
  /\.pb\.go$/, /(^|\/)testdata\//, /\.jsonl$/, // protobuf Go code, test data
  /(^|\/)gen-src\//, /(^|\/)src-gen\//, /(^|\/)xtend-gen\//, // Eclipse code generators
  /\.patch$/, /(^|\/)xcuserdata\//, /\.xcbkptlist$/, // patches, Xcode user data
  /(^|\/)fixtures\//, /(^|\/)vendor\//, /(^|\/)third_party\//,
  /META-INF\/ECLIPSE\.SF$/, /\.min\.js$/, // Eclipse signing, minified scripts
  ...(cfg.GENERATED_FILES ?? []),
];

// A stash entry is a merge commit under the author's name, not history.
const ALL = ['--exclude=refs/stash', '--all'];
// `checkouts`: more local directories of the same history, united by SHA. An entry is a path or
// { dir, optional: true }; an optional one that is not there (an unmounted drive) is skipped.
const checkout = (c) => ({ refs: ALL, ...(typeof c === 'string' ? { dir: c } : c) });
const local = (name, dir, { checkouts = [], ...extra } = {}) => ({
  name,
  sources: [{ dir, refs: ALL }, ...checkouts.map(checkout)],
  ...extra,
});
// Clones live in REPOS_DIR/<owner>/<repo>; `partial` is for repositories too big for a full clone.
const gh = (name, repos, { checkouts = [], ...extra } = {}) => ({
  name,
  sources: [
    ...[].concat(repos).map((repo) => ({ url: `https://github.com/${repo}`, dir: `${REPOS_DIR}/${repo}`, refs: ALL })),
    ...checkouts.map(checkout),
  ],
  ...extra,
});

// Closed repositories come from a local gitignored file (README.md): `default` lists the projects,
// `checkouts` maps a project name of the config to more local copies.
const PRIVATE_FILE = `${DATA_DIR}private-repos.mjs`;
const privateFile = existsSync(PRIVATE_FILE) ? await import(pathToFileURL(PRIVATE_FILE).href) : {};
const privateProjects = (privateFile.default ?? []).map((p) => ({
  ...p,
  private: true,
  sources: p.sources.map((src) => ({ refs: ALL, ...src })),
}));

// A name that matches no project is a typo and stops the run.
export function withCheckouts(projects, extra = {}) {
  const unknown = Object.keys(extra).filter((name) => !projects.some((p) => p.name === name));
  if (unknown.length) throw new Error(`checkouts for projects that do not exist: ${unknown.join(', ')}`);
  return projects.map((p) => (extra[p.name] ? { ...p, sources: [...p.sources, ...extra[p.name].map(checkout)] } : p));
}

// The config builds the projects with the helpers above. Order matters: a commit found in several
// projects (same SHA, or same author time and subject) counts in the first one.
if (config && typeof config.PROJECTS !== 'function') {
  throw new Error(`${CONFIG_FILE}: PROJECTS must be a function ({ gh, local, privateProjects }) => [...]`);
}
export const PROJECTS = config ? withCheckouts(config.PROJECTS({ gh, local, privateProjects }), privateFile.checkouts) : [];
