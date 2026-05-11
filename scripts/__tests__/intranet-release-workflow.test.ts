import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { parse } from 'yaml'

type WorkflowStep = {
  env?: Record<string, string>
  id?: string
  name?: string
  run?: string
  uses?: string
  with?: Record<string, string>
}

type WorkflowJob = {
  env?: Record<string, string>
  needs?: string | string[]
  steps: WorkflowStep[]
  strategy?: {
    matrix: {
      os: string[]
    }
  }
}

type IntranetReleaseWorkflow = {
  jobs: Record<string, WorkflowJob>
  on: {
    push: {
      branches?: string[]
      tags?: string[]
    }
  }
  permissions: {
    contents: string
  }
}

describe('intranet release workflow', () => {
  const root = resolve(__dirname, '../..')
  const workflowPath = resolve(root, '.github/workflows/intranet-release.yml')
  const builderConfigPath = resolve(root, 'electron-builder.yml')
  const envExamplePath = resolve(root, '.env.intranet.example')
  const gitignorePath = resolve(root, '.gitignore')
  const packageJsonPath = resolve(root, 'package.json')
  const readWorkflow = () => parse(readFileSync(workflowPath, 'utf8')) as IntranetReleaseWorkflow

  it('builds macOS and Windows intranet packages into a GitHub Release', () => {
    expect(existsSync(workflowPath)).toBe(true)

    const workflow = readWorkflow()
    const buildJob = workflow.jobs['build-intranet-release']
    const publishJob = workflow.jobs['publish-intranet-release']

    expect(workflow.permissions.contents).toBe('write')
    expect(buildJob.strategy?.matrix.os).toEqual(['macos-latest', 'windows-latest'])
    expect(publishJob.steps.some((step) => step.uses?.startsWith('ncipollo/release-action'))).toBe(true)

    const buildStep = buildJob.steps.find((step) => step.name === 'Build intranet package')
    expect(buildStep?.env?.CHERRY_INTRANET_MODE).toBe('true')
    expect(buildStep?.env?.CHERRY_DISABLE_PUBLIC_NETWORK).toBe('false')
    expect(buildStep?.env?.CHERRY_DISABLE_AUTO_UPDATE).toBe('true')
    expect(buildStep?.env?.CHERRY_DISABLE_TELEMETRY).toBe('true')
    expect(buildStep?.env?.CHERRY_DISABLE_MARKETPLACE).toBe('true')
    expect(buildStep?.env?.CHERRY_DISABLE_EXTERNAL_LINKS).toBe('true')
    expect(buildStep?.run).toContain('run_package_with_retry')
    expect(buildStep?.run).toContain('rm -rf dist out')
    expect(buildStep?.run).toContain('pnpm package:mac:intranet')
    expect(buildStep?.run).toContain('pnpm package:win:intranet')
  })

  it('runs tests before compiling release packages', () => {
    const workflow = readWorkflow()
    const testJob = workflow.jobs['test-intranet-release']
    const buildJob = workflow.jobs['build-intranet-release']
    const buildNeeds = Array.isArray(buildJob.needs) ? buildJob.needs : [buildJob.needs]
    const testRuns = testJob.steps.map((step) => step.run ?? '').join('\n')

    expect(testJob.needs).toBe('metadata')
    expect(buildNeeds).toEqual(expect.arrayContaining(['metadata', 'test-intranet-release']))
    expect(testRuns).toContain('pnpm lint')
    expect(testRuns).toContain('pnpm i18n:hardcoded:strict')
    expect(testRuns).toContain('pnpm test')
  })

  it('keeps the intranet env template available to GitHub Actions', () => {
    const gitignore = readFileSync(gitignorePath, 'utf8')
    const workflow = readWorkflow()
    const prepareEnvSteps = Object.values(workflow.jobs).flatMap((job) =>
      job.steps.filter((step) => step.name === 'Prepare intranet env file')
    )

    expect(existsSync(envExamplePath)).toBe(true)
    expect(gitignore).toContain('!.env.intranet.example')
    expect(prepareEnvSteps.length).toBeGreaterThan(0)
    expect(
      prepareEnvSteps.every((step: { run?: string }) => step.run === 'cp .env.intranet.example .env.intranet')
    ).toBe(true)
  })

  it('publishes releases automatically from main branch pushes', () => {
    const workflow = readWorkflow()
    const metadataRun = workflow.jobs.metadata.steps.find((step) => step.id === 'meta')?.run
    const publishStep = workflow.jobs['publish-intranet-release'].steps.find((step) =>
      step.name?.includes('Publish GitHub Release')
    )

    expect(workflow.on.push.branches).toContain('main')
    expect(metadataRun).toContain('PACKAGE_VERSION=')
    expect(metadataRun).toContain('TAG="intranet-v${PACKAGE_VERSION}-${SHORT_SHA}"')
    expect(metadataRun).toContain('VERSION="${PACKAGE_VERSION}"')
    expect(publishStep?.with?.commit).toBe('${{ github.sha }}')
  })

  it('checks out the repository before resolving package release metadata', () => {
    const workflow = readWorkflow()
    const metadataSteps = workflow.jobs.metadata.steps
    const checkoutIndex = metadataSteps.findIndex((step) => step.uses?.startsWith('actions/checkout'))
    const metadataIndex = metadataSteps.findIndex((step) => step.id === 'meta')

    expect(checkoutIndex).toBeGreaterThanOrEqual(0)
    expect(checkoutIndex).toBeLessThan(metadataIndex)
    expect(metadataSteps[metadataIndex].run).toContain("require('./package.json').version")
  })

  it('does not force intranet runtime flags while running the generic test suite', () => {
    const workflow = readWorkflow()
    const testEnv = workflow.jobs['test-intranet-release'].env ?? {}

    expect(Object.keys(testEnv).filter((name) => name.startsWith('CHERRY_'))).toEqual([])
  })

  it('only exports code signing secrets when they are configured', () => {
    const workflow = readWorkflow()
    const buildJob = workflow.jobs['build-intranet-release']
    const signingStep = buildJob.steps.find((step) => step.name === 'Configure optional code signing secrets')
    const buildStep = buildJob.steps.find((step) => step.name === 'Build intranet package')

    expect(signingStep?.run).toContain('GITHUB_ENV')
    expect(signingStep?.env?.CSC_LINK_SECRET).toBe('${{ secrets.CSC_LINK }}')
    expect(signingStep?.env?.APPLE_ID_SECRET).toBe('${{ secrets.APPLE_ID }}')
    expect(buildStep?.env).not.toHaveProperty('CSC_LINK')
    expect(buildStep?.env).not.toHaveProperty('CSC_KEY_PASSWORD')
    expect(buildStep?.env).not.toHaveProperty('APPLE_ID')
    expect(buildStep?.env?.CSC_IDENTITY_AUTO_DISCOVERY).toBe('false')
  })

  it('keeps Windows portable target available for release users', () => {
    const builderConfig = parse(readFileSync(builderConfigPath, 'utf8'))
    const winTargets = builderConfig.win.target.map((target: { target: string }) => target.target)
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

    expect(winTargets).toContain('portable')
    expect(packageJson.scripts['build:intranet']).toContain('.env.intranet.example')
    expect(packageJson.scripts['package:win:intranet']).toContain('--win')
    expect(packageJson.scripts['package:win:intranet']).toContain('.env.intranet.example')
    expect(packageJson.scripts['package:mac:intranet']).toContain('--mac')
    expect(packageJson.scripts['package:mac:intranet']).toContain('.env.intranet.example')
  })
})
