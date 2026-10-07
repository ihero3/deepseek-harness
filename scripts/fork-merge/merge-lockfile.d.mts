/** Merge outcome for one generated lockfile. */
export interface LockfileMerge {
  /** Lockfile text the merge keeps; always the upstream side. */
  text: string
  /** Regenerate instruction, absent when both sides already matched. */
  notice: string | undefined
}

/**
 * Choose the lockfile text a merge keeps.
 * @param oursText - Fork-side lockfile text.
 * @param theirsText - Upstream-side lockfile text.
 * @returns Upstream's text, plus the regenerate notice when the two sides differed.
 */
export declare function resolveLockfileText(oursText: string, theirsText: string): LockfileMerge

/** Instruction the driver prints when it replaced a fork-side lockfile with upstream's. */
export declare const LOCKFILE_REGENERATE_NOTICE: string
