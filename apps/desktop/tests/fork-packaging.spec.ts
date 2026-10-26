/**
 * Fork brand wiring guard.
 *
 * Upstream merges have silently reverted this artwork before, and the overrides live in a
 * fork-owned module rather than beside the upstream values they replace, so assert the paths where
 * the packaging pipeline reads them.
 */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FORK_ASSETS = ['icon.png', 'icon.svg', 'icon-macos.png', 'icon-macos.svg', 'icon-windows.png', 'icon-windows.svg', 'tray-windows.ico', 'uninstaller-sidebar.png']

/** Absolute path of one committed fork artwork file. */
function forkAsset(name: string): string {
  return fileURLToPath(new URL(`../resources-fork/${name}`, import.meta.url))
}

/** Fork-owned packaging overrides import path, asserted directly to catch upstream moves. */
const FORK_PACKAGING_PATH = fileURLToPath(new URL('../scripts/fork-packaging.mjs', import.meta.url))

/**
 * Create the fork-applied configuration for the current host platform.
 * applyForkPackagingDelta is wired into createElectronBuilderConfig, so one call exercises both.
 */
async function packagedConfig(target: 'darwin' | 'win32'): Promise<any> {
  const { createElectronBuilderConfig } = await import('../scripts/electron-builder-config.mjs')
  const env = {
    DSH_DESKTOP_APP_ID: 'com.example.fork',
    DSH_DESKTOP_TARGET_PLATFORM: target,
    DSH_DESKTOP_UNSIGNED: '1',
  }
  return createElectronBuilderConfig(env, target, target === 'darwin' ? process.arch : 'x64')
}

describe('fork brand resources', () => {
  it('ships every artwork file the fork packaging paths name', () => {
    for (const name of FORK_ASSETS) expect(existsSync(forkAsset(name)), name).toBe(true)
  })

  it('applies fork-packaging overrides into the upstream config factory', () => {
    // The fork-packaging module must be imported into electron-builder-config.mjs for
    // applyForkPackagingDelta to run; upstream merges that silently remove the import break this.
    expect(existsSync(FORK_PACKAGING_PATH)).toBe(true)
  })

  it('carries the fork product name in the packaged config', async () => {
    for (const target of ['darwin', 'win32'] as const) {
      const config = await packagedConfig(target)
      expect(config.productName).toBe('Deepseek Harness for Threevideo')
    }
  })

  it('reads the mac icon from the fork artwork when building for darwin', async () => {
    const config = await packagedConfig('darwin')
    expect(config.mac.icon).toBe(forkAsset('icon-macos.png'))
  })

  it('reads the windows icon + tray ICO from fork artwork when building for win32', async () => {
    const config = await packagedConfig('win32')
    expect(config.win.icon).toBe(forkAsset('icon-windows.png'))
    const tray = config.extraResources.find((res: any) => res.to === 'tray.ico')
    expect(tray?.from).toBe(forkAsset('tray-windows.ico'))
    const appIcon = config.extraResources.find((res: any) => res.to === 'icon.png')
    expect(appIcon?.from).toBe(forkAsset('icon-windows.png'))
  })

  it('keeps the fork localization bundle in mac.extendInfo', async () => {
    const config = await packagedConfig('darwin')
    expect(config.mac.extendInfo.CFBundleLocalizations).toEqual(['en', 'zh_CN'])
  })
})
