/** One changed path with its line counts. */
export interface NumstatEntry {
  /** Path relative to the repository root. */
  readonly path: string
  /** Added lines; binary paths report zero. */
  readonly added: number
  /** Deleted lines; binary paths report zero. */
  readonly deleted: number
}

/** One submodule pin. */
export interface SubmodulePin {
  /** Submodule path. */
  readonly path: string
  /** Pinned commit as recorded in the index. */
  readonly pin: string
  /** Nearest tag and distance, empty when the pin has no tag. */
  readonly describe: string
}

/** Line totals over one class of changed files. */
export interface ForkDeltaTotals {
  /** Number of files counted. */
  readonly files: number
  /** Added lines. */
  readonly added: number
  /** Deleted lines. */
  readonly deleted: number
}

/** Baseline metrics for one fork/upstream comparison. */
export interface ForkStats {
  /** Identity of the upstream ref compared against. */
  readonly upstream: { readonly ref: string; readonly sha: string; readonly committedAt: string }
  /** Commit counts on each side of `upstreamRef...HEAD`. */
  readonly branch: { readonly behind: number; readonly ahead: number }
  /** Changed-file counts by class. */
  readonly changedFiles: { readonly total: number; readonly upstreamShared: number; readonly forkOnly: number }
  /** Authored and generated deltas over files upstream also carries. */
  readonly shared: { readonly files: number; readonly authored: ForkDeltaTotals; readonly generated: readonly NumstatEntry[] }
  /** Changed paths upstream does not carry, sorted. */
  readonly forkOnlyPaths: readonly string[]
  /** Submodule pins. */
  readonly submodules: readonly SubmodulePin[]
  /** Recorded rerere resolutions. */
  readonly rerereEntries: number
}

/** Files a build regenerates or a merge driver owns, whose diff lines are not fork authorship. */
export declare const GENERATED_PATHS: readonly string[]

/** Upstream ref the metrics compare the current checkout against. */
export declare const DEFAULT_UPSTREAM_REF: string

/**
 * Run one git command in a checkout.
 * @param args - Arguments after `git`.
 * @param cwd - Repository root.
 * @returns Command stdout without its trailing newline.
 */
export declare function runGit(args: readonly string[], cwd?: string): string

/**
 * Count the recorded rerere resolutions for a checkout.
 * @param cwd - Repository root.
 * @returns Directory entries under git's `rr-cache`.
 */
export declare function countRerereEntries(cwd?: string): number

/**
 * Parse `git diff --numstat` output.
 * @param text - numstat output, one `added\tdeleted\tpath` line per changed file.
 * @returns One entry per changed path; binary markers (`-`) count as zero lines.
 */
export declare function parseNumstat(text: string): NumstatEntry[]

/**
 * Parse newline-separated git path output.
 * @param text - Path listing, one path per line.
 * @returns Paths in the order git printed them.
 */
export declare function parseNameList(text: string): string[]

/**
 * Parse `git rev-list --left-right --count` output.
 * @param text - `<behind>\t<ahead>`.
 * @returns Commit counts on each side of the comparison.
 */
export declare function parseAheadBehind(text: string): { behind: number; ahead: number }

/**
 * Parse `git submodule status --recursive` output.
 * @param text - One `<pin> <path> (<describe>)` line per submodule.
 * @returns Pins in the order git printed them.
 */
export declare function parseSubmodules(text: string): SubmodulePin[]

/**
 * Split changed files into generated paths and fork-authored paths.
 * @param entries - Numstat entries for every path the fork changed.
 * @param generatedPaths - Paths excluded from the authored delta.
 * @returns Line totals for authored paths, plus the generated entries counted apart.
 */
export declare function summarizeForkDelta(
  entries: readonly NumstatEntry[],
  generatedPaths?: readonly string[],
): { authored: ForkDeltaTotals; generated: NumstatEntry[] }

/**
 * Collect the fork's baseline metrics against one upstream ref.
 * @param options - Collection inputs.
 * @returns Upstream identity, ahead/behind counts, changed-file classes, submodule pins, and the authored delta.
 */
export declare function collectForkStats(options?: {
  runGit?: (args: readonly string[], cwd: string) => string
  rerereCount?: (cwd: string) => number
  upstreamRef?: string
  cwd?: string
}): ForkStats

/**
 * Render collected metrics as the report FORK-FEATURES.md section 九 quotes.
 * @param stats - Value returned by `collectForkStats`.
 * @returns One `label` and `value` column pair per line, without a trailing newline.
 */
export declare function renderForkStats(stats: ForkStats): string
