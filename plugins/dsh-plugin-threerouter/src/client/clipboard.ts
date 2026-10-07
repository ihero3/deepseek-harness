/**
 * Clipboard writes shared by this plugin's client surfaces: the account
 * overlay's invite link and the media card's saved path. The Clipboard API can
 * be unavailable to the loopback renderer, so a legacy selection copy backs it up.
 *
 * @module dsh-plugin-threerouter/client/clipboard
 */

/**
 * Copy text to the operating-system clipboard.
 * @param text - exact text placed on the clipboard.
 * @returns true when either clipboard route accepted the write.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API can be unavailable to the loopback renderer; fall back.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    // A detached or read-only document cannot select text at all.
    return false
  }
}
