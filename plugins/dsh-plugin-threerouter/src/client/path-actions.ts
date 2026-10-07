/**
 * Host path gestures for the media card: open one saved image or video in its
 * default application, or reveal it in the desktop file manager. Both travel
 * through the Client Remote's `session.openWorkspacePath`, the seam the Sidebar
 * open-in-app controls already use, so path verification stays inside the Host
 * operation that performs the gesture.
 *
 * @module dsh-plugin-threerouter/client/path-actions
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'

/** What the media card asks of the Host desktop. */
export type MediaPathAction = 'open' | 'reveal'

/** One Host gesture over a saved media path. */
export type MediaPathActionRunner = (path: string, action: MediaPathAction) => Promise<boolean>

/**
 * Read the Client Remote carrying Host path gestures.
 * @param ctx - browser Cordis context.
 * @returns the gesture runner, or undefined when this deployment mounts no
 * Client Remote; the card then keeps its chat-side file opener.
 */
export function mediaPathAction(ctx: ClientContext): MediaPathActionRunner | undefined {
  const remote: ClientRemote | undefined = ctx.get('remote')
  if (remote === undefined) return undefined
  return async (path, action) => {
    try {
      const result = await remote.session.openWorkspacePath(action === 'reveal' ? { path, action } : { path })
      return result.ok
    } catch {
      // An unreachable Host failed the gesture like a Host that refused it.
      return false
    }
  }
}
