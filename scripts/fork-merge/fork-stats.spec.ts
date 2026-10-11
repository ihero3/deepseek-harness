import { describe, expect, it } from 'vitest'
import {
  collectForkStats,
  parseAheadBehind,
  parseNumstat,
  parseSubmodules,
  renderForkStats,
  summarizeForkDelta,
} from './fork-stats.mjs'

describe('parseNumstat', () => {
  it('reads one entry per changed path and treats binary markers as zero lines', () => {
    expect(parseNumstat('12\t3\tsrc/a.ts\n-\t-\tassets/logo.png\n')).toEqual([
      { path: 'src/a.ts', added: 12, deleted: 3 },
      { path: 'assets/logo.png', added: 0, deleted: 0 },
    ])
  })

  it('keeps tabs inside a path', () => {
    expect(parseNumstat('1\t2\tdir/with\ttab.ts')).toEqual([{ path: 'dir/with\ttab.ts', added: 1, deleted: 2 }])
  })

  it('returns nothing for empty output', () => {
    expect(parseNumstat('')).toEqual([])
  })
})

describe('parseAheadBehind', () => {
  it('maps the left count to behind and the right count to ahead', () => {
    expect(parseAheadBehind('0\t62\n')).toEqual({ behind: 0, ahead: 62 })
  })
})

describe('parseSubmodules', () => {
  it('reads path, pin, and describe, and tolerates uninitialized and out-of-sync prefixes', () => {
    expect(parseSubmodules(' 478832a687ca plugins/dsh-image-video (v0.1.0-53-g478832a)\n-abc123 plugins/other\n'))
      .toEqual([
        { path: 'plugins/dsh-image-video', pin: '478832a687ca', describe: 'v0.1.0-53-g478832a' },
        { path: 'plugins/other', pin: 'abc123', describe: '' },
      ])
  })
})

describe('summarizeForkDelta', () => {
  it('counts generated paths apart from the authored delta', () => {
    const summary = summarizeForkDelta([
      { path: 'src/a.ts', added: 4, deleted: 1 },
      { path: 'pnpm-lock.yaml', added: 1449, deleted: 913 },
      { path: 'src/b.ts', added: 2, deleted: 6 },
    ])
    expect(summary.authored).toEqual({ files: 2, added: 6, deleted: 7 })
    expect(summary.generated).toEqual([{ path: 'pnpm-lock.yaml', added: 1449, deleted: 913 }])
  })
})

describe('collectForkStats', () => {
  const outputs = new Map<string, string>([
    ['diff --numstat upstream/master', '5\t1\tsrc/shared.ts\n3\t0\tplugins/fork-only.ts\n9\t9\tpnpm-lock.yaml\n'],
    ['ls-tree -r --name-only upstream/master', 'src/shared.ts\npnpm-lock.yaml\n'],
    ['ls-files --others --exclude-standard', 'scripts/new-file.ts\n'],
    ['rev-list --left-right --count upstream/master...HEAD', '0\t62\n'],
    ['rev-parse --short upstream/master', 'release-pin\n'],
    ['log -1 --format=%cs upstream/master', '2026-10-07\n'],
    ['submodule status --recursive', ' pin-abc plugins/dsh-image-video (v0.1.0-53-gpin-abc)\n'],
  ])
  const runGit = (args: readonly string[]): string => {
    const key = args.join(' ')
    const value = outputs.get(key)
    if (value === undefined) throw new Error(`unexpected git call: ${key}`)
    return value.replace(/\n$/, '')
  }

  it('classifies shared against fork-only paths, counts untracked files, and reports the authored delta', () => {
    const stats = collectForkStats({ runGit, rerereCount: () => 5 })
    expect(stats.upstream).toEqual({ ref: 'upstream/master', sha: 'release-pin', committedAt: '2026-10-07' })
    expect(stats.branch).toEqual({ behind: 0, ahead: 62 })
    expect(stats.changedFiles).toEqual({ total: 4, upstreamShared: 2, forkOnly: 2 })
    expect(stats.shared.authored).toEqual({ files: 1, added: 5, deleted: 1 })
    expect(stats.shared.generated).toEqual([{ path: 'pnpm-lock.yaml', added: 9, deleted: 9 }])
    expect(stats.forkOnlyPaths).toEqual(['plugins/fork-only.ts', 'scripts/new-file.ts'])
    expect(stats.submodules).toEqual([
      { path: 'plugins/dsh-image-video', pin: 'pin-abc', describe: 'v0.1.0-53-gpin-abc' },
    ])
    expect(stats.rerereEntries).toBe(5)
  })

  it('renders every quoted metric into the report', () => {
    const report = renderForkStats(collectForkStats({ runGit, rerereCount: () => 5 }))
    expect(report).toContain('upstream            upstream/master release-pin (2026-10-07)')
    expect(report).toContain('master              0 behind / 62 ahead')
    expect(report).toContain('relative changes    4 files (upstream-shared 2 / fork-only 2)')
    expect(report).toContain('authored delta      5 added / 1 deleted over 1 files')
    expect(report).toContain('generated           pnpm-lock.yaml: 9 added / 9 deleted')
    expect(report).toContain('submodules          plugins/dsh-image-video pin-abc (v0.1.0-53-gpin-abc)')
    expect(report).toContain('rerere entries      5')
  })
})
