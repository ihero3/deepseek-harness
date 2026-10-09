/**
 * Render the Threerouter Windows tray icon from `resources-fork/icon-windows.svg`.
 *
 * Upstream owns `resources/` and its `render-tray-icon.ts`, whose enlargement is tuned to the
 * whale's geometry and requires a `tray-glyph` group. The fork's flattened Windows export is a
 * complete rounded tile with no such group, so this script rasterizes the whole viewBox instead of
 * reusing the upstream renderer. The committed `resources-fork/tray-windows.ico` is the output;
 * rerun `pnpm run render:tray-icon-fork` in `apps/desktop` after changing the vector source.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { packIco, TRAY_ICON_SIZES, type IcoEntry } from './render-tray-icon.ts'

/** Vector source and committed output of the Threerouter tray icon. */
export const FORK_TRAY_ICON_PATHS = {
  source: fileURLToPath(new URL('../resources-fork/icon-windows.svg', import.meta.url)),
  output: fileURLToPath(new URL('../resources-fork/tray-windows.ico', import.meta.url)),
} as const

/** Coordinate space of the fork vector source; sharp's SVG density is scaled against it. */
const SOURCE_EDGE = 1024
const SOURCE_DENSITY = 72

/**
 * Rasterize the Threerouter tile at each tray size.
 * @param svg - SVG document with a 1024-unit square viewBox.
 * @param sizes - Bitmap edges to render.
 * @returns PNG entries in the given order.
 */
export async function renderForkTrayIconEntries(svg: Buffer, sizes: readonly number[] = TRAY_ICON_SIZES): Promise<IcoEntry[]> {
  return Promise.all(sizes.map(async size => ({
    size,
    png: await sharp(svg, { density: SOURCE_DENSITY * size / SOURCE_EDGE }).resize(size, size).png().toBuffer(),
  })))
}

async function main(): Promise<void> {
  const entries = await renderForkTrayIconEntries(await readFile(FORK_TRAY_ICON_PATHS.source))
  await writeFile(FORK_TRAY_ICON_PATHS.output, packIco(entries))
  console.info(`tray icon: wrote ${FORK_TRAY_ICON_PATHS.output} with ${entries.map(entry => String(entry.size)).join(', ')} px bitmaps`)
}

if (process.argv[1] !== undefined && import.meta.filename === resolve(process.argv[1])) await main()
