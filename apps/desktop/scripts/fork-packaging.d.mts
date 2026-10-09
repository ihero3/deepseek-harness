import type { DesktopElectronBuilderConfig } from '../electron-builder.config.mjs'

/** Product name the packaged application and its installers carry. */
export declare const FORK_PRODUCT_NAME: string

/** Prefix shared by every release artifact this fork publishes. */
export declare const FORK_ARTIFACT_PREFIX: string

/** Threerouter artwork for the target that renders it. */
export declare const FORK_ICONS: {
  readonly macOS: string
  readonly linux: string
  readonly windows: string
}

/** Threerouter tray icon installed as `process.resourcesPath/tray.ico` on Windows. */
export declare const FORK_TRAY_ICON: string

/**
 * Apply the fork's overrides to the configuration the upstream factory produced.
 * @param config - electron-builder configuration from the upstream factory.
 * @param context - Release facts the overrides read.
 * @param context.unsigned - Whether this build ships without a real signing identity.
 * @returns The configuration with the fork's product, Linux, and unsigned-macOS values.
 */
export declare function applyForkPackagingDelta(
  config: DesktopElectronBuilderConfig,
  context: { readonly unsigned: boolean },
): DesktopElectronBuilderConfig
