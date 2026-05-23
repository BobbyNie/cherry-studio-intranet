import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function runGit(command: string): string {
  return execSync(command, { cwd: root, encoding: 'utf8' }).trim()
}

function hasUpstreamRemote(): boolean {
  try {
    const remotes = runGit('git remote')
    return remotes.split('\n').includes('upstream')
  } catch {
    return false
  }
}

describe('upstream sync status', () => {
  it('documents the upstream source of truth', () => {
    const packageJson = JSON.parse(
      execSync('node -p "JSON.stringify(require(\\"./package.json\\"))"', { cwd: root, encoding: 'utf8' })
    ) as { homepage?: string }

    expect(packageJson.homepage).toBe('https://github.com/CherryHQ/cherry-studio')
  })

  it('has no pending upstream main commits when upstream remote is configured', () => {
    if (!hasUpstreamRemote()) {
      return
    }

    runGit('git fetch upstream main --quiet')

    const pendingPatches = runGit('git cherry -v HEAD upstream/main')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('+'))

    expect(
      pendingPatches,
      pendingPatches.length > 0
        ? `Missing upstream patches not yet applied to intranet:\n${pendingPatches.join('\n')}`
        : undefined
    ).toEqual([])
  })
})

describe('upstream sync fixtures', () => {
  it('keeps intranet change tracking doc available', () => {
    expect(existsSync(resolve(root, 'INTRANET_CHANGES.md'))).toBe(true)
  })
})
