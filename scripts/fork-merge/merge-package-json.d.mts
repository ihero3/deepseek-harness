/** One key both sides of the merge changed to different data. */
export interface PackageJsonConflict {
  /** JSON-pointer path of the key, rooted at the document. */
  path: string
  /** Fork-side value, or the module's deleted-key sentinel. */
  ours: unknown
  /** Upstream-side value, or the module's deleted-key sentinel. */
  theirs: unknown
}

/** Result of merging one JSON manifest against its common ancestor. */
export interface PackageJsonMerge {
  /** Merged manifest text, formatted like the upstream side. */
  text: string
  /** Keys both sides changed; upstream's value won each one. */
  conflicts: readonly PackageJsonConflict[]
}

/**
 * Merge two JSON manifest texts against their common ancestor.
 * @param baseText - Ancestor manifest text; empty for an add/add merge.
 * @param oursText - Fork-side manifest text.
 * @param theirsText - Upstream-side manifest text.
 * @returns Merged text plus one entry per genuine conflict.
 * @throws When a side is not valid JSON.
 */
export declare function mergePackageJsonText(
  baseText: string,
  oursText: string,
  theirsText: string,
): PackageJsonMerge
