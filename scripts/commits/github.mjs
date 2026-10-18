#!/usr/bin/env node
// Fetches the yearly GitHub contribution numbers and the share that comes from repository copies.
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { COPIES, DATA_DIR, GITHUB_LOGIN, PRIVATE_LABEL } from './repos.mjs';

const sh = promisify(execFile);

const QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner isPrivate isFork }
        contributions { totalCount }
      }
    }
  }
}`;

async function graphql(query, vars = {}) {
  const fields = Object.entries(vars).flatMap(([k, v]) => ['-f', `${k}=${v}`]);
  for (let attempt = 1; ; attempt++) {
    try {
      const { stdout } = await sh('gh', ['api', 'graphql', '-f', `query=${query}`, ...fields]);
      return JSON.parse(stdout).data;
    } catch (e) {
      if (attempt >= 2) throw new Error(`gh api graphql: ${String(e.stderr || e.message).trim()}`);
    }
  }
}

// Repositories GitHub reports as private are summed under one label and never named.
function hidePrivate(collection) {
  const list = collection.commitContributionsByRepository;
  const closed = list.filter((r) => r.repository.isPrivate);
  if (!closed.length) return;
  const totalCount = closed.reduce((s, r) => s + r.contributions.totalCount, 0);
  collection.commitContributionsByRepository = [
    ...list.filter((r) => !r.repository.isPrivate),
    { repository: { nameWithOwner: PRIVATE_LABEL, isPrivate: true, isFork: false }, contributions: { totalCount } },
  ];
}

const { user } = await graphql('query($login: String!) { user(login: $login) { createdAt } }', { login: GITHUB_LOGIN });
const now = new Date();
const years = {};
for (let y = new Date(user.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
  const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
  const data = await graphql(QUERY, { login: GITHUB_LOGIN, from: `${y}-01-01T00:00:00Z`, to });
  years[y] = data.user.contributionsCollection;
  hidePrivate(years[y]);
  if (years[y].commitContributionsByRepository.length >= 100) console.warn(`${y}: 100 repositories, the list may be cut`);
}

const sum = (field) => Object.values(years).reduce((s, c) => s + c[field], 0);
const totalCommits = sum('totalCommitContributions');
const copyByRepo = Object.fromEntries(COPIES.repos.map((r) => [r, 0]));
const copyByYear = {};
for (const [y, c] of Object.entries(years)) {
  for (const r of c.commitContributionsByRepository) {
    if (!(r.repository.nameWithOwner in copyByRepo)) continue;
    copyByRepo[r.repository.nameWithOwner] += r.contributions.totalCount;
    copyByYear[y] = (copyByYear[y] ?? 0) + r.contributions.totalCount;
  }
}
const copyCommits = Object.values(copyByRepo).reduce((s, n) => s + n, 0);
const privateCommits = Object.values(years)
  .flatMap((c) => c.commitContributionsByRepository)
  .filter((r) => r.repository.isPrivate)
  .reduce((s, r) => s + r.contributions.totalCount, 0);

const result = {
  login: GITHUB_LOGIN,
  fetchedAt: now.toISOString().slice(0, 10),
  totals: {
    commits: totalCommits,
    privateCommits,
    pullRequests: sum('totalPullRequestContributions'),
    issues: sum('totalIssueContributions'),
    reviews: sum('totalPullRequestReviewContributions'),
    restricted: sum('restrictedContributionsCount'),
  },
  copies: {
    repos: copyByRepo,
    byYear: copyByYear,
    commits: copyCommits,
    share: totalCommits ? copyCommits / totalCommits : 0,
    commitsWithoutCopies: totalCommits - copyCommits,
  },
  years,
};
await mkdir(DATA_DIR, { recursive: true });
await writeFile(path.join(DATA_DIR, 'github.json'), JSON.stringify(result, null, 2) + '\n');

const n = (v, w) => String(v).padStart(w);
console.log(`${'year'.padEnd(6)} ${n('commits', 8)} ${n('PR', 5)} ${n('issues', 7)} ${n('reviews', 8)} ${n('restricted', 11)} ${n('repos', 6)}`);
for (const [y, c] of Object.entries(years)) {
  console.log(
    `${y.padEnd(6)} ${n(c.totalCommitContributions, 8)} ${n(c.totalPullRequestContributions, 5)} ${n(c.totalIssueContributions, 7)} ${n(c.totalPullRequestReviewContributions, 8)} ${n(c.restrictedContributionsCount, 11)} ${n(c.commitContributionsByRepository.length, 6)}`,
  );
}
console.log(`total commits ${totalCommits}, PR ${result.totals.pullRequests}, issues ${result.totals.issues}, reviews ${result.totals.reviews}, restricted ${result.totals.restricted}`);
for (const [r, c] of Object.entries(copyByRepo)) console.log(`  ${r}: ${c}`);
console.log(`copies: ${copyCommits} of ${totalCommits} (${(result.copies.share * 100).toFixed(1)}%), without them ${result.copies.commitsWithoutCopies}`);
