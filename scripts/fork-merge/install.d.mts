/** Merge driver name mapped to the git command registered for it. */
export declare const FORK_MERGE_DRIVERS: Readonly<Record<string, string>>

/** Attribute assignments `.gitattributes` carries so git consults the drivers. */
export declare const REQUIRED_ATTRIBUTES: readonly string[]

/** Driver section upstream removed but an existing checkout may still carry. */
export declare const OBSOLETE_DRIVER_SECTION: string

/**
 * Runs one `git config` invocation.
 * @param args - Arguments after `git config`.
 * @returns stdout when git succeeds with output, or undefined when git reports the value missing.
 */
export type GitConfigRunner = (args: readonly string[]) => string | undefined

/** Config files the installer writes. */
export interface DriverConfigPaths {
  /** Shared `.git/config`, read by every worktree. */
  shared: string
  /** This worktree's `config.worktree`. */
  worktree: string
}

/** What one installation pass changed. */
export interface DriverInstallation {
  /** Driver names written to the shared config. */
  installed: readonly string[]
  /** Obsolete sections removed, with the file they were removed from. */
  removed: readonly string[]
}

/**
 * Apply the fork's merge-driver settings.
 * @param run - Runs one `git config` invocation.
 * @param paths - Config files to write.
 * @returns Driver names written and obsolete sections removed.
 * @throws When a written driver does not read back.
 */
export declare function installForkMergeDrivers(
  run: GitConfigRunner,
  paths: DriverConfigPaths,
): DriverInstallation

/**
 * Attribute assignments a `.gitattributes` file is missing.
 * @param text - `.gitattributes` contents.
 * @returns Required assignment lines the file does not carry.
 */
export declare function missingAttributes(text: string): readonly string[]
