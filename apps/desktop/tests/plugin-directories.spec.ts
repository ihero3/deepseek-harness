import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PRIVATE_PLUGIN_ROOTS_ENV,
  privatePluginRoots,
  resolvePrivatePluginDir,
} from '../src/plugin-directories.ts'

const roots: string[] = []

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-desktop-plugin-directories-'))
  roots.push(root)
  return root
}

function writePlugin(root: string, name: string): void {
  const directory = join(root, name)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name }))
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('private plugin directories', () => {
  it('searches configured roots before the repository plugins directory', () => {
    const repository = temporaryRoot()
    const external = temporaryRoot()
    expect(privatePluginRoots(repository, { [PRIVATE_PLUGIN_ROOTS_ENV]: external }))
      .toEqual([external, join(repository, 'plugins')])
  })

  it('ignores blank and repeated roots', () => {
    const repository = temporaryRoot()
    const external = temporaryRoot()
    const configured = [external, external, ' '].join(delimiter)
    expect(privatePluginRoots(repository, { [PRIVATE_PLUGIN_ROOTS_ENV]: configured }))
      .toEqual([external, join(repository, 'plugins')])
  })

  it('locates the first root that holds a plugin manifest', () => {
    const repository = temporaryRoot()
    const external = temporaryRoot()
    writePlugin(external, 'dsh-image-video')
    const directory = resolvePrivatePluginDir('dsh-image-video', [repository, external])
    expect(directory).toBe(join(external, 'dsh-image-video'))
  })

  it('ignores a checkout without a package manifest', () => {
    const repository = temporaryRoot()
    mkdirSync(join(repository, 'dsh-image-video'), { recursive: true })
    expect(resolvePrivatePluginDir('dsh-image-video', [repository])).toBeUndefined()
  })
})
