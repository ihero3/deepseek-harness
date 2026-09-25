import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import {
  materializePrivatePlugins,
  PRIVATE_PLUGIN_NAMES,
  readPrivatePluginEntries,
  verifyPrivatePluginHostImports,
} from '../src/private-plugins.ts'

const VERSION = '0.1.6-alpha.2'
const roots: string[] = []

function makeRoot(): { pluginsRoot: string; nodeModules: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), 'dsh-private-plugins-'))
  const pluginsRoot = join(root, 'plugins')
  const nodeModules = join(root, 'dsh', 'node_modules')
  roots.push(root)
  return { pluginsRoot, nodeModules, root }
}

function writePlugin(
  pluginsRoot: string,
  name: string,
  body = 'export default {}',
  withClient = false,
): void {
  const dir = join(pluginsRoot, name)
  mkdirSync(dir, { recursive: true })
  const exports = withClient
    ? {
      '.': { default: './lib/host/plugin.js' },
      './client': { default: './lib/client/plugin.js' },
    }
    : { '.': { default: './lib/index.js' } }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name, version: VERSION, exports }, null, 2)}\n`)
  writeFileSync(join(dir, 'cordis.patch.yml'), 'id: fixture\n')
  if (withClient) {
    mkdirSync(join(dir, 'lib/host'), { recursive: true })
    mkdirSync(join(dir, 'lib/client'), { recursive: true })
    writeFileSync(join(dir, 'lib/host/plugin.js'), body)
    writeFileSync(join(dir, 'lib/client/plugin.js'), 'client')
  } else {
    mkdirSync(join(dir, 'lib'), { recursive: true })
    writeFileSync(join(dir, 'lib/index.js'), body)
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

it('copies every private plugin with its manifest, patch file, and built lib', () => {
  const { pluginsRoot, nodeModules } = makeRoot()
  writePlugin(pluginsRoot, 'dsh-image-video')
  writePlugin(pluginsRoot, 'dsh-plugin-threerouter', 'export default {}', true)
  const plugins = materializePrivatePlugins(pluginsRoot, nodeModules, VERSION)
  expect(plugins.map(plugin => plugin.name)).toEqual([...PRIVATE_PLUGIN_NAMES])
  const imageVideo = plugins[0]!
  expect(imageVideo.clientEntry).toBeUndefined()
  expect(existsSync(join(nodeModules, 'dsh-image-video/package.json'))).toBe(true)
  expect(existsSync(join(nodeModules, 'dsh-image-video/cordis.patch.yml'))).toBe(true)
  expect(readFileSync(join(nodeModules, 'dsh-image-video/lib/index.js'), 'utf8')).toContain('export default {}')
  const threerouter = plugins[1]!
  expect(threerouter.hostEntry.replaceAll('/', '\\')).toContain(join('dsh-plugin-threerouter', 'lib', 'host', 'plugin.js'))
  expect(threerouter.clientEntry!.replaceAll('/', '\\')).toContain(join('dsh-plugin-threerouter', 'lib', 'client', 'plugin.js'))
  expect(readFileSync(join(nodeModules, 'dsh-plugin-threerouter/package.json'), 'utf8'))
    .toBe(readFileSync(join(pluginsRoot, 'dsh-plugin-threerouter/package.json'), 'utf8'))
})

it('re-materializes over a previous plugin copy', () => {
  const { pluginsRoot, nodeModules } = makeRoot()
  writePlugin(pluginsRoot, 'dsh-image-video')
  writePlugin(pluginsRoot, 'dsh-plugin-threerouter', undefined, true)
  materializePrivatePlugins(pluginsRoot, nodeModules, VERSION)
  writeFileSync(join(nodeModules, 'dsh-image-video/stale.txt'), 'old')
  const plugins = materializePrivatePlugins(pluginsRoot, nodeModules, VERSION)
  expect(existsSync(join(nodeModules, 'dsh-image-video/stale.txt'))).toBe(false)
  expect(plugins).toHaveLength(2)
})

it.each([
  ['wrong manifest name', (dir: string) => {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string }
    manifest.name = 'other-plugin'
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  }, /names other-plugin, expected dsh-image-video/],
  ['wrong version', (dir: string) => {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string }
    manifest.version = '9.9.9'
    writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
  }, /does not match the release version/],
  ['unbuilt host entry', (dir: string) => {
    rmSync(join(dir, 'lib'), { recursive: true, force: true })
  }, /host entry .\/lib\/index.js is not built/],
  ['unbuilt client entry', (dir: string) => {
    rmSync(join(dir, 'lib/client'), { recursive: true, force: true })
  }, /client entry .\/lib\/client\/plugin.js is not built/],
])('rejects %s', (_label, breakPlugin, expected) => {
  const { pluginsRoot } = makeRoot()
  writePlugin(pluginsRoot, 'dsh-image-video')
  writePlugin(pluginsRoot, 'dsh-plugin-threerouter', undefined, true)
  breakPlugin(join(pluginsRoot, _label === 'unbuilt client entry' ? 'dsh-plugin-threerouter' : 'dsh-image-video'))
  expect(() => readPrivatePluginEntries(
    join(pluginsRoot, _label === 'unbuilt client entry' ? 'dsh-plugin-threerouter' : 'dsh-image-video'),
    _label === 'unbuilt client entry' ? 'dsh-plugin-threerouter' : 'dsh-image-video',
    VERSION,
  )).toThrow(expected)
})

it('rejects a plugin with no default host export', () => {
  const { pluginsRoot } = makeRoot()
  const dir = join(pluginsRoot, 'dsh-image-video')
  writePlugin(pluginsRoot, 'dsh-image-video')
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'dsh-image-video', version: VERSION, exports: { './other': {} },
  }))
  expect(() => readPrivatePluginEntries(dir, 'dsh-image-video', VERSION))
    .toThrow('exports no default host entry')
})

it('fails loud when a plugin source directory or patch file is missing', () => {
  const { pluginsRoot, nodeModules } = makeRoot()
  writePlugin(pluginsRoot, 'dsh-image-video')
  rmSync(join(pluginsRoot, 'dsh-image-video/cordis.patch.yml'))
  writePlugin(pluginsRoot, 'dsh-plugin-threerouter', undefined, true)
  expect(() => materializePrivatePlugins(pluginsRoot, nodeModules, VERSION))
    .toThrow('dsh-image-video is missing cordis.patch.yml')
  expect(() => materializePrivatePlugins(join(pluginsRoot, 'absent'), nodeModules, VERSION))
    .toThrow(/source directory .*absent.dsh-image-video does not exist/)
})

it('imports copied host entries and rejects when an import cannot resolve', async () => {
  const good = makeRoot()
  writePlugin(good.pluginsRoot, 'dsh-image-video')
  writePlugin(good.pluginsRoot, 'dsh-plugin-threerouter', undefined, true)
  const goodPlugins = materializePrivatePlugins(good.pluginsRoot, good.nodeModules, VERSION)
  await expect(verifyPrivatePluginHostImports(goodPlugins)).resolves.toBeUndefined()

  const bad = makeRoot()
  const missing = join(bad.root, 'missing-package.js')
  writeFileSync(missing, 'export default {}')
  writePlugin(bad.pluginsRoot, 'dsh-image-video', `import ${JSON.stringify(missing)}; export default {}\n`)
  writePlugin(bad.pluginsRoot, 'dsh-plugin-threerouter', undefined, true)
  // Delete the imported file after copying so the host entry import fails.
  const badPlugins = materializePrivatePlugins(bad.pluginsRoot, bad.nodeModules, VERSION)
  rmSync(missing, { force: true })
  await expect(verifyPrivatePluginHostImports(badPlugins)).rejects.toThrow(/Cannot find module/)
})
