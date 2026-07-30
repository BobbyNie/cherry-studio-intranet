import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

/** Latest upstream v1 line the intranet edition tracks (branch, not v2/main). */
const UPSTREAM_SYNC_REF = 'upstream/v1'

/** Upstream PRs intentionally skipped for intranet (CI-only or release automation). */
const EXCLUDED_UPSTREAM_PRS = new Set([
  '15324', // upstream GitCode sync CI
  '15362', // upstream release chore
  '15410', // CherryIN OAuth flow
  '16703', // CherryIN-only model UI
  '17174', // CherryIN public website and OAuth domains
  '17229' // public managed auto-update service
])

function runGit(command: string): string {
  // Sized for `git log --format=%B HEAD` (full commit-body history, ~3MB today)
  // used by collectPrNumbers to detect PR numbers inside squash-merge bodies.
  return execSync(command, { cwd: root, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim()
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
  // Use %B (full message body, not just %s subject) so PR numbers listed inside
  // squash-merge commit bodies are recognised as already applied — e.g. a
  // "sync: cherry-pick upstream/v1 fixes ..." commit enumerates each upstream
  // PR in its body rather than carrying one commit per PR.
  const lines = runGit(`git log --format=%B ${ref}`).split('\n').filter(Boolean)
  const prNumbers = lines.map(extractPrNumber).filter((value): value is string => value !== null)
  return new Set(prNumbers)
}

function collectDocumentedPrNumbers(): Set<string> {
  const intranetChanges = readFileSync(resolve(root, 'INTRANET_CHANGES.md'), 'utf8')
  const documentedPrNumbers = intranetChanges
    .split('\n')
    .map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((cells) => cells.some((cell) => cell.startsWith('✅') || cell.startsWith('⚠️')))
    .map((cells) => cells[0]?.match(/^#(\d+)$/)?.[1])
    .filter((value): value is string => value !== undefined)

  return new Set(documentedPrNumbers)
}

describe('upstream sync status', () => {
  it('documents the upstream source of truth', () => {
    const packageJson = JSON.parse(
      execSync('node -p "JSON.stringify(require(\\"./package.json\\"))"', { cwd: root, encoding: 'utf8' })
    ) as { homepage?: string }

    expect(packageJson.homepage).toBe('https://github.com/CherryHQ/cherry-studio')
  })

  it(`has no pending upstream commits through ${UPSTREAM_SYNC_REF} when upstream remote is configured`, () => {
    if (!hasUpstreamRemote()) {
      return
    }

    runGit(`git fetch upstream v1 --quiet`)

    const intranetPrNumbers = new Set([...collectPrNumbers('HEAD'), ...collectDocumentedPrNumbers()])
    const pendingUpstreamCommits = runGit(`git log --format=%H%x09%s HEAD..${UPSTREAM_SYNC_REF}`)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const missingByPr = pendingUpstreamCommits
      .map((line) => {
        const [sha, ...messageParts] = line.split('\t')
        const message = messageParts.join('\t')
        const prNumber = extractPrNumber(message)
        if (!prNumber || intranetPrNumbers.has(prNumber) || EXCLUDED_UPSTREAM_PRS.has(prNumber)) {
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
  }, 60_000)
})

describe('upstream sync fixtures', () => {
  it('keeps intranet change tracking doc available', () => {
    expect(existsSync(resolve(root, 'INTRANET_CHANGES.md'))).toBe(true)
  })

  it('documents public-only upstream PRs excluded from the intranet edition', () => {
    const intranetChanges = readFileSync(resolve(root, 'INTRANET_CHANGES.md'), 'utf8')

    expect(EXCLUDED_UPSTREAM_PRS.has('17174')).toBe(true)
    expect(EXCLUDED_UPSTREAM_PRS.has('17229')).toBe(true)
    expect(intranetChanges).toContain('#17174')
    expect(intranetChanges).toContain('#17229')
  })

  it('collects audited upstream PRs recorded as applicable in the intranet change log', () => {
    const documentedPrNumbers = collectDocumentedPrNumbers()

    expect(documentedPrNumbers.has('15241')).toBe(true)
    expect(documentedPrNumbers.has('17223')).toBe(true)
    expect(documentedPrNumbers.has('17174')).toBe(false)
    expect(documentedPrNumbers.has('17229')).toBe(false)
  })
})
