/**
 * Materialize the product's private plugins inside the packaged dsh runtime.
 *
 * The Threerouter brand and the image/video tool live in `plugins/`, which is
 * outside the dsh core package set and therefore absent from a packaged
 * install. The packaged profile lists them as bundles, so the prepared dsh
 * node_modules needs their built package directories next to the dsh family.
 */

import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Private product plugins shipped inside the packaged dsh node_modules. */
export const PRIVATE_PLUGIN_NAMES = ['dsh-image-video', 'dsh-plugin-threerouter'] as const

/** Files copied from each plugin workspace, relative to its package root. */
const PLUGIN_RUNTIME_FILES = ['package.json', 'cordis.patch.yml', 'lib'] as const

/** One private plugin copied into the target dsh node_modules. */
export interface MaterializedPrivatePlugin {
  /** Package name, matching the manifest and the profile bundle name. */
  readonly name: string
  /** Source plugin workspace directory. */
  readonly sourceDir: string
  /** Destination directory inside the dsh node_modules. */
  readonly targetDir: string
  /** Built host entry, verified to exist after copying. */
  readonly hostEntry: string
  /** Built client entry when the package exports a `./client` face. */
  readonly clientEntry?: string
}

/**
 * Resolve the runtime entry files declared by one plugin manifest.
 *
 * @param sourceDir - Plugin workspace directory.
 * @param expectedName - Expected package name.
 * @param expectedVersion - Release version the runtime binds.
 * @returns The resolved host and optional client entry paths.
 */
export function readPrivatePluginEntries(
  sourceDir: string,
  expectedName: string,
  expectedVersion: string,
): { hostEntry: string; clientEntry?: string } {
  const manifestPath = join(sourceDir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    name?: unknown
    version?: unknown
    exports?: unknown
  }
  if (manifest.name !== expectedName) {
    throw new Error(`desktop private plugins: ${manifestPath} names ${String(manifest.name)}, expected ${expectedName}`)
  }
  if (manifest.version !== expectedVersion) {
    throw new Error(`desktop private plugins: ${expectedName} version ${String(manifest.version)} does not match the release version ${expectedVersion}`)
  }
  const exports = manifest.exports as Record<string, { default?: string }> | undefined
  const hostExport = exports?.['.']?.default
  if (typeof hostExport !== 'string') {
    throw new Error(`desktop private plugins: ${expectedName} exports no default host entry`)
  }
  const hostEntry = join(sourceDir, hostExport)
  if (!existsSync(hostEntry)) {
    throw new Error(`desktop private plugins: ${expectedName} host entry ${hostExport} is not built; run the plugin bundle script first`)
  }
  const clientExport = exports?.['./client']?.default
  if (clientExport !== undefined) {
    const clientEntry = join(sourceDir, clientExport)
    if (!existsSync(clientEntry)) {
      throw new Error(`desktop private plugins: ${expectedName} client entry ${clientExport} is not built; run the plugin bundle script first`)
    }
    return { hostEntry, clientEntry }
  }
  return { hostEntry }
}

/**
 * Copy each private plugin's built package into the target dsh node_modules.
 *
 * @param pluginsRoot - Workspace `plugins/` directory.
 * @param targetNodeModules - The prepared dsh runtime node_modules directory.
 * @param expectedVersion - Release version every plugin must declare.
 * @returns The materialized plugins with their resolved entry paths.
 */
export function materializePrivatePlugins(
  pluginsRoot: string,
  targetNodeModules: string,
  expectedVersion: string,
): MaterializedPrivatePlugin[] {
  const materialized: MaterializedPrivatePlugin[] = []
  for (const name of PRIVATE_PLUGIN_NAMES) {
    const sourceDir = join(pluginsRoot, name)
    if (!existsSync(sourceDir)) {
      throw new Error(`desktop private plugins: source directory ${sourceDir} does not exist`)
    }
    const { hostEntry, clientEntry } = readPrivatePluginEntries(sourceDir, name, expectedVersion)
    for (const file of PLUGIN_RUNTIME_FILES) {
      if (!existsSync(join(sourceDir, file))) {
        throw new Error(`desktop private plugins: ${name} is missing ${file}`)
      }
    }
    const targetDir = join(targetNodeModules, name)
    rmSync(targetDir, { recursive: true, force: true })
    for (const file of PLUGIN_RUNTIME_FILES) {
      cpSync(join(sourceDir, file), join(targetDir, file), { recursive: true })
    }
    if (!existsSync(join(targetDir, 'cordis.patch.yml'))) {
      throw new Error(`desktop private plugins: ${name} copy is missing cordis.patch.yml`)
    }
    const copiedHostEntry = join(targetDir, hostEntry.slice(sourceDir.length + 1))
    if (clientEntry === undefined) {
      materialized.push({
        name,
        sourceDir,
        targetDir,
        hostEntry: copiedHostEntry,
      })
    } else {
      materialized.push({
        name,
        sourceDir,
        targetDir,
        hostEntry: copiedHostEntry,
        clientEntry: join(targetDir, clientEntry.slice(sourceDir.length + 1)),
      })
    }
  }
  return materialized
}

/**
 * Import each copied host entry to prove its imports resolve from the packaged
 * dsh node_modules. Plugins only register services when applied to a context,
 * so importing the module has no host side effects.
 *
 * @param plugins - Plugins materialized by {@link materializePrivatePlugins}.
 */
export async function verifyPrivatePluginHostImports(plugins: readonly MaterializedPrivatePlugin[]): Promise<void> {
  for (const plugin of plugins) {
    await import(pathToFileURL(plugin.hostEntry).href)
  }
}
