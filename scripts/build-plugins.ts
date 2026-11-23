/**
 * Run one package script in each private product plugin checkout.
 *
 * The plugins are independent repositories. They may live in this repository's `plugins/` directory or anywhere named
 * by DSH_PRIVATE_PLUGIN_ROOTS, which takes precedence. Consumers read their committed `lib/`.
 */

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pnpmInvocation } from './pnpm-invocation.ts'
import {
  PRIVATE_PLUGIN_NAMES,
  PRIVATE_PLUGIN_ROOTS_ENV,
  privatePluginRoots,
  resolvePrivatePluginDir,
} from '../apps/desktop/src/plugin-directories.ts'

const repositoryRoot = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const onlyIndex = args.indexOf('--only')
const only = onlyIndex === -1 ? undefined : args[onlyIndex + 1]
if (onlyIndex !== -1 && (only === undefined || only.startsWith('--'))) {
  throw new Error('build:plugins: --only requires a plugin name')
}
const positional = onlyIndex === -1
  ? args
  : args.filter((_, index) => index !== onlyIndex && index !== onlyIndex + 1)
if (positional.length > 1) {
  throw new Error(`build:plugins: unexpected argument ${String(positional[1])}`)
}
const [script = 'bundle'] = positional
const names = only === undefined
  ? PRIVATE_PLUGIN_NAMES
  : PRIVATE_PLUGIN_NAMES.filter(name => name === only)
if (names.length === 0) throw new Error(`build:plugins: ${String(only)} is not a private plugin`)
const roots = privatePluginRoots(repositoryRoot)
for (const name of names) {
  const directory = resolvePrivatePluginDir(name, roots)
  if (directory === undefined) {
    throw new Error(
      `build:plugins: ${name} is not checked out under ${roots.join(', ')}; `
      + `set ${PRIVATE_PLUGIN_ROOTS_ENV} to the directory that holds it`,
    )
  }
  const { command, args } = pnpmInvocation(['run', script])
  const result = spawnSync(command, args, { cwd: directory, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${name}: pnpm run ${script} failed with status ${String(result.status)}`)
  }
}
