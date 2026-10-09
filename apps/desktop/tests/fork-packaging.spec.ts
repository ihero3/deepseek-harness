/**
 * Fork brand wiring.
 *
 * Upstream merges have silently reverted this artwork before, and the overrides live in a
 * fork-owned module rather than beside the upstream values they replace, so assert the paths where
 * the packaging pipeline reads them.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveMacOSSigningEnvironment } from '../scripts/desktop-release-environment.mjs'
import type { DesktopElectronBuilderConfig } from '../electron-builder.config.mjs'

const FORK_ASSETS = [
  'icon.png', 'icon.svg', 'icon-macos.png', 'icon-macos.svg', 'icon-windows.png', 'icon-windows.svg',
  'tray-windows.ico', 'brand.png', 'brand-2x.png', 'brand-dark.png', 'brand-dark-2x.png', 'uninstaller-sidebar.png',
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

/** Create the fork's Windows configuration, which carries the tray bitmap the shell loads. */
async function windowsConfig(): Promise<DesktopElectronBuilderConfig> {
  const { createElectronBuilderConfig } = await import('../scripts/electron-builder-config.mjs')
  return createElectronBuilderConfig({
    DSH_DESKTOP_APP_ID: 'com.example.fork',
    DSH_DESKTOP_TARGET_PLATFORM: 'win32',
    DSH_DESKTOP_TARGET_ARCH: 'x64',
    DSH_DESKTOP_UNSIGNED: '1',
    DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN: 'https://policy.example.com',
    DSH_DESKTOP_MANDATORY_UPDATE_CONFIG: JSON.stringify({ allowedAuthOrigins: ['https://login.example.com'] }),
  }, 'win32', 'x64')
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

  it('packages the fork ICO as the tray bitmap the Windows shell loads', async () => {
    const config = await windowsConfig()
    const trayIcon = config.extraResources.find(resource => resource.to === 'tray.ico')
    expect(trayIcon?.from).toBe(forkAsset('tray-windows.ico'))
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

  it('signs the unsigned macOS runtime without Apple credentials', () => {
    const source = readFileSync(fileURLToPath(new URL('../scripts/prepare-dsh.ts', import.meta.url)), 'utf8')
    const darwin = source.slice(source.indexOf("if (target.platform === 'darwin') {"), source.indexOf("'runtime:manifests'"))
    const unsignedAt = darwin.indexOf("if (process.env.DSH_DESKTOP_UNSIGNED === '1') {")
    const signedAt = darwin.indexOf('} else {', unsignedAt)
    expect(unsignedAt).toBeGreaterThan(-1)
    expect(signedAt).toBeGreaterThan(unsignedAt)
    const unsigned = darwin.slice(unsignedAt, signedAt).replace(/^\s*\/\/.*$/gmu, '')
    expect(unsigned).toContain('signMacOSRuntimeAdHoc(')
    // The Developer ID signer requires an identity, a ten-character team ID, and CSC_KEYCHAIN, so
    // resolving that environment inside the unsigned branch is exactly what made it unusable.
    expect(unsigned).not.toContain('resolveMacOSSigningEnvironment')
    expect(unsigned).not.toContain('CSC_KEYCHAIN')
    expect(darwin.slice(signedAt)).toContain('resolveMacOSSigningEnvironment')
    expect(() => resolveMacOSSigningEnvironment({})).toThrow(/DSH_DESKTOP_MACOS_SIGNING_IDENTITY/u)
  })
})
