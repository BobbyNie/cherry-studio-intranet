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

function extractPrNumber(message: string): string | null {
  const match = message.match(/\(#(\d+)\)/)
  return match?.[1] ?? null
}

function collectPrNumbers(ref: string): Set<string> {
  const lines = runGit(`git log --format=%s ${ref}`).split('\n').filter(Boolean)
  const prNumbers = lines.map(extractPrNumber).filter((value): value is string => value !== null)
  return new Set(prNumbers)
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

    const intranetPrNumbers = collectPrNumbers('HEAD')
    const pendingUpstreamCommits = runGit('git log --format=%H%x09%s HEAD..upstream/main')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const missingByPr = pendingUpstreamCommits
      .map((line) => {
        const [sha, ...messageParts] = line.split('\t')
        const message = messageParts.join('\t')
        const prNumber = extractPrNumber(message)
        if (!prNumber || intranetPrNumbers.has(prNumber)) {
          return null
        }
        return `${sha} ${message}`
      })
      .filter((line): line is string => line !== null)

    expect(
      missingByPr,
      missingByPr.length > 0
        ? `Missing upstream PRs not yet applied to intranet:\n${missingByPr.join('\n')}`
        : undefined
    ).toEqual([])
  })
})

describe('upstream sync fixtures', () => {
  it('keeps intranet change tracking doc available', () => {
    expect(existsSync(resolve(root, 'INTRANET_CHANGES.md'))).toBe(true)
  })
})
