import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

/** Latest upstream v1 line the intranet edition tracks (branch, not v2/main). */
const UPSTREAM_SYNC_REF = 'upstream/v1'

/** Upstream PRs intentionally excluded after intranet suitability review. */
const EXCLUDED_UPSTREAM_PRS = new Set([
  '15324', // upstream GitCode sync CI
  '15362', // upstream release chore
  '15410', // CherryIN OAuth flow
  '16703', // CherryIN-only model UI
  '17174', // CherryIN public website and OAuth domains
  '17229', // public managed auto-update service
  '17754' // native Claude runtime bypasses the centrally guarded Electron network stack
])

/** Upstream commits without a PR number that received an explicit intranet audit decision. */
const AUDITED_UNNUMBERED_UPSTREAM_COMMITS = new Set([
  '0871a61d4590abbbdca241344a62514869b99a02', // v1.9.8 release metadata; intranet releases are independent
  'b5745701210f826e8280b6a3aed3c22e819b8dcf', // provider filtering; independently adapted for intranet defaults
  'fb6adc1cc9e88ebb14af40d3c4343f5978fe7992', // privacy flow; adapted to skip notices and collection changes in intranet mode
  '0ef9e30e2cfb418280b9f1b3ee823e1bdb91fd80', // v1.9.9 release metadata; intranet releases are independent
  '725f1c062247544fcdead64c313d0a9271041dc5', // v1.9.10 release metadata; intranet releases are independent
  '9365845b41dd4fd1bd9b77aba90dd1c1d04b5b00', // v1.9.11 release metadata; intranet releases are independent
  '8bc6064769de70d8db31c75d118d5c7663fa73f9', // CherryIN API host; adapted by the intranet migration
  '7c751c701d6f3679dce7e524ca3a1f89db052bc0', // v1.9.12 release metadata; intranet releases are independent
  '4dc42c4c851a2a00cf7dc98f7788ce725be40839', // Windows runner update; independently applied
  'da22fb797343fd3760e5dd2d467eda9bf0017632' // v1.9.13 release metadata; intranet releases are independent
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

function extractPrNumbers(message: string): string[] {
  return Array.from(message.matchAll(/\(#(\d+)\)/g), (match) => match[1])
}

function extractPrNumber(message: string): string | null {
  return extractPrNumbers(message).at(-1) ?? null
}

function collectPrNumbers(ref: string): Set<string> {
  // Use %B (full message body, not just %s subject) so PR numbers listed inside
  // squash-merge commit bodies are recognised as already applied — e.g. a
  // "sync: cherry-pick upstream/v1 fixes ..." commit enumerates each upstream
  // PR in its body rather than carrying one commit per PR.
  const prNumbers = extractPrNumbers(runGit(`git log --format=%B ${ref}`))
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

function parsePatchEquivalentCommits(cherryOutput: string): Set<string> {
  return new Set(
    cherryOutput
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean)
  )
}

function isUpstreamCommitAudited(
  line: string,
  intranetPrNumbers: Set<string>,
  patchEquivalentCommits: Set<string> = new Set()
): boolean {
  const [sha, ...messageParts] = line.split('\t')
  const prNumber = extractPrNumber(messageParts.join('\t'))

  if (prNumber) {
    return intranetPrNumbers.has(prNumber) || EXCLUDED_UPSTREAM_PRS.has(prNumber)
  }

  return patchEquivalentCommits.has(sha) || AUDITED_UNNUMBERED_UPSTREAM_COMMITS.has(sha)
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
    const patchEquivalentCommits = parsePatchEquivalentCommits(runGit(`git cherry HEAD ${UPSTREAM_SYNC_REF}`))
    const pendingUpstreamCommits = runGit(`git log --format=%H%x09%s HEAD..${UPSTREAM_SYNC_REF}`)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const missingUpstreamCommits = pendingUpstreamCommits.filter(
      (line) => !isUpstreamCommitAudited(line, intranetPrNumbers, patchEquivalentCommits)
    )

    expect(
      missingUpstreamCommits,
      missingUpstreamCommits.length > 0
        ? `Missing upstream commits without an intranet audit decision:\n${missingUpstreamCommits.join('\n')}`
        : undefined
    ).toEqual([])
  }, 60_000)
})

describe('upstream sync fixtures', () => {
  it('uses the final parenthesized number as the upstream PR number', () => {
    expect(extractPrNumber('fix(message-converter): avoid empty assistant messages (#16195) (#16196)')).toBe('16196')
  })

  it('collects every upstream PR number from a combined commit message', () => {
    expect(extractPrNumbers('sync fixes (#16458) and headers (#17713)')).toEqual(['16458', '17713'])
  })

  it('requires an explicit audit decision for upstream commits without a PR number', () => {
    expect(isUpstreamCommitAudited('da22fb797343fd3760e5dd2d467eda9bf0017632\tv1.9.13', new Set())).toBe(true)
    expect(
      isUpstreamCommitAudited('0123456789abcdef0123456789abcdef01234567\tunexpected release chore', new Set())
    ).toBe(false)
  })

  it('recognizes patch-equivalent upstream commits as already applied', () => {
    const equivalent = parsePatchEquivalentCommits(
      '- 4b56265b9f823624f2485d232b6ea6f6cefac639\n+ 0123456789abcdef0123456789abcdef01234567'
    )

    expect(equivalent).toEqual(new Set(['4b56265b9f823624f2485d232b6ea6f6cefac639']))
  })

  it('keeps intranet change tracking doc available', () => {
    expect(existsSync(resolve(root, 'INTRANET_CHANGES.md'))).toBe(true)
  })

  it('documents upstream PRs intentionally excluded from the intranet edition', () => {
    const intranetChanges = readFileSync(resolve(root, 'INTRANET_CHANGES.md'), 'utf8')

    expect(EXCLUDED_UPSTREAM_PRS.has('17174')).toBe(true)
    expect(EXCLUDED_UPSTREAM_PRS.has('17229')).toBe(true)
    expect(EXCLUDED_UPSTREAM_PRS.has('17754')).toBe(true)
    expect(intranetChanges).toContain('#17174')
    expect(intranetChanges).toContain('#17229')
    expect(intranetChanges).toContain('#17754')
  })

  it('collects audited upstream PRs recorded as applicable in the intranet change log', () => {
    const documentedPrNumbers = collectDocumentedPrNumbers()

    expect(documentedPrNumbers.has('15241')).toBe(true)
    expect(documentedPrNumbers.has('17223')).toBe(true)
    expect(documentedPrNumbers.has('17174')).toBe(false)
    expect(documentedPrNumbers.has('17229')).toBe(false)
  })
})
