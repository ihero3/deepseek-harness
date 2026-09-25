/** Copy the built private plugins into the prepared dsh runtime. */

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { resolveDesktopTargetBuildPaths } from './desktop-build-paths.mjs'
import {
  materializePrivatePlugins,
  verifyPrivatePluginHostImports,
} from '../src/private-plugins.ts'

const APP_ROOT = resolve(import.meta.dirname, '..')
const REPOSITORY_ROOT = resolve(APP_ROOT, '..', '..')

const rootManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8')) as { version?: string }
if (rootManifest.version === undefined) {
  throw new Error('desktop prepare plugins: repository package.json has no version')
}
const buildPaths = resolveDesktopTargetBuildPaths()
const plugins = materializePrivatePlugins(
  join(REPOSITORY_ROOT, 'plugins'),
  join(buildPaths.dsh, 'node_modules'),
  rootManifest.version,
)
await verifyPrivatePluginHostImports(plugins)
process.stdout.write(`desktop prepare plugins: copied ${plugins.map(plugin => plugin.name).join(', ')} into the packaged dsh runtime\n`)
