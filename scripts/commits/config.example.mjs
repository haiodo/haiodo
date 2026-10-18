// Template of the personal config: copy it to ${COMMITS_DATA_DIR}/config.mjs (by default
// not-shared/commit-stats/config.mjs, ignored by git), edit it and keep it out of any repository.

// Where GitHub repositories are cloned (REPOS_DIR/owner/repo); COMMITS_REPOS_DIR wins.
// Empty: a `repos` folder inside the data folder.
export const REPOS_DEFAULT = '';

// The GitHub login whose contributions github.mjs counts.
export const GITHUB_LOGIN = 'octocat';

// A listed name matches with any email, a listed email with any name. Never list a bare first name.
export const AUTHOR = { names: ['The Octocat'], emails: ['octocat@nowhere.com'] };

// The row and the commit subject that stand for every closed project of private-repos.mjs.
export const PRIVATE_LABEL = 'closed projects';
export const PRIVATE_SUBJECT = 'private repository';

// Repositories that carry one history, so GitHub counts each: repos: ['owner/repo', 'fork/repo'].
// `note` and `without` are the words of the GitHub chart; an empty `repos` drops that bar.
export const COPIES = { repos: [], note: '', without: '' };

// A project with `group` joins the timeline row named by GROUPS[group].label.
// `continuous: true` draws one bar from the first to the last commit of the row.
export const GROUPS = { misc: { label: 'tools and experiments' } };

// Ticks on a timeline row, each { group, date: 'YYYY-MM-DD', label }: a fork, a move.
export const MARKS = [];

// Eras of full-time work with a fully visible history, fullTime: [{ name, years: [from, to] }],
// and the hidden years between them, hidden: [from, to]. Empty `fullTime` turns the estimate off.
export const ESTIMATE = { fullTime: [], hidden: [] };

// Your own generated, vendored and data files, added to the generic rules of repos.mjs.
export const GENERATED_FILES = []; // e.g. /(^|\/)generated\//

// gh(name, 'owner/repo' or ['owner/repo', 'fork/repo'], options): a public repository, cloned.
// local(name, dir, options): a local repository, read in place.

// Order matters: a commit found in several projects counts in the first one. Upstream goes before
// forks, mirrors and copies, and before ...privateProjects if it shares history with them.
export const PROJECTS = ({ gh, local, privateProjects }) => [
  gh('hello', 'octocat/Hello-World', { group: 'misc' }),

  // Options: group, cvs, moves, generated, partial, checkouts. A history converted from CVS or SVN:
  // gh('old', 'owner/old', { cvs: true }),

  // `partial` makes a blobless clone of a huge repository; `generated` adds rules for this project.
  // gh('big', 'owner/big', { partial: true, generated: [/(^|\/)dump\//] }),

  // `moves`: 10-char hash prefixes of imports, vendor drops, mass renames, version bumps.
  // gh('lib', 'owner/lib', { moves: ['0123456789'] }),

  // `checkouts`: more local copies of one history, united by SHA; `optional` skips a missing one.
  // local('notes', '/abs/notes', { checkouts: ['/old/notes', { dir: '/mnt/d', optional: true }] }),

  // Only some branches: write the project out in full.
  // { name: 'app', sources: [{ dir: '/abs/app', refs: ['HEAD', 'origin/main'] }] },

  ...privateProjects,
];
