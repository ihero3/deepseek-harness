/**
 * Register the fork's git merge drivers in this checkout.
 *
 * `.gitattributes` only names a driver; git reads the command from config, which is per checkout and
 * cannot be committed. Run this once per clone — FORK-SYNC.md makes it step 0 of every sync. An
 * unregistered driver falls back to the ordinary text merge, so a missing registration costs the
 * resolution this fork removed rather than breaking the merge.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Merge driver name mapped to the command git runs for it. */
export const FORK_MERGE_DRIVERS = {
  'fork-package-json': 'node scripts/fork-merge/merge-package-json.mjs %O %A %B %L %P',
  'fork-lockfile': 'node scripts/fork-merge/merge-lockfile.mjs %O %A %B %L %P',
}

/** Attribute assignments `.gitattributes` carries so git consults the drivers. */
export const REQUIRED_ATTRIBUTES = [
  '/package.json merge=fork-package-json',
  '/apps/desktop/package.json merge=fork-package-json',
  '/pnpm-lock.yaml merge=fork-lockfile',
]

/** Driver section upstream removed but an existing checkout may still carry. */
export const OBSOLETE_DRIVER_SECTION = 'merge.dsh-translation-pairing'

/**
 * Git's own record of the driver section, whatever layer still holds it.
 * @returns The `git config --get-regexp` pattern for the obsolete section.
 */
function obsoletePattern() {
  return `^${OBSOLETE_DRIVER_SECTION.replaceAll('.', '\\.')}\\.`
}

/**
 * Apply the fork's merge-driver settings.
 * @param run - Runs one `git config` invocation; returns stdout when git succeeds with output, or undefined when git reports the value missing.
 * @param paths - Config files to write: the shared `.git/config` and this worktree's `config.worktree`.
 * @returns Driver names written and obsolete sections removed.
 * @throws When a written driver does not read back, so a silent registration failure stays visible.
 */
export function installForkMergeDrivers(run, paths) {
  const installed = []
  for (const [name, command] of Object.entries(FORK_MERGE_DRIVERS)) {
    const key = `merge.${name}.driver`
    run(['--file', paths.shared, key, command])
    if (run(['--file', paths.shared, '--get', key]) !== command) {
      throw new Error(`git did not keep ${key} in ${paths.shared}`)
    }
    installed.push(name)
  }

  const removed = []
  for (const file of [paths.worktree, paths.shared]) {
    if (run(['--file', file, '--get-regexp', obsoletePattern()]) === undefined) continue
    run(['--file', file, '--remove-section', OBSOLETE_DRIVER_SECTION])
    removed.push(`${OBSOLETE_DRIVER_SECTION} from ${file}`)
  }

  return { installed, removed }
}

/**
 * Attribute assignments a `.gitattributes` file is missing.
 * @param text - `.gitattributes` contents.
 * @returns Required assignment lines the file does not carry.
 */
export function missingAttributes(text) {
  const lines = new Set(text.split('\n').map(line => line.trim()))
  return REQUIRED_ATTRIBUTES.filter(attribute => !lines.has(attribute))
}

/**
 * Read one `git rev-parse` path from the current checkout.
 * @param args - Arguments naming the path to resolve.
 * @param cwd - Directory git runs in.
 * @returns The absolute path git reported.
 * @throws When git fails, so a wrong checkout cannot register drivers somewhere unexpected.
 */
function gitPath(args, cwd) {
  const result = spawnSync('git', ['rev-parse', ...args], { cwd, encoding: 'utf8' })
  if (result.status !== 0 || result.stdout.trim() === '') {
    throw new Error(`git rev-parse ${args.join(' ')} failed: ${result.stderr.trim()}`)
  }
  return resolve(cwd, result.stdout.trim())
}

/**
 * Build the `git config` runner for one checkout.
 * @param cwd - Directory git runs in.
 * @returns A runner that returns stdout, or undefined for the missing-value exit code git uses.
 */
function configRunner(cwd) {
  return (args) => {
    const result = spawnSync('git', ['config', ...args], { cwd, encoding: 'utf8' })
    if (result.error !== undefined) throw result.error
    if (result.status === 0) return result.stdout.trim()
    const lookupMissing = (args.includes('--get') || args.includes('--get-regexp')) && result.status === 1
    if (lookupMissing) return undefined
    throw new Error(`git config ${args.join(' ')} failed: ${result.stderr.trim()}`)
  }
}

/** Whether this module is the process entry point rather than an imported module. */
const isDirectInvocation = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isDirectInvocation) {
  try {
    const cwd = process.cwd()
    const root = gitPath(['--show-toplevel'], cwd)
    const paths = {
      shared: join(gitPath(['--git-common-dir'], root), 'config'),
      worktree: gitPath(['--git-path', 'config.worktree'], root),
    }
    const { installed, removed } = installForkMergeDrivers(configRunner(root), paths)
    console.log(`[fork-merge] ${root}`)
    for (const name of installed) console.log(`[fork-merge]   merge.${name}.driver = ${FORK_MERGE_DRIVERS[name]}`)
    for (const entry of removed) console.log(`[fork-merge]   removed obsolete ${entry}`)
    const attributes = join(root, '.gitattributes')
    const missing = missingAttributes(existsSync(attributes) ? readFileSync(attributes, 'utf8') : '')
    if (missing.length > 0) {
      console.error('[fork-merge] .gitattributes is missing:')
      for (const attribute of missing) console.error(`[fork-merge]   ${attribute}`)
    }
  } catch (error) {
    console.error(`[fork-merge] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
