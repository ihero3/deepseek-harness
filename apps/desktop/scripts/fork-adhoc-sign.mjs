/**
 * Ad-hoc signing for the unsigned macOS runtime.
 *
 * Apple Silicon refuses to load an arm64 Mach-O that carries no valid signature, so even a release
 * built without Apple credentials has to sign every runtime binary. Ad-hoc signing
 * (`codesign --sign -`) is the only free option: it needs no certificate, no keychain, no timestamp,
 * and no notarization. The Developer ID signer in `macos-runtime.ts` cannot serve that release — it
 * requires `DSH_DESKTOP_MACOS_SIGNING_IDENTITY`, a ten-character team ID, and `CSC_KEYCHAIN`, and it
 * signs `--options runtime`, which an ad-hoc signature without a team cannot carry.
 *
 * The identifier derivation and the entitlement rules mirror that signer so one runtime tree keeps
 * one code identity whichever mode produced it.
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, openSync, readSync } from 'node:fs'
import { join } from 'node:path'
import { inventoryDesktopRuntime } from '../src/runtime-tree.ts'

/** Thin 32- and 64-bit Mach-O magics in both byte orders, plus the universal-binary wrappers. */
const MACH_O_MAGICS = new Set(['cafebabe', 'cafebabf', 'cefaedfe', 'cffaedfe', 'feedface', 'feedfacf', 'bebafeca', 'bfbafeca'])

/** Runtime path of the bundled Node executable, which generates its own code. */
const NODE_EXECUTABLE = 'dependencies/node/bin/node'

/** Bundled LibreOffice engine, which generates its own code. */
const LIBREOFFICE_EXECUTABLE = /^node_modules\/@deepseek-ai\/libreoffice-kit-darwin-(?:arm64|x64)\/bin\/libreoffice-kit$/u

/** Concurrent `codesign` invocations; signing is I/O bound and each call is a separate process. */
const SIGNING_WORKERS = 4

/**
 * Derive the code-signing identifier of one runtime file.
 * @param appId - Release application identifier.
 * @param path - Slash-separated path inside the runtime tree.
 * @returns Identifier shared with the Developer ID signer for the same path.
 */
export function machOIdentifier(appId, path) {
  return `${appId}.runtime.${createHash('sha256').update(path).digest('hex')}`
}

/**
 * Select the entitlements plist one runtime file needs.
 * @param path - Slash-separated path inside the runtime tree.
 * @param arch - Target architecture; the x64 Node build needs its own entitlement set.
 * @param directory - Directory holding the plist files.
 * @returns Absolute plist path, or undefined for an executable that generates no code.
 */
export function runtimeEntitlements(path, arch, directory) {
  const isNode = path === NODE_EXECUTABLE
  if (!isNode && !LIBREOFFICE_EXECUTABLE.test(path)) return undefined
  return join(directory, isNode && arch === 'x64' ? 'node-x64-entitlements.plist' : 'jit-entitlements.plist')
}

/**
 * Build the arguments that replace one file's signature with an ad-hoc one.
 * @param identifier - Code-signing identifier from {@link machOIdentifier}.
 * @param entitlements - Entitlements plist from {@link runtimeEntitlements}, if any.
 * @param path - Mach-O file to sign.
 * @returns Arguments for `/usr/bin/codesign`.
 */
export function adHocSignArguments(identifier, entitlements, path) {
  return ['--force', '--sign', '-', '--identifier', identifier,
    ...entitlements === undefined ? [] : ['--entitlements', entitlements], path]
}

/**
 * Build the arguments that verify one ad-hoc signature.
 * @param path - Signed file to verify.
 * @returns Arguments for `/usr/bin/codesign`.
 */
export function adHocVerifyArguments(path) {
  return ['--verify', '--strict', '--verbose=2', path]
}

/**
 * Sign every Mach-O file in one runtime tree with an ad-hoc signature and verify each result.
 * @param root - Self-contained runtime directory without symlinks.
 * @param appId - Release application identifier.
 * @param arch - Target runtime architecture, independent of the signing host.
 * @returns Number of signed Mach-O files.
 */
export async function signMacOSRuntimeAdHoc(root, appId, arch) {
  const files = inventoryDesktopRuntime(root).map(file => file.path)
    .filter(path => isMachO(join(root, path)))
  let next = 0
  const workers = Array.from({ length: Math.min(SIGNING_WORKERS, files.length) }, async () => {
    for (;;) {
      const path = files[next++]
      if (path === undefined) return
      const file = join(root, path)
      await codesign(adHocSignArguments(machOIdentifier(appId, path), runtimeEntitlements(path, arch, import.meta.dirname), file))
      await codesign(adHocVerifyArguments(file))
    }
  })
  const results = await Promise.allSettled(workers)
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason)
  if (errors.length > 0) throw new AggregateError(errors, 'desktop runtime: ad-hoc signing failed')
  return files.length
}

/** Whether one file starts with a Mach-O magic. */
function isMachO(file) {
  const header = Buffer.alloc(4)
  const descriptor = openSync(file, 'r')
  try {
    return readSync(descriptor, header, 0, 4, 0) === 4 && MACH_O_MAGICS.has(header.toString('hex'))
  } finally {
    closeSync(descriptor)
  }
}

/** Run one `codesign` invocation, rejecting with its diagnostic output on any failure. */
function codesign(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('/usr/bin/codesign', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let diagnostic = ''
    let spawnError
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { diagnostic += chunk })
    child.stderr.on('data', chunk => { diagnostic += chunk })
    child.once('error', error => { spawnError = error })
    child.once('close', (code, signal) => {
      if (spawnError !== undefined) {
        reject(new Error(`desktop runtime: could not execute codesign: ${spawnError.message}`))
        return
      }
      if (signal !== null) {
        reject(new Error(`desktop runtime: codesign was terminated by ${signal}`))
        return
      }
      if (code !== 0) {
        const detail = diagnostic.trim()
        reject(new Error(`desktop runtime: codesign exited with ${String(code)}${detail === '' ? '' : `: ${detail}`}`))
        return
      }
      resolvePromise(undefined)
    })
  })
}
