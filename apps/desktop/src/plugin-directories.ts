/** Locate the private product plugin checkouts used by the plugin build and Desktop development. */

import { existsSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'

/** Private product plugins listed as profile bundles. */
export const PRIVATE_PLUGIN_NAMES = ['dsh-image-video', 'dsh-plugin-threevideo'] as const

/**
 * Environment variable naming additional directories that hold private plugin checkouts.
 * Entries are separated by the platform path delimiter and take precedence over `plugins/`.
 */
export const PRIVATE_PLUGIN_ROOTS_ENV = 'DSH_PRIVATE_PLUGIN_ROOTS'

/**
 * Directories searched for private plugin checkouts, in priority order.
 * @param repositoryRoot - Repository root that owns the default `plugins/` directory.
 * @param environment - Environment supplying {@link PRIVATE_PLUGIN_ROOTS_ENV}.
 * @returns Absolute candidate directories, deduplicated.
 */
export function privatePluginRoots(
  repositoryRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const configured = (environment[PRIVATE_PLUGIN_ROOTS_ENV] ?? '')
    .split(delimiter)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .map(entry => resolve(entry))
  return [...new Set([...configured, join(repositoryRoot, 'plugins')])]
}

/**
 * Locate one private plugin checkout among the candidate roots.
 * @param name - Package name of the plugin.
 * @param roots - Directories from {@link privatePluginRoots}.
 * @returns The first root that holds a checkout, or undefined when none does.
 */
export function resolvePrivatePluginDir(name: string, roots: readonly string[]): string | undefined {
  return roots
    .map(root => join(root, ...name.split('/')))
    .find(directory => existsSync(join(directory, 'package.json')))
}
