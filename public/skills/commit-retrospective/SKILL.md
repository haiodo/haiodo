---
name: commit-retrospective
description: Use when the user wants to count their commits and lines of code across all their repositories over the years, chart them, compare the total with GitHub's own count and estimate the work hidden in closed repositories. Runs the open commit-statistics scripts from haiodo.github.io on the user's repositories and keeps closed repositories out of every public output.
---

# Commit retrospective

Counts the user's commits and code lines in all their repositories over all years and draws five SVG
charts: lines per quarter, commits per year, projects timeline, commit size, GitHub vs unique commits.
Plain Node scripts, no npm packages; the data folder's `config.mjs` holds everything personal. You discover
repositories, confirm identities, write the config, run, review and report.

## Ground rules

- Work only in the workspace folder. Never write into a blog or any other checkout, never commit, push
  or change the user's git config (on "dubious ownership" errors ask the user). The scripts only read
  the user's repositories and clone PUBLIC GitHub ones into the workspace.
- Only PUBLIC repositories may be named in anything that can leave the machine. Closed ones get the
  private label: no names, paths, emails or commit subjects. Ask the user before naming anything.
- Ask instead of guessing: folders, identities, projects, imports, estimate years. Shell state may not
  persist between commands: start each with `. "$WORK/env.sh"`.

## 1. Prerequisites

```bash
node -v && git --version   # Node 20 or newer; a POSIX shell (macOS, Linux, WSL)
gh auth status    # needed for visibility, forks, GitHub's counts; else ask the user to run `gh auth login`
```

## 2. Get the scripts and a workspace

```bash
WORK="$HOME/commit-retrospective"      # a new folder; it must not be inside any git repository
mkdir -p "$WORK" && cd "$WORK" && git rev-parse --show-toplevel 2>/dev/null && echo "pick another folder"
git clone --depth 1 --filter=blob:none --sparse https://github.com/haiodo/haiodo tools
git -C tools sparse-checkout set scripts/commits
# without git: mkdir tools && curl -fsSL https://github.com/haiodo/haiodo/archive/refs/heads/main.tar.gz \
#   | tar -xz -C tools --strip-components=1 haiodo-main/scripts/commits
cat > "$WORK/env.sh" <<EOF
export COMMITS_REPOS_DIR="$WORK/repos"      # clones of public GitHub repositories
export COMMITS_DATA_DIR="$WORK/data"        # config.mjs, private-repos.mjs, commits.csv, summary.json, github.json, raw/
export COMMITS_ASSETS_DIR="$WORK/assets"    # the SVG charts
export TOOLS="$WORK/tools/scripts/commits"
EOF
. "$WORK/env.sh" && mkdir -p "$COMMITS_REPOS_DIR" "$COMMITS_DATA_DIR" "$COMMITS_ASSETS_DIR"
node --test "$TOOLS/commits.test.mjs" 2>&1 | grep -E " (pass|fail) [0-9]+$"     # smoke test, no network
```

Do not run `collect.mjs` before step 6: without `$COMMITS_DATA_DIR/config.mjs` the scripts stop and name
the file. The data folder holds private data (`config.mjs`, `private-repos.mjs`, `raw/`): never publish it.

## 3. Discovery

1. Ask which folders to scan: development folders, archived or old folders, backups, external drives
   (`/Volumes/...`), old laptops, other accounts. Ask also about repositories that exist only on GitHub.
2. Scan them, pruning dependency and cache folders. A `.git` file is a worktree or submodule: skip it.

```bash
for d in "$HOME/Develop" "/Volumes/Backup"; do        # the user's answer
  find "$d" -maxdepth 7 \( -name node_modules -o -name .cache -o -name .npm -o -name Library \
    -o -name .Trash -o -name .cargo -o -name .gradle -o -name .m2 \) -prune -o -name .git -prune -print 2>/dev/null
done | sort -u > "$WORK/found.txt"
while IFS= read -r g; do [ -d "$g" ] || continue; r=$(dirname "$g")
  printf '%s\t%s\t%s\n' "$r" "$(git -C "$r" remote get-url origin 2>/dev/null || echo -)" \
    "$(git -C "$r" rev-list --all --count 2>/dev/null)"; done < "$WORK/found.txt" > "$WORK/repos.tsv"
```

3. GitHub side: `gh api user --jq .login`, `gh api user/orgs --jq '.[].login'`, and per user and organisation
   `gh repo list OWNER --limit 1000 --json nameWithOwner,visibility,isFork,isArchived`. Once `GITHUB_LOGIN`
   is set (step 6), `node "$TOOLS/github.mjs"` fills `github.json`: the per-year
   `commitContributionsByRepository` (at most 100 a year, the script warns) lists every repository GitHub
   credits the user for. Ask about those missing from `repos.tsv`; closed ones must be on disk.

## 4. Identities

- Collect candidates, seeded by `git config --global user.name`, `user.email` and the noreply address
  `gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'` (also `LOGIN@users.noreply...`):

```bash
while IFS= read -r g; do [ -d "$g" ] && git -C "$(dirname "$g")" log --all --exclude=refs/stash \
  --format='%aN <%aE>' 2>/dev/null; done < "$WORK/found.txt" | sort | uniq -c | sort -rn | head -60
```

- The user confirms each candidate. A listed name matches with any email, a listed email with any name
  (`AUTHOR` in `config.mjs`). Never list a bare first name or a login-like short word, and watch for
  colleagues with the same first name. If a confirmed name also appears with emails the user does not
  recognise, drop it and list emails only.
- Work emails of closed projects go only into `authors` of that project in `private-repos.mjs`, never
  into `AUTHOR`: a company domain names the closed project.
- After the first run print the regex and show the identities it really matched; fix and rerun:

```bash
RE=$(node --input-type=module -e "import { authorRe } from '$TOOLS/collect.mjs'; console.log(authorRe())")
git -C REPO log --all --exclude=refs/stash -E --author="$RE" --format='%aN <%aE>' | sort | uniq -c
```

## 5. Privacy

- For every repository with a GitHub origin: `gh repo view OWNER/REPO --json visibility -q .visibility`.
  Only `PUBLIC` is public. PRIVATE, INTERNAL, an error (not found: private or deleted), a non-GitHub
  origin, no origin and local-only repositories are closed.
- Closed repositories live only in `$COMMITS_DATA_DIR/private-repos.mjs` (by default `not-shared/commit-stats/`,
  gitignored in the blog). The scripts show them as one row named `PRIVATE_LABEL` with blank hashes and
  the generic `PRIVATE_SUBJECT`, and `github.mjs` sums GitHub-private repositories under that label.

```js
export default [   // name is used only locally; `private: true` is set automatically
  { name: 'acme-api', sources: [{ dir: '/abs/acme-api' }], authors: { emails: ['me@acme.example'] },
    moves: [], generated: [] },
];
// extra local copies of PUBLIC projects, by project name; an optional one is skipped if absent
export const checkouts = { hello: ['/old/laptop/hello', { dir: '/Volumes/D/hello', optional: true }] };
```

- Before naming any public repository or group in labels, show the user the list and get a yes. Finish
  by grepping the public outputs for private names, paths, hostnames and emails; list the shared files
  explicitly, `raw/`, `config.mjs` and `private-repos.mjs` hold exactly those strings:

```bash
grep -rniE 'acme-api|/abs/|acme\.example' "$COMMITS_ASSETS_DIR" \
  "$COMMITS_DATA_DIR"/{commits.csv,summary.json,relations.json,github.json}
```

## 6. Config

Copy `$TOOLS/config.example.mjs` to `$COMMITS_DATA_DIR/config.mjs`: it is yours, local, in no repository.
`repos.mjs` holds only code and generic rules and needs no edits. Fill in:

- `REPOS_DEFAULT`, `GITHUB_LOGIN`, `AUTHOR = { names: [...], emails: [...] }` from step 4.
- `PRIVATE_LABEL`, `PRIVATE_SUBJECT`: the words shown for closed work (Russian by default). Chart texts are
  Russian, written in `charts.mjs`; ask whether to translate them (`render()` throws on overlapping labels).
- `COPIES`, `GROUPS`, `MARKS`, `ESTIMATE`: see below. `GENERATED_FILES`: your own rules, added to the
  generic ones of `repos.mjs` (vendor, .min.js, .pb.go, fixtures, ...).
- `PROJECTS`: a function that receives the helpers and returns the array; keep `...privateProjects` in it.

```js
export const GROUPS = { misc: { label: 'tools and experiments' }, app: { label: 'App', continuous: true } };
export const PROJECTS = ({ gh, local, privateProjects }) => [
  gh('hello', 'octocat/Hello-World'),              // public: cloned to COMMITS_REPOS_DIR/owner/repo
  local('notes', '/abs/notes', { group: 'misc' }), // local: read in place, never updated
  gh('app', 'me/app', { group: 'app', checkouts: ['/old/laptop/app'] }),
  ...privateProjects,                              // closed ones from private-repos.mjs
];
```

- A project is one row, named by `name`; projects with the same `group` form one row named
  `GROUPS[group].label` (versions of one product, many small repositories). `continuous` draws one bar.
- Order matters: a commit found in several projects counts in the first one. Upstream before forks,
  mirrors and rewritten copies. A public repository sharing history with a closed one goes before
  `...privateProjects`, so the shared commits stay in the public row.
- Options: `cvs: true`, `moves: ['<10-char hash>', ...]`, `generated: [/regex/]`, `partial: true` (blobless
  clone for huge repositories), `checkouts` (more local copies of one history, united by SHA; they add
  commits never pushed). Several GitHub repositories of one history: `gh('x', ['owner/x', 'fork/x'])`.
  Only some branches: `{ name, sources: [{ dir, refs: ['HEAD', 'origin/main'] }] }`.

## 7. Run and review

```bash
. "$WORK/env.sh"
node "$TOOLS/collect.mjs"              # clones public repos, reads local ones, writes commits.csv, summary.json, raw/
node "$TOOLS/collect.mjs" --no-fetch   # no network; only for GitHub repos that are already cloned
node "$TOOLS/collect.mjs" --reuse-raw  # recompute from raw/ after changing moves, groups, order, rules, cvs
```

Changing `AUTHOR`, `authors` or sources needs a full run. The table at the end lists rows, years and
totals; failures print as `FAILED ...`, give exit code 1 and are in `summary.json`. Read it with the user:

1. **CVS-era bursts.** Converted CVS or SVN history shows one commit per directory with the same
   subject within minutes, converter stubs ("file X was initially added on branch Y") and "merge with
   HEAD" commits. Look for them, then set `cvs: true` on those projects only (parts within `CVS_WINDOW`
   = 600 s fold into one commit, stubs go, branch-merge subjects become merges). `repo` below is the row
   label; the project is in `members` of `summary.json`:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs'; import { parseCsv } from '$TOOLS/csv.mjs'; import { PRIVATE_SUBJECT } from '$TOOLS/repos.mjs';
const rows = parseCsv(readFileSync(process.env.COMMITS_DATA_DIR + '/commits.csv', 'utf8')).filter((r) => r.subject !== PRIVATE_SUBJECT);
const by = {}, hit = {};
for (const r of rows) (by[r.repo + '|' + r.subject] ??= []).push(+r.at);
for (const [k, t] of Object.entries(by)) if (t.sort((a, b) => a - b).some((x, i) => i > 1 && x - t[i - 2] <= 600)) hit[k.split('|')[0]] = 1 + (hit[k.split('|')[0]] ?? 0);
console.log('subjects repeated 3+ times within 10 min, by row:', hit, '| stubs:', rows.filter((r) => /^file \S+ was (initially )?added on branch/.test(r.subject)).length);"
```

2. **Imports.** `--big [project ...] [--min-lines=15000] [--min-files=500]` lists huge commits;
   `--headers [project ...] [--min-share=95]` lists commits whose subject mentions headers, copyright or
   licence, with the share of header lines (`*` above the threshold). Look at each candidate with the user
   (`git show --stat <sha>`). It is a `move` (a real commit whose lines go to a separate series, not into
   code) when it is the first upload of an existing code base, a vendor drop, code copied between
   repositories, a mass rename, a version bump over many files, a copyright or header update, someone
   else's patch applied by the user, or the revert of any of these; a big commit with new code stays
   `work`. Put the first 10 hash characters into `moves` with a one-line reason, rerun with `--reuse-raw`.
   For closed projects `--big` prints no hashes by design: list them with git (`RE` from step 4, built
   with `authorRe({ emails: [...] })` for that project):

```bash
git -C REPO log --all --no-merges -E --author="$RE" --numstat --format='@@%h %ad %s' --date=short |
  awk '/^@@/{if(h)print t,f,h; h=substr($0,3); t=0; f=0; next} NF>=3{t+=$1+$2; f++} END{if(h)print t,f,h}' |
  sort -rn | head
```

3. **Generated and data directories.** Big commits reveal vendored libraries, bundles, protobuf output,
   dependency folders, data dumps, recorded responses, research notes. Add a regex to the project's
   `generated` (generic ones to `GENERATED_FILES` of `config.mjs`): those lines move to `gen_added`/`gen_deleted`. Rerun
   with `--reuse-raw` and `--big` until no data commit is left among the big ones.
4. **Forks.** `collect.mjs --relations` prints fork and template parents (GitHub API) and root commits
   shared by several projects, and writes `relations.json`: use it for the order and for `COPIES`.
5. **GitHub.** `node "$TOOLS/github.mjs"` writes `github.json`. GitHub counts a commit once per repository,
   so forks and mirrors of one history count several times: list them in `COPIES.repos` and fill `note`
   and `without` (chart words); `github.json` then shows `copies.commitsWithoutCopies`.
6. **Charts.** `node "$TOOLS/charts.mjs"` needs `commits.csv`, `summary.json` and `github.json` and writes
   `lines-by-quarter.svg`, `commits-by-year.svg`, `projects-timeline.svg`, `commit-size-by-year.svg`,
   `github-vs-unique.svg` into `$COMMITS_ASSETS_DIR`. View them on light and dark backgrounds; label
   overlaps are reported as errors.

## 8. Estimate (optional)

Ask whether the user wants it; if not, set `ESTIMATE = { fullTime: [], hidden: [] }` and skip. Otherwise
ask for the eras of full-time coding that are fully visible in the included repositories and for the
hidden years (closed work, lead years); show the commit counts per year and suggest dropping a reference
year that jumps sharply, so that the eras agree.

```js
export const ESTIMATE = { fullTime: [{ name: '2008-2010', years: [2008, 2010] },
  { name: '2018-2021', years: [2018, 2021] }], hidden: [2011, 2017] };
```

Formula: an era mean is the mean of all visible commits per year over its years (whole bars, all rows);
A is the mean of the era means; a hidden year gets `max(0, A - visible commits)`; the total is their sum.
It is an upper bound for years when the user led teams instead of coding full time. The chart draws
only the dashed line A and the hatched estimate; `summary.json` keeps `low` and `high` (the two era
means) with a note: they are not an uncertainty range.

## 9. Report to the user

Read `summary.json` (`totals`, `years`, `projects`, `estimate`, `excluded`) and `github.json`
(`totals.commits`, `copies`). Give: unique commits (work, moves, excluded merges and duplicates), code
lines added and deleted, first and last commit, the busiest years, the rows with years and counts,
GitHub's total against unique commits, the estimate, the choices made with the user. Say where the files
are (`commits.csv`, `summary.json`, `github.json`, `relations.json`, SVGs; `raw/` stays private). Run the
privacy grep first.

## 10. Pitfalls

- CVS and SVN conversions split a commit per directory and add stubs and branch merges: `cvs: true`.
- Pull requests merged by squash exist twice in a clone with all branches: the branch commits and one
  squashed commit with another subject and time. Dedupe cannot tell: read only the integration branch.
- Rewritten copies (rebase, filter-branch, git-svn, a second clone) have other SHAs. Inside a project the
  scripts dedupe by subject, line numbers and author time (CVS projects: without the time), across
  projects by author time and subject. Put copies into one project as `checkouts`, check `duplicates`.
- Data directories inflate lines by orders of magnitude (vendored code, bundles, dumps): see 7.3.
- A sudden jump year skews the estimate: drop it from the eras. Same first names: see step 4.
- Commits that exist only locally (unpushed, other branches, old laptops) are counted from the local
  repository but never by GitHub, which counts default-branch commits only. GitHub counts forks and
  mirrors separately (7.5) and shows private work only if the profile displays it (`restricted`).
