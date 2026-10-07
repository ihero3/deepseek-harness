/**
 * Fork-owned merge driver for `pnpm-lock.yaml`.
 *
 * The lockfile is generated, so a three-way text merge only ever produces a file no `pnpm` run
 * agrees with. This driver keeps upstream's lockfile and asks for the regenerate that restores the
 * fork's `plugins/*` importers and the workspace override. Git runs a driver only when both sides
 * changed the file, so there is no one-sided case to preserve.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Instruction the driver prints when it replaced a fork-side lockfile with upstream's. */
export const LOCKFILE_REGENERATE_NOTICE =
  'kept upstream\'s lockfile; run `pnpm install` before committing to restore the fork importers'

/**
 * Choose the lockfile text a merge keeps.
 * @param oursText - Fork-side lockfile text.
 * @param theirsText - Upstream-side lockfile text.
 * @returns Upstream's text, plus the regenerate notice when the two sides differed.
 */
export function resolveLockfileText(oursText, theirsText) {
  return {
    text: theirsText,
    notice: oursText === theirsText ? undefined : LOCKFILE_REGENERATE_NOTICE,
  }
}

/** Whether this module is the process entry point rather than an imported module. */
const isDriverInvocation = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isDriverInvocation) {
  const [basePath, oursPath, theirsPath, , filePath] = process.argv.slice(2)
  try {
    if (basePath === undefined || oursPath === undefined || theirsPath === undefined) {
      throw new Error('usage: merge-lockfile.mjs <ancestor> <ours> <theirs>')
    }
    const { text, notice } = resolveLockfileText(readFileSync(oursPath, 'utf8'), readFileSync(theirsPath, 'utf8'))
    writeFileSync(oursPath, text)
    if (notice !== undefined) console.error(`[fork-merge] ${filePath ?? oursPath}: ${notice}`)
  } catch (error) {
    console.error(`[fork-merge] ${filePath ?? oursPath}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
