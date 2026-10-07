/**
 * Fork-owned merge driver for the JSON manifests this fork extends.
 *
 * Git runs a registered merge driver only when both sides changed the file, so the merge is
 * value-based rather than line-based: a side equal to the ancestor yields to the other side, the
 * fork's added keys survive an upstream rewrite of the same object, and a genuine leaf conflict
 * keeps upstream's value and reports the path on stderr. Upstream's key order leads the result and
 * fork-only keys follow it, so the committed files stay upstream-shaped.
 *
 * `install.mjs` registers the driver; FORK-SYNC.md documents the sync procedure.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Stands for a key one side of the merge does not carry. */
const ABSENT = Symbol('absent')

/** Longest value text a conflict report prints before truncating it. */
const REPORT_WIDTH = 120

/** Whether a parsed JSON value is an object whose keys merge individually. */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Compare two parsed JSON values structurally, ignoring object key order.
 * @param a - One value, possibly {@link ABSENT}.
 * @param b - The other value, possibly {@link ABSENT}.
 * @returns Whether both values carry the same data.
 */
function deepEqual(a, b) {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length
      && keys.every(key => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
  }
  return false
}

/**
 * Read one key without letting an inherited name read as present.
 * @param object - Object to read.
 * @param key - Key to read.
 * @returns The value, or {@link ABSENT} when the object lacks the key.
 */
function own(object, key) {
  return Object.hasOwn(object, key) ? object[key] : ABSENT
}

/**
 * Merge one value, collecting the paths where both sides changed it to different data.
 * @param base - Ancestor value, or {@link ABSENT}.
 * @param ours - Fork-side value, or {@link ABSENT}.
 * @param theirs - Upstream-side value, or {@link ABSENT}.
 * @param path - JSON-pointer path of this value, used in conflict reports.
 * @param conflicts - Collects one entry per genuine conflict.
 * @returns The merged value, or {@link ABSENT} when the merge drops the key.
 */
function mergeValue(base, ours, theirs, path, conflicts) {
  if (deepEqual(ours, theirs)) return ours
  if (deepEqual(base, ours)) return theirs
  if (deepEqual(base, theirs)) return ours

  if (isPlainObject(ours) && isPlainObject(theirs)) {
    const ancestor = isPlainObject(base) ? base : {}
    const merged = {}
    for (const key of Object.keys(theirs)) {
      merged[key] = mergeValue(own(ancestor, key), own(ours, key), theirs[key], `${path}/${key}`, conflicts)
    }
    for (const key of Object.keys(ours)) {
      if (Object.hasOwn(theirs, key)) continue
      const value = mergeValue(own(ancestor, key), ours[key], ABSENT, `${path}/${key}`, conflicts)
      if (value !== ABSENT) merged[key] = value
    }
    return merged
  }

  if (Array.isArray(ours) && Array.isArray(theirs)) {
    const ancestor = Array.isArray(base) ? base : []
    const merged = [...theirs]
    for (const item of ours) {
      if (ancestor.some(existing => deepEqual(existing, item))) continue
      if (merged.some(existing => deepEqual(existing, item))) continue
      merged.push(item)
    }
    return merged
  }

  conflicts.push({ path, ours, theirs })
  return theirs
}

/**
 * Parse one side of the merge.
 * @param text - Manifest text.
 * @param side - Side name used in the failure message.
 * @returns The parsed manifest.
 * @throws When the text is not valid JSON.
 */
function parseManifest(text, side) {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${side} manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Read the indentation one side already uses, so the merged file keeps the repository's formatting.
 * @param text - Manifest text.
 * @returns The first-level indent unit, defaulting to two spaces.
 */
function detectIndent(text) {
  return /\n([ \t]+)"/u.exec(text)?.[1] ?? '  '
}

/**
 * Render one conflict value for the stderr report.
 * @param value - Conflicting value, or {@link ABSENT}.
 * @returns A single-line JSON rendering, truncated to {@link REPORT_WIDTH} characters.
 */
function reportValue(value) {
  const text = value === ABSENT ? '<deleted>' : JSON.stringify(value) ?? 'undefined'
  return text.length > REPORT_WIDTH ? `${text.slice(0, REPORT_WIDTH)}…` : text
}

/**
 * Merge two JSON manifest texts against their common ancestor.
 *
 * A side that equals the ancestor yields; a leaf both sides changed keeps upstream's value and is
 * reported in `conflicts`. Arrays merge additively: upstream's items lead, then the fork's added
 * items in the fork's order.
 * @param baseText - Ancestor manifest text; empty for an add/add merge.
 * @param oursText - Fork-side manifest text.
 * @param theirsText - Upstream-side manifest text.
 * @returns Merged text plus one entry per genuine conflict.
 * @throws When a side is not valid JSON.
 */
export function mergePackageJsonText(baseText, oursText, theirsText) {
  const base = baseText.trim() === '' ? {} : parseManifest(baseText, 'ancestor')
  const ours = parseManifest(oursText, 'fork')
  const theirs = parseManifest(theirsText, 'upstream')
  const conflicts = []
  const merged = mergeValue(base, ours, theirs, '', conflicts)
  const text = JSON.stringify(merged, undefined, detectIndent(theirsText)) + (theirsText.endsWith('\n') ? '\n' : '')
  return { text, conflicts }
}

/** Whether this module is the process entry point rather than an imported module. */
const isDriverInvocation = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isDriverInvocation) {
  const [basePath, oursPath, theirsPath, , filePath] = process.argv.slice(2)
  try {
    if (basePath === undefined || oursPath === undefined || theirsPath === undefined) {
      throw new Error('usage: merge-package-json.mjs <ancestor> <ours> <theirs>')
    }
    const { text, conflicts } = mergePackageJsonText(
      readFileSync(basePath, 'utf8'),
      readFileSync(oursPath, 'utf8'),
      readFileSync(theirsPath, 'utf8'),
    )
    writeFileSync(oursPath, text)
    if (conflicts.length > 0) {
      console.error(`[fork-merge] ${filePath ?? oursPath}: ${conflicts.length} key(s) changed on both sides; upstream's value kept:`)
      for (const conflict of conflicts) {
        console.error(`[fork-merge]   ${conflict.path}: fork=${reportValue(conflict.ours)} upstream=${reportValue(conflict.theirs)}`)
      }
    }
  } catch (error) {
    console.error(`[fork-merge] ${filePath ?? oursPath}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
