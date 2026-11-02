/**
 * Fork-owned Desktop packaging overrides.
 *
 * Upstream owns `resources/` and `installer/assets/`, so every Threevideo artwork file lives in
 * `../resources-fork/`. The package icons are named here and the installer artwork in
 * `prepare-windows-installer.ps1`; an upstream icon redesign then merges without touching the files
 * this fork edits. See FORK-SYNC.md for the sync procedure.
 */

import { fileURLToPath } from 'node:url'

/** Product name the packaged application and its installers carry. */
export const FORK_PRODUCT_NAME = 'Deepseek Harness for Threevideo'

/** Prefix shared by every release artifact this fork publishes. */
export const FORK_ARTIFACT_PREFIX = 'dsh-threevideo'

/** Threevideo artwork for the target that renders it. */
export const FORK_ICONS = {
  macOS: fileURLToPath(new URL('../resources-fork/icon-macos.png', import.meta.url)),
  linux: fileURLToPath(new URL('../resources-fork/icon.png', import.meta.url)),
  windows: fileURLToPath(new URL('../resources-fork/icon-windows.png', import.meta.url)),
}

/** Threevideo tray icon installed as `process.resourcesPath/tray.ico` on Windows. */
export const FORK_TRAY_ICON = fileURLToPath(new URL('../resources-fork/tray-windows.ico', import.meta.url))

/**
 * Apply the fork's overrides to the configuration the upstream factory produced.
 *
 * Only final values are replaced here. Overrides that have to run before an upstream helper call —
 * the Linux policy and update-feed exemptions and the unsigned macOS signing checks — stay in
 * `electron-builder-config.mjs` next to the calls they guard.
 * @param config - electron-builder configuration from the upstream factory.
 * @param context - Release facts the overrides read.
 * @param context.unsigned - Whether this build ships without a real signing identity.
 * @param context.artifactSuffix - Upstream's packaging-mode marker (`-unsigned` / `-unnotarized`).
 * @returns The configuration with the fork's product, Linux, and unsigned-macOS values.
 */
export function applyForkPackagingDelta(config, { unsigned, artifactSuffix = unsigned ? '-unsigned' : '' }) {
  const upstreamLocales = config.mac.extendInfo.CFBundleLocalizations
  const declaredLocales = Array.isArray(upstreamLocales) ? upstreamLocales : []
  const mac = {
    ...config.mac,
    icon: FORK_ICONS.macOS,
    // Upstream declares the bundle localizations it ships; the fork's requirement is only that its own
    // two product locales stay declared, so keep upstream's list and add either one if it is missing.
    extendInfo: {
      ...config.mac.extendInfo,
      CFBundleLocalizations: [...declaredLocales, ...['en', 'zh_CN'].filter(locale => !declaredLocales.includes(locale))],
    },
  }
  if (unsigned) {
    // An ad-hoc signature keeps the bundle launchable without an identity, so nothing is notarized
    // and the code-signing requirements are off.
    mac.identity = '-'
    mac.forceCodeSigning = false
    mac.hardenedRuntime = false
    mac.notarize = false
  }
  return {
    ...config,
    productName: FORK_PRODUCT_NAME,
    // The fork's own prefix, keeping upstream's packaging-mode marker so an unsigned or unnotarized
    // build can never share a name with a release artifact.
    artifactName: `${FORK_ARTIFACT_PREFIX}-\${version}-\${os}-\${arch}${artifactSuffix}.\${ext}`,
    mac,
    // The packaged About and notification icon is the Windows target's own bitmap, installed as
    // `process.resourcesPath/icon.png`; the Windows tray icon is the fork's own ICO, installed as
    // `process.resourcesPath/tray.ico`.
    extraResources: config.extraResources.map(resource => {
      if (resource.to === 'icon.png') return { ...resource, from: FORK_ICONS.windows }
      if (resource.to === 'tray.ico') return { ...resource, from: FORK_TRAY_ICON }
      return resource
    }),
    // Ad-hoc signed disk images must not run a second identity lookup.
    dmg: unsigned ? { ...config.dmg, sign: false } : config.dmg,
    win: { ...config.win, icon: FORK_ICONS.windows },
    // upstream dropped linux target in resolveDesktopBuildTarget, but still emits a linux
    // platform block in the config object; keep the override guarded so future upstream removals
    // of config.linux don't crash applyForkPackagingDelta.
    ...(config.linux ? {
      linux: {
        ...config.linux,
        maintainer: 'ihero3 <ihero.cn@gmail.com>',
        icon: FORK_ICONS.linux,
        // Keep the x64 spelling shared with the other release targets; electron-builder would spell
        // x86_64 for AppImage and amd64 for deb.
        artifactName: `${FORK_ARTIFACT_PREFIX}-\${version}-linux-x64.\${ext}`,
        executableName: FORK_ARTIFACT_PREFIX,
        target: ['AppImage', 'deb'],
      },
    } : {}),
  }
}
