import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { removeFixtureSafely } from '../test-fixture-cleanup.ts'
import { FORK_MERGE_DRIVERS, installForkMergeDrivers, missingAttributes, REQUIRED_ATTRIBUTES } from './install.mjs'
import { resolveLockfileText } from './merge-lockfile.mjs'
import { mergePackageJsonText } from './merge-package-json.mjs'

const installer = fileURLToPath(new URL('./install.mjs', import.meta.url))
const fixtures: string[] = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) removeFixtureSafely(fixture)
})

/** Create a scratch repository the installer can configure. */
function initRepository(): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-fork-merge-'))
  fixtures.push(root)
  const result = spawnSync('git', ['init', '-q'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git init failed: ${result.stderr}`)
  return root
}

/** Read one `git config` value from a scratch repository. */
function gitConfig(cwd: string, args: string[]): string | undefined {
  const result = spawnSync('git', ['config', ...args], { cwd, encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : undefined
}

/** Run the installer against one scratch repository. */
function runInstaller(cwd: string): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, [installer], { cwd, encoding: 'utf8' })
  return { status: result.status, stderr: result.stderr, stdout: result.stdout }
}

describe('mergePackageJsonText', () => {
  it('keeps the fork keys beside the keys upstream added to the same object', () => {
    const base = JSON.stringify({ name: 'x', scripts: { 'package:dir': 'tsx dir' } })
    const ours = JSON.stringify({
      name: 'x',
      homepage: 'https://github.com/ihero3/deepseek-harness',
      scripts: { 'package:dir': 'tsx dir', 'package:linux:x64': 'tsx scripts/package-target.ts linux-x64' },
    })
    const theirs = JSON.stringify({
      name: 'x',
      version: '0.2.1-alpha.1',
      scripts: { 'package:dir': 'tsx dir', bundle: 'tsdown --config-loader native' },
    })

    const merged = mergePackageJsonText(base, ours, theirs)

    expect(merged.conflicts).toEqual([])
    expect(JSON.parse(merged.text)).toEqual({
      name: 'x',
      version: '0.2.1-alpha.1',
      homepage: 'https://github.com/ihero3/deepseek-harness',
      scripts: {
        'package:dir': 'tsx dir',
        bundle: 'tsdown --config-loader native',
        'package:linux:x64': 'tsx scripts/package-target.ts linux-x64',
      },
    })
  })

  it('keeps upstream order and appends fork-only keys', () => {
    const base = JSON.stringify({ a: 1 })
    const ours = JSON.stringify({ a: 1, forkOnly: true })
    const theirs = JSON.stringify({ a: 1, upstreamOnly: true })

    expect(mergePackageJsonText(base, ours, theirs).text)
      .toBe('{\n  "a": 1,\n  "upstreamOnly": true,\n  "forkOnly": true\n}')
  })

  it('reports a key both sides changed and keeps upstream over the fork', () => {
    const merged = mergePackageJsonText(
      JSON.stringify({ scripts: { a: 'base' } }),
      JSON.stringify({ scripts: { a: 'fork' } }),
      JSON.stringify({ scripts: { a: 'upstream' } }),
    )

    expect(JSON.parse(merged.text)).toEqual({ scripts: { a: 'upstream' } })
    expect(merged.conflicts.map(conflict => conflict.path)).toEqual(['/scripts/a'])
  })

  it('merges arrays additively with upstream first', () => {
    const merged = mergePackageJsonText(
      JSON.stringify({ packages: ['apps/*'] }),
      JSON.stringify({ packages: ['apps/*', 'plugins/*'] }),
      JSON.stringify({ packages: ['apps/*', 'website'] }),
    )

    expect(JSON.parse(merged.text)).toEqual({ packages: ['apps/*', 'website', 'plugins/*'] })
    expect(merged.conflicts).toEqual([])
  })

  it('drops the key upstream deleted when the fork left it alone', () => {
    const merged = mergePackageJsonText(
      JSON.stringify({ a: 1, gone: true }),
      JSON.stringify({ a: 1, gone: true }),
      JSON.stringify({ a: 1 }),
    )

    expect(JSON.parse(merged.text)).toEqual({ a: 1 })
  })

  it('keeps the fork deletion of a key upstream left alone', () => {
    const merged = mergePackageJsonText(
      JSON.stringify({ a: 1, dropped: true }),
      JSON.stringify({ a: 1 }),
      JSON.stringify({ a: 1, dropped: true }),
    )

    expect(JSON.parse(merged.text)).toEqual({ a: 1 })
  })

  it('formats the result the way upstream formats its manifest', () => {
    const merged = mergePackageJsonText(
      JSON.stringify({ a: 1 }),
      JSON.stringify({ a: 1, forkOnly: true }),
      '{\n    "a": 1,\n    "upstreamOnly": true\n}\n',
    )

    expect(merged.text).toBe('{\n    "a": 1,\n    "upstreamOnly": true,\n    "forkOnly": true\n}\n')
  })

  it('merges an add/add pair against the empty ancestor', () => {
    const merged = mergePackageJsonText('', JSON.stringify({ forkOnly: true }), JSON.stringify({ upstreamOnly: true }))

    expect(JSON.parse(merged.text)).toEqual({ upstreamOnly: true, forkOnly: true })
    expect(merged.conflicts).toEqual([])
  })

  it('names the side that is not JSON', () => {
    expect(() => mergePackageJsonText('{}', '{', '{}')).toThrow(/fork manifest is not valid JSON/u)
  })
})

describe('resolveLockfileText', () => {
  it('keeps upstream and asks for the regenerate that restores the fork importers', () => {
    const resolved = resolveLockfileText('lockfileVersion: fork\n', 'lockfileVersion: upstream\n')

    expect(resolved.text).toBe('lockfileVersion: upstream\n')
    expect(resolved.notice).toMatch(/pnpm install/u)
  })

  it('asks for nothing when both sides already match', () => {
    expect(resolveLockfileText('same\n', 'same\n').notice).toBeUndefined()
  })
})

describe('installForkMergeDrivers', () => {
  it('fails loudly when a written driver does not read back', () => {
    const run = (args: readonly string[]): string | undefined => args.includes('--get') ? 'other' : ''

    expect(() => installForkMergeDrivers(run, { shared: '/nonexistent/config', worktree: '/nonexistent/config.worktree' }))
      .toThrow(/did not keep/u)
  })
})

describe('missingAttributes', () => {
  it('reports the assignments a checkout lacks and accepts a complete file', () => {
    expect(missingAttributes('* text=auto eol=lf\n')).toEqual(REQUIRED_ATTRIBUTES)
    expect(missingAttributes(`${REQUIRED_ATTRIBUTES.join('\n')}\n`)).toEqual([])
  })
})

describe('fork merge driver installation', () => {
  it('registers both drivers in the shared config', () => {
    const root = initRepository()
    writeFileSync(join(root, '.gitattributes'), `${REQUIRED_ATTRIBUTES.join('\n')}\n`)

    const first = runInstaller(root)
    expect(first.status, first.stderr).toBe(0)
    for (const [name, command] of Object.entries(FORK_MERGE_DRIVERS)) {
      expect(gitConfig(root, ['--local', '--get', `merge.${name}.driver`])).toBe(command)
    }

    const second = runInstaller(root)
    expect(second.status, second.stderr).toBe(0)
    expect(second.stderr).toBe('')
  })

  it('reports the attribute assignments a checkout is missing', () => {
    const result = runInstaller(initRepository())

    expect(result.status).toBe(0)
    for (const attribute of REQUIRED_ATTRIBUTES) expect(result.stderr).toContain(attribute)
  })

  it('removes the obsolete translation-pairing driver from the worktree config', () => {
    const root = initRepository()
    writeFileSync(join(root, '.gitattributes'), `${REQUIRED_ATTRIBUTES.join('\n')}\n`)
    expect(gitConfig(root, ['--local', 'extensions.worktreeConfig', 'true'])).toBe('')
    expect(gitConfig(root, ['--worktree', 'merge.dsh-translation-pairing.driver', 'scripts/gone.sh %O %A %B %P'])).toBe('')

    const result = runInstaller(root)

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('removed obsolete merge.dsh-translation-pairing')
    expect(gitConfig(root, ['--worktree', '--get', 'merge.dsh-translation-pairing.driver'])).toBeUndefined()
    expect(gitConfig(root, ['--local', '--get', 'merge.fork-lockfile.driver'])).toBe(FORK_MERGE_DRIVERS['fork-lockfile'])
  })
})
