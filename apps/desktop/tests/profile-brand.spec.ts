/** Brand slot ownership in the shipped Desktop composition. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { composeEntries, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { createPluginProfile } from '../src/project-manager.ts'

it('disables the upstream sidebar brand occupant for the Threerouter plugin', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-desktop-profile-brand-'))
  try {
    const profileDir = join(home, 'profiles', 'desktop')
    createPluginProfile(profileDir)
    const installAnchor = fileURLToPath(new URL('../../cli/package.json', import.meta.url))
    const profile = loadProfileDirectory('dsh desktop', profileDir, installAnchor)
    const warnings: string[] = []
    const rows = composeEntries([
      ...profile.layers.map(layer => layer.patches),
      profile.patches,
    ], message => warnings.push(message))

    expect(rows.find(row => row.name === '@deepseek-ai/dsh-client-ui-brand-official')).toEqual({
      id: 'ui-brand-official',
      name: '@deepseek-ai/dsh-client-ui-brand-official',
      disabled: true,
    })
    expect(rows.filter(row => row.name === 'dsh-plugin-threerouter')).toEqual([
      { id: 'threerouter-integration', name: 'dsh-plugin-threerouter' },
    ])
    expect(warnings).toEqual([])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
