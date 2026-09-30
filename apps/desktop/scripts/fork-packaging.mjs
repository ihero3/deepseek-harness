/**
 * Fork-owned Desktop packaging overrides.
 *
 * Upstream owns `resources/` and `installer/assets/`, so every Threerouter artwork file lives in
 * `../resources-fork/`. The package icons are named here and the installer artwork in
 * `prepare-windows-installer.ps1`; an upstream icon redesign then merges without touching the files
 * this fork edits. See FORK-SYNC.md for the sync procedure.
 */

import { fileURLToPath } from 'node:url'

/** Product name the packaged application and its installers carry. */
export const FORK_PRODUCT_NAME = 'Deepseek Harness for Threerouter'

/** Prefix shared by every release artifact this fork publishes. */
export const FORK_ARTIFACT_PREFIX = 'dsh-threerouter'

/** Threerouter artwork for the target that renders it. */
export const FORK_ICONS = {
  macOS: fileURLToPath(new URL('../resources-fork/icon-macos.png', import.meta.url)),
  linux: fileURLToPath(new URL('../resources-fork/icon.png', import.meta.url)),
  windows: fileURLToPath(new URL('../resources-fork/icon-windows.png', import.meta.url)),
}

/**
 * Apply the fork's overrides to the configuration the upstream factory produced.
 *
 * Only final values are replaced here. Overrides that have to run before an upstream helper call —
 * the Linux policy and update-feed exemptions and the unsigned macOS signing checks — stay in
 * `electron-builder-config.mjs` next to the calls they guard.
 * @param config - electron-builder configuration from the upstream factory.
 * @param context - Release facts the overrides read.
 * @param context.unsigned - Whether this build ships without a real signing identity.
 * @returns The configuration with the fork's product, Linux, and unsigned-macOS values.
 */
export function applyForkPackagingDelta(config, { unsigned }) {
  const mac = {
    ...config.mac,
    icon: FORK_ICONS.macOS,
    // The application locale is matched against this bundle, so the fork's two locales are stated
    // here rather than inherited from whatever upstream declares.
    extendInfo: { CFBundleLocalizations: ['en', 'zh_CN'], ...config.mac.extendInfo },
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
    // Unsigned builds carry their own suffix so a shared file can never pass for a release artifact.
    artifactName: `${FORK_ARTIFACT_PREFIX}-\${version}-\${os}-\${arch}${unsigned ? '-unsigned' : ''}.\${ext}`,
    mac,
    // The packaged About and notification icon is the Windows target's own bitmap, installed as
    // `process.resourcesPath/icon.png`.
    extraResources: config.extraResources.map(resource => (
      resource.to === 'icon.png' ? { ...resource, from: FORK_ICONS.windows } : resource
    )),
    // Ad-hoc signed disk images must not run a second identity lookup.
    dmg: unsigned ? { ...config.dmg, sign: false } : config.dmg,
    win: { ...config.win, icon: FORK_ICONS.windows },
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
  }
}
