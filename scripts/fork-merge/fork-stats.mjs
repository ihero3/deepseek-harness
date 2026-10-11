/**
 * Print the baseline metrics FORK-FEATURES.md section 九 records, so each sync refills them with one
 * command instead of hand-counted `git diff` calls.
 *
 * Generated files are reported apart from the authored delta: `pnpm-lock.yaml` line counts describe
 * lockfile churn, and counting them as fork authorship inflates the risk figure by an order of
 * magnitude. Run `node scripts/fork-merge/fork-stats.mjs --json` for machine-readable output.
 */

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/** Files a build regenerates or a merge driver owns, whose diff lines are not fork authorship. */
export const GENERATED_PATHS = ['pnpm-lock.yaml']

/** Upstream ref the metrics compare the current checkout against. */
export const DEFAULT_UPSTREAM_REF = 'upstream/master'

/**
 * One changed path with its line counts.
 * @typedef {object} NumstatEntry
 * @property {string} path - Path relative to the repository root.
 * @property {number} added - Added lines; binary paths report zero.
 * @property {number} deleted - Deleted lines; binary paths report zero.
 */

/**
 * One submodule pin.
 * @typedef {object} SubmodulePin
 * @property {string} path - Submodule path.
 * @property {string} pin - Pinned commit as recorded in the index.
 * @property {string} describe - Nearest tag and distance, absent when the pin has no tag.
 */

/**
 * Run one git command in a checkout.
 * @param {readonly string[]} args - Arguments after `git`.
 * @param {string} cwd - Repository root.
 * @returns {string} Command stdout without its trailing newline.
 */
export function runGit(args, cwd = process.cwd()) {
  return execFileSync('git', [...args], { cwd, encoding: 'utf8' }).replace(/\n$/, '')
}

/**
 * Count the recorded rerere resolutions for a checkout.
 * @param {string} cwd - Repository root.
 * @returns {number} Directory entries under git's `rr-cache`.
 */
export function countRerereEntries(cwd = process.cwd()) {
  const cache = runGit(['rev-parse', '--git-path', 'rr-cache'], cwd)
  return readdirSync(cache, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
}

/**
 * Parse `git diff --numstat` output.
 * @param {string} text - numstat output, one `added\tdeleted\tpath` line per changed file.
 * @returns {NumstatEntry[]} One entry per changed path; binary markers (`-`) count as zero lines.
 */
export function parseNumstat(text) {
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [added, deleted, ...path] = line.split('\t')
      return { path: path.join('\t'), added: Number(added) || 0, deleted: Number(deleted) || 0 }
    })
}

/**
 * Parse newline-separated git path output.
 * @param {string} text - Path listing, one path per line.
 * @returns {string[]} Paths in the order git printed them.
 */
export function parseNameList(text) {
  return text.split('\n').filter((line) => line.length > 0)
}

/**
 * Parse `git rev-list --left-right --count` output.
 * @param {string} text - `<behind>\t<ahead>`.
 * @returns {{ behind: number, ahead: number }} Commit counts on each side of the comparison.
 */
export function parseAheadBehind(text) {
  const [behind, ahead] = text.trim().split(/\s+/).map(Number)
  return { behind, ahead }
}

/**
 * Parse `git submodule status --recursive` output.
 * @param {string} text - One `<pin> <path> (<describe>)` line per submodule.
 * @returns {SubmodulePin[]} Pins in the order git printed them.
 */
export function parseSubmodules(text) {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [pin, path, ...describe] = line.trim().replace(/^[-+]/, '').split(/\s+/)
      return { path, pin, describe: describe.join(' ').replace(/[()]/g, '') }
    })
}

/**
 * Split changed files into generated paths and fork-authored paths.
 * @param {readonly NumstatEntry[]} entries - Numstat entries for every path the fork changed.
 * @param {readonly string[]} generatedPaths - Paths excluded from the authored delta.
 * @returns {{ authored: { files: number, added: number, deleted: number }, generated: NumstatEntry[] }}
 *   Line totals for authored paths, plus the generated entries counted apart.
 */
export function summarizeForkDelta(entries, generatedPaths = GENERATED_PATHS) {
  const generated = new Set(generatedPaths)
  const authored = entries.filter((entry) => !generated.has(entry.path))
  const collected = entries.filter((entry) => generated.has(entry.path))
  return {
    authored: {
      files: authored.length,
      added: authored.reduce((sum, entry) => sum + entry.added, 0),
      deleted: authored.reduce((sum, entry) => sum + entry.deleted, 0),
    },
    generated: collected.map((entry) => ({ ...entry })),
  }
}

/**
 * Collect the fork's baseline metrics against one upstream ref.
 *
 * The diff is taken against the working tree, and untracked files count as fork-only, so a refill
 * reports the checkout as it stands rather than its last commit.
 * @param {object} [options] - Collection inputs.
 * @param {(args: readonly string[], cwd: string) => string} [options.runGit] - Git runner; injected by tests.
 * @param {(cwd: string) => number} [options.rerereCount] - Rerere counter; injected by tests.
 * @param {string} [options.upstreamRef] - Upstream ref to compare against.
 * @param {string} [options.cwd] - Repository root.
 * @returns {object} Upstream identity, ahead/behind counts, changed-file classes, submodule pins, and the authored delta.
 */
export function collectForkStats({
  runGit: git = runGit,
  rerereCount = countRerereEntries,
  upstreamRef = DEFAULT_UPSTREAM_REF,
  cwd = process.cwd(),
} = {}) {
  const changes = parseNumstat(git(['diff', '--numstat', upstreamRef], cwd))
  const upstreamPaths = new Set(parseNameList(git(['ls-tree', '-r', '--name-only', upstreamRef], cwd)))
  const shared = changes.filter((entry) => upstreamPaths.has(entry.path))
  const changedForkOnly = changes.filter((entry) => !upstreamPaths.has(entry.path)).map((entry) => entry.path)
  const untracked = parseNameList(git(['ls-files', '--others', '--exclude-standard'], cwd))
  const delta = summarizeForkDelta(shared)
  return {
    upstream: {
      ref: upstreamRef,
      sha: git(['rev-parse', '--short', upstreamRef], cwd),
      committedAt: git(['log', '-1', '--format=%cs', upstreamRef], cwd),
    },
    branch: parseAheadBehind(git(['rev-list', '--left-right', '--count', `${upstreamRef}...HEAD`], cwd)),
    changedFiles: {
      total: changes.length + untracked.length,
      upstreamShared: shared.length,
      forkOnly: changedForkOnly.length + untracked.length,
    },
    shared: { files: shared.length, authored: delta.authored, generated: delta.generated },
    forkOnlyPaths: [...changedForkOnly, ...untracked].sort(),
    submodules: parseSubmodules(git(['submodule', 'status', '--recursive'], cwd)),
    rerereEntries: rerereCount(cwd),
  }
}

/**
 * Render collected metrics as the report FORK-FEATURES.md section 九 quotes.
 * @param {object} stats - Value returned by {@link collectForkStats}.
 * @returns {string} One `label` and `value` column pair per line, without a trailing newline.
 */
export function renderForkStats(stats) {
  const generated = stats.shared.generated.length === 0
    ? 'none'
    : stats.shared.generated
      .map((entry) => `${entry.path}: ${entry.added} added / ${entry.deleted} deleted`)
      .join(', ')
  const submodules = stats.submodules.length === 0
    ? 'none'
    : stats.submodules
      .map((entry) => `${entry.path} ${entry.pin.slice(0, 7)}${entry.describe === '' ? '' : ` (${entry.describe})`}`)
      .join(', ')
  return [
    `upstream            ${stats.upstream.ref} ${stats.upstream.sha} (${stats.upstream.committedAt})`,
    `master              ${stats.branch.behind} behind / ${stats.branch.ahead} ahead`,
    `relative changes    ${stats.changedFiles.total} files`
      + ` (upstream-shared ${stats.changedFiles.upstreamShared} / fork-only ${stats.changedFiles.forkOnly})`,
    `authored delta      ${stats.shared.authored.added} added / ${stats.shared.authored.deleted} deleted`
      + ` over ${stats.shared.authored.files} files`,
    `generated           ${generated}`,
    `submodules          ${submodules}`,
    `rerere entries      ${stats.rerereEntries}`,
  ].join('\n')
}

/** Whether this module is the process entry point rather than an imported module. */
const isDirectInvocation = process.argv[1] !== undefined
  && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isDirectInvocation) {
  try {
    const upstreamRef = process.argv.find((argument) => argument.startsWith('--upstream='))?.slice('--upstream='.length)
      ?? DEFAULT_UPSTREAM_REF
    const stats = collectForkStats({ upstreamRef })
    const asJson = process.argv.includes('--json')
    process.stdout.write(`${asJson ? JSON.stringify(stats, undefined, 2) : renderForkStats(stats)}\n`)
  } catch (error) {
    console.error(`[fork-stats] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
