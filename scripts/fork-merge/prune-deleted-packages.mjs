/**
 * Remove leftover build output of packages upstream deleted or renamed.
 *
 * A package directory whose `package.json` is gone while its ignored `lib/` and `node_modules/`
 * remain is invisible to git but visible to the host build's package discovery, which then imports
 * symbols the surviving module no longer exports (tsdown reports `MISSING_EXPORT`). Run this after
 * `git merge` and before the first build; it only removes directories git tracks nothing in.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..')

/** @returns package directories that carry build output but no manifest. */
function candidates() {
  const found = []
  const packagesRoot = join(REPOSITORY_ROOT, 'packages')
  for (const group of readdirSync(packagesRoot)) {
    const groupPath = join(packagesRoot, group)
    if (!statSync(groupPath).isDirectory()) continue
    for (const name of readdirSync(groupPath)) found.push(join(groupPath, name))
  }
  const applicationsRoot = join(REPOSITORY_ROOT, 'apps')
  for (const name of readdirSync(applicationsRoot)) found.push(join(applicationsRoot, name))
  return found
}

/** @param path - Candidate package directory. @returns whether git tracks any file inside it. */
function tracked(path) {
  return execFileSync('git', ['ls-files', '--', path], { cwd: REPOSITORY_ROOT, encoding: 'utf8' }).trim() !== ''
}

const orphans = candidates().filter(path => statSync(path).isDirectory()
  && existsSync(join(path, 'lib'))
  && !existsSync(join(path, 'package.json'))
  && !tracked(path))
for (const path of orphans) rmSync(path, { recursive: true, force: true })
process.stdout.write(`fork-merge: removed ${String(orphans.length)} leftover package director${orphans.length === 1 ? 'y' : 'ies'}\n`)
for (const path of orphans) process.stdout.write(`fork-merge:   ${relative(REPOSITORY_ROOT, path)}\n`)
