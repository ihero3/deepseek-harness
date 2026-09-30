/**
 * Ad-hoc macOS runtime signing.
 *
 * Signing spawns `/usr/bin/codesign`, so the argument, entitlement, and failure contracts are
 * recorded from a stub; `fork-adhoc-sign-macos.spec.ts` covers the real round trip.
 */

import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adHocSignArguments,
  adHocVerifyArguments,
  machOIdentifier,
  runtimeEntitlements,
  signMacOSRuntimeAdHoc,
} from '../scripts/fork-adhoc-sign.mjs'

const childProcess = vi.hoisted(() => ({ spawn: vi.fn() }))
vi.mock('node:child_process', async importOriginal => ({
  ...await importOriginal<typeof import('node:child_process')>(),
  spawn: childProcess.spawn,
}))

const SCRIPTS = fileURLToPath(new URL('../scripts/', import.meta.url))
const NODE_EXECUTABLE = 'dependencies/node/bin/node'
const LIBREOFFICE_EXECUTABLE = 'node_modules/@deepseek-ai/libreoffice-kit-darwin-arm64/bin/libreoffice-kit'

/** Mach-O header bytes; the signer reads only the magic. */
function machO(magic = 'cffaedfe'): Buffer {
  return Buffer.from(`${magic}00000000`, 'hex')
}

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dsh-adhoc-signing-'))
  childProcess.spawn.mockReset()
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/** Write one runtime tree file, creating its directories. */
function put(path: string, body: Buffer | string): void {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
}

/** Record every spawn and answer it with one exit outcome. */
function recordSpawns(outcome: { code?: number; stderr?: string } = {}): void {
  childProcess.spawn.mockImplementation((command: string, args: readonly string[]) => {
    const stream = (): EventEmitter & { setEncoding: (encoding: string) => void } =>
      Object.assign(new EventEmitter(), { setEncoding: () => undefined })
    const child = Object.assign(new EventEmitter(), { stdout: stream(), stderr: stream(), command, args })
    queueMicrotask(() => {
      if (outcome.stderr !== undefined) child.stderr.emit('data', outcome.stderr)
      child.emit('close', outcome.code ?? 0, null)
    })
    return child
  })
}

/** Every recorded `codesign` invocation as a command and an argument list. */
function recordedCalls(): { command: string; args: string[] }[] {
  return childProcess.spawn.mock.calls.map(call => ({
    command: call[0] as string,
    args: call[1] as string[],
  }))
}

describe('fork ad-hoc macOS runtime signing', () => {
  it('derives the identifier the Developer ID signer derives', () => {
    const digest = createHash('sha256').update(LIBREOFFICE_EXECUTABLE).digest('hex')
    expect(machOIdentifier('com.example.fork', LIBREOFFICE_EXECUTABLE)).toBe(`com.example.fork.runtime.${digest}`)
    expect(machOIdentifier('com.example.other', LIBREOFFICE_EXECUTABLE))
      .not.toBe(machOIdentifier('com.example.fork', LIBREOFFICE_EXECUTABLE))
    expect(machOIdentifier('com.example.fork', `${LIBREOFFICE_EXECUTABLE}2`))
      .not.toBe(machOIdentifier('com.example.fork', LIBREOFFICE_EXECUTABLE))
  })

  it('gives the JIT entitlement to the executables that generate code', () => {
    expect(runtimeEntitlements(NODE_EXECUTABLE, 'arm64', SCRIPTS)).toBe(join(SCRIPTS, 'jit-entitlements.plist'))
    expect(runtimeEntitlements(NODE_EXECUTABLE, 'x64', SCRIPTS)).toBe(join(SCRIPTS, 'node-x64-entitlements.plist'))
    for (const arch of ['arm64', 'x64'] as const) {
      expect(runtimeEntitlements(LIBREOFFICE_EXECUTABLE, arch, SCRIPTS)).toBe(join(SCRIPTS, 'jit-entitlements.plist'))
    }
    expect(runtimeEntitlements('node_modules/@deepseek-ai/libreoffice-kit-win32-x64/bin/libreoffice-kit', 'arm64', SCRIPTS)).toBeUndefined()
    expect(runtimeEntitlements('dependencies/node/bin/nodejs', 'arm64', SCRIPTS)).toBeUndefined()
    expect(runtimeEntitlements('lib/main.js', 'arm64', SCRIPTS)).toBeUndefined()
  })

  it('names entitlements files the Desktop scripts actually ship', () => {
    for (const plist of [join(SCRIPTS, 'jit-entitlements.plist'), join(SCRIPTS, 'node-x64-entitlements.plist')]) {
      expect(existsSync(plist)).toBe(true)
    }
  })

  it('signs ad-hoc with no keychain, timestamp, or hardened runtime option', () => {
    expect(adHocSignArguments('com.example.fork.runtime.a', undefined, '/runtime/node'))
      .toEqual(['--force', '--sign', '-', '--identifier', 'com.example.fork.runtime.a', '/runtime/node'])
    expect(adHocSignArguments('com.example.fork.runtime.a', '/scripts/jit-entitlements.plist', '/runtime/node'))
      .toEqual(['--force', '--sign', '-', '--identifier', 'com.example.fork.runtime.a',
        '--entitlements', '/scripts/jit-entitlements.plist', '/runtime/node'])
    expect(adHocVerifyArguments('/runtime/node')).toEqual(['--verify', '--strict', '--verbose=2', '/runtime/node'])
  })

  it('signs and verifies every Mach-O file, skips the rest, and reports the count', async () => {
    put(NODE_EXECUTABLE, machO())
    put('node_modules/@deepseek-ai/libreoffice-kit-darwin-arm64/bin/libreoffice-kit', machO('feedfacf'))
    put('lib/main.js', 'export {}\n')
    put('lib/main.js.map', 'no header')
    recordSpawns()

    await expect(signMacOSRuntimeAdHoc(root, 'com.example.fork', 'arm64')).resolves.toBe(2)

    const calls = recordedCalls()
    expect(calls.map(call => call.command)).toEqual(['/usr/bin/codesign', '/usr/bin/codesign', '/usr/bin/codesign', '/usr/bin/codesign'])
    const signs = calls.filter(call => call.args.includes('--sign'))
    const verifies = calls.filter(call => call.args.includes('--verify'))
    expect(signs).toHaveLength(2)
    expect(verifies).toHaveLength(2)
    expect(signs.map(call => call.args.at(-1)).sort())
      .toEqual([join(root, NODE_EXECUTABLE), join(root, 'node_modules/@deepseek-ai/libreoffice-kit-darwin-arm64/bin/libreoffice-kit')].sort())
    for (const sign of signs) {
      // Ad-hoc means an unbound identity: a keychain, a timestamp, and the hardened runtime option
      // all describe a Developer ID signature and would fail without a certificate.
      expect(sign.args).not.toContain('--keychain')
      expect(sign.args).not.toContain('--timestamp')
      expect(sign.args).not.toContain('--options')
      expect(sign.args[sign.args.indexOf('--sign') + 1]).toBe('-')
    }
    expect(signs.find(call => call.args.at(-1) === join(root, NODE_EXECUTABLE))?.args)
      .toContain(join(SCRIPTS, 'jit-entitlements.plist'))
    for (const verify of verifies) {
      expect(verify.args.slice(0, -1)).toEqual(['--verify', '--strict', '--verbose=2'])
      expect(signs.map(call => call.args.at(-1))).toContain(verify.args.at(-1))
    }
  })

  it('aggregates signing failures with the codesign diagnostic', async () => {
    put(NODE_EXECUTABLE, machO())
    recordSpawns({ code: 1, stderr: 'code object is not signed at all\n' })

    const failure: unknown = await signMacOSRuntimeAdHoc(root, 'com.example.fork', 'arm64').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(AggregateError)
    if (!(failure instanceof AggregateError)) throw new Error('ad-hoc signing must aggregate per-file failures')
    expect(failure.message).toBe('desktop runtime: ad-hoc signing failed')
    expect(failure.errors).toHaveLength(1)
    expect(String(failure.errors[0])).toContain('code object is not signed at all')
  })
})
