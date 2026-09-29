/**
 * Fork brand wiring.
 *
 * Upstream merges have silently reverted this artwork before, and the overrides live in a
 * fork-owned module rather than beside the upstream values they replace, so assert the paths where
 * the packaging pipeline reads them.
 *
 * The tray icon is the deliberate exception: `render-tray-icon.ts` renders the upstream whale
 * vector, because the fork's flattened Windows export carries no `tray-glyph` group and the
 * renderer's enlargement is tuned to the whale's geometry.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { DesktopElectronBuilderConfig } from '../electron-builder.config.mjs'

const FORK_ASSETS = [
  'icon.png', 'icon.svg', 'icon-macos.png', 'icon-macos.svg', 'icon-windows.png', 'icon-windows.svg',
  'brand.png', 'brand-2x.png', 'brand-dark.png', 'brand-dark-2x.png', 'uninstaller-sidebar.png',
]

/** Absolute path of one committed fork artwork file. */
function forkAsset(name: string): string {
  return fileURLToPath(new URL(`../resources-fork/${name}`, import.meta.url))
}

/** Create the fork's Linux configuration, which carries every platform icon path. */
async function linuxConfig(): Promise<DesktopElectronBuilderConfig> {
  const { createElectronBuilderConfig } = await import('../scripts/electron-builder-config.mjs')
  return createElectronBuilderConfig({
    DSH_DESKTOP_APP_ID: 'com.example.fork',
    DSH_DESKTOP_TARGET_PLATFORM: 'linux',
    DSH_DESKTOP_TARGET_ARCH: 'x64',
  }, 'linux', 'x64')
}

describe('fork brand resources', () => {
  it('ships every artwork file the fork packaging paths name', () => {
    for (const name of FORK_ASSETS) expect(existsSync(forkAsset(name)), name).toBe(true)
  })

  it('reads the package icons from the fork artwork', async () => {
    const config = await linuxConfig()
    expect(config.mac.icon).toBe(forkAsset('icon-macos.png'))
    expect(config.linux.icon).toBe(forkAsset('icon.png'))
    expect(config.win.icon).toBe(forkAsset('icon-windows.png'))
    expect(config.productName).toBe('Deepseek Harness for Threerouter')
  })

  it('packages the fork artwork as the runtime icon the About panel loads', async () => {
    const config = await linuxConfig()
    const aboutIcon = config.extraResources.find(resource => resource.to === 'icon.png')
    expect(aboutIcon?.from).toBe(forkAsset('icon-windows.png'))
    expect(config.extraResources.map(resource => resource.to)).toEqual(['runtime', 'icon.png'])
  })

  it('keeps the localization bundle in the macOS extendInfo upstream assigns twice', async () => {
    const config = await linuxConfig()
    expect(config.mac.extendInfo.CFBundleLocalizations).toEqual(['en', 'zh_CN'])
    expect(config.mac.extendInfo.NSMicrophoneUsageDescription).toContain('microphone')
  })

  it('converts every installer bitmap from the fork artwork', () => {
    const converter = readFileSync(fileURLToPath(new URL('../scripts/prepare-windows-installer.ps1', import.meta.url)), 'utf8')
    expect(converter).toContain("Join-Path $PSScriptRoot '../resources-fork'")
    expect(converter).toContain('Join-Path $forkAssets "$asset.png"')
    expect(converter).toContain("@('brand', 'brand-2x', 'brand-dark', 'brand-dark-2x', 'uninstaller-sidebar')")
    expect(converter).not.toContain('assets/$asset.png')
  })
})
