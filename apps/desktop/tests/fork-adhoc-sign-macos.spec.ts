/**
 * Ad-hoc signing round trip against the real `codesign`.
 *
 * Apple Silicon's loader accepts an ad-hoc signature, so this case signs a real Mach-O copy inside a
 * runtime-shaped tree and reads the signature back. It is the closest a unit test gets to the
 * packaged unsigned build; the packaging pipeline itself is exercised by the operator.
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { machOIdentifier, signMacOSRuntimeAdHoc } from '../scripts/fork-adhoc-sign.mjs'

/** A small Mach-O the host always ships. */
const MACH_O_SOURCE = '/usr/bin/true'

/** Run codesign and return both streams, because `--display` writes to stderr. */
function codesign(args: readonly string[]): { status: number | null; diagnostic: string } {
  const result = spawnSync('/usr/bin/codesign', [...args], { encoding: 'utf8' })
  return { status: result.status, diagnostic: `${result.stdout}${result.stderr}` }
}

/** Write one runtime tree file, creating its directories, and return its path. */
function put(root: string, path: string, body: Buffer | string): string {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
  return file
}

describe.skipIf(process.platform !== 'darwin')('ad-hoc signing against the real codesign', () => {
  it('signs the runtime Node executable ad-hoc with its JIT entitlement and leaves other files alone', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-adhoc-signing-'))
    try {
      const node = join(root, 'dependencies/node/bin/node')
      mkdirSync(dirname(node), { recursive: true })
      copyFileSync(MACH_O_SOURCE, node)
      const plain = put(root, 'lib/main.js', 'export {}\n')

      await expect(signMacOSRuntimeAdHoc(root, 'com.example.fork', 'arm64')).resolves.toBe(1)

      const display = codesign(['--display', '--verbose=4', node])
      expect(display.status).toBe(0)
      expect(display.diagnostic).toContain('Signature=adhoc')
      // No team and no authority: that is the difference from the Developer ID signer.
      expect(display.diagnostic).toContain('TeamIdentifier=not set')
      expect(display.diagnostic).not.toContain('Authority=')
      expect(display.diagnostic).toContain(`Identifier=${machOIdentifier('com.example.fork', 'dependencies/node/bin/node')}`)

      const entitlements = codesign(['--display', '--entitlements', '-', node])
      expect(entitlements.diagnostic).toContain('com.apple.security.cs.allow-jit')

      expect(codesign(['--verify', '--strict', node]).status).toBe(0)
      // The signer must not touch a file the loader never inspects.
      expect(codesign(['--verify', '--strict', plain]).status).not.toBe(0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
