import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { parse } from 'yaml'

describe('intranet release workflow', () => {
  const root = resolve(__dirname, '../..')
  const workflowPath = resolve(root, '.github/workflows/intranet-release.yml')
  const builderConfigPath = resolve(root, 'electron-builder.yml')
  const packageJsonPath = resolve(root, 'package.json')

  it('builds macOS and Windows intranet packages into a GitHub Release', () => {
    expect(existsSync(workflowPath)).toBe(true)

    const workflow = parse(readFileSync(workflowPath, 'utf8'))
    const buildJob = workflow.jobs['build-intranet-release']
    const publishJob = workflow.jobs['publish-intranet-release']

    expect(workflow.permissions.contents).toBe('write')
    expect(buildJob.strategy.matrix.os).toEqual(['macos-latest', 'windows-latest'])
    expect(publishJob.steps.some((step: { uses?: string }) => step.uses?.startsWith('ncipollo/release-action'))).toBe(
      true
    )

    const buildStep = buildJob.steps.find((step: { name?: string }) => step.name === 'Build intranet package')
    expect(buildStep.env.CHERRY_INTRANET_MODE).toBe('true')
    expect(buildStep.env.CHERRY_DISABLE_PUBLIC_NETWORK).toBe('true')
    expect(buildStep.env.CHERRY_DISABLE_AUTO_UPDATE).toBe('true')
    expect(buildStep.env.CHERRY_DISABLE_TELEMETRY).toBe('true')
    expect(buildStep.env.CHERRY_DISABLE_MARKETPLACE).toBe('true')
    expect(buildStep.env.CHERRY_DISABLE_EXTERNAL_LINKS).toBe('true')
    expect(buildStep.run).toContain('pnpm package:mac:intranet')
    expect(buildStep.run).toContain('pnpm package:win:intranet')
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
