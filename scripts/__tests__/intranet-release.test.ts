import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

describe('intranet 2.0 release contract', () => {
  it('publishes only the isolated 2.0 line after validation and all platform builds', () => {
    const workflow = parse(readFileSync('.github/workflows/intranet-release.yml', 'utf8'))
    expect(workflow.on.push.branches).toEqual(['2.0'])
    expect(workflow.jobs.build.needs).toContain('validate')
    expect(workflow.jobs.publish.needs).toEqual(['metadata', 'build'])
    expect(workflow.jobs.build.strategy.matrix.include).toHaveLength(4)
    expect(workflow.jobs.build.env.CHERRY_INTRANET_MODE).toBe('true')
    for (const flag of ['AUTO_UPDATE', 'TELEMETRY', 'MARKETPLACE', 'EXTERNAL_LINKS']) {
      expect(workflow.jobs.build.env[`CHERRY_DISABLE_${flag}`]).toBe('true')
    }
    const publish = workflow.jobs.publish.steps.find((step: { name?: string }) => step.name === 'Publish release')
    expect(publish.with.draft).toBe(false)
    expect(publish.with.commit).toBe('${{ github.sha }}')
  })
})
