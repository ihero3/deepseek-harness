import type { DesktopAutoUpdateTarget } from './desktop-auto-update-environment.mjs'

/**
 * Directory name of every target the packaging pipeline can build. Linux x64 is packageable
 * but has no auto-update feed, so it is absent from {@link DesktopAutoUpdateTarget}.
 */
export type DesktopBuildTarget = DesktopAutoUpdateTarget | 'linux-x64'

/** Mutable target directories plus the shared immutable download cache. */
export interface DesktopTargetBuildPaths {
  readonly root: string
  readonly artifacts: string
  readonly runtime: string
  readonly packageSet: string
  readonly dsh: string
  readonly dshPnpm: string
  readonly electron: string
  readonly packedDsh: string
  readonly packedVendor: string
  readonly packedLandlock: string
  readonly downloads: string
}

/**
 * Resolve the fixed build target selected by a packaging environment.
 * @param env - Packaging environment.
 * @param hostPlatform - Build-host platform used when no target override exists.
 * @param hostArch - Build-host architecture used when no target override exists.
 * @returns Supported Desktop target name.
 */
export function resolveDesktopBuildTarget(
  env?: NodeJS.ProcessEnv,
  hostPlatform?: NodeJS.Platform,
  hostArch?: string,
): DesktopBuildTarget

/**
 * Resolve the Node.js platform of one build target.
 * @param target - Supported Desktop target name.
 * @returns Node.js platform of the packaged application.
 */
export function desktopTargetPlatform(target: DesktopBuildTarget): 'darwin' | 'win32' | 'linux'

/**
 * Return the mutable preparation and artifact directories owned by one release target.
 * @param target - Supported Desktop target name.
 * @returns Target paths plus the shared immutable download cache.
 */
export function desktopTargetBuildPaths(target: DesktopBuildTarget): DesktopTargetBuildPaths

/**
 * Resolve the paths owned by the target selected in a packaging environment.
 * @param env - Packaging environment.
 * @param hostPlatform - Build-host platform used when no target override exists.
 * @param hostArch - Build-host architecture used when no target override exists.
 * @returns Selected target paths.
 */
export function resolveDesktopTargetBuildPaths(
  env?: NodeJS.ProcessEnv,
  hostPlatform?: NodeJS.Platform,
  hostArch?: string,
): DesktopTargetBuildPaths
