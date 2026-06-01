import { describe, expect, it } from 'vitest'

import migrate from '../migrate'

describe('store migrations', () => {
  describe('migration 208: StepFun Anthropic-compatible host backfill', () => {
    it('backfills anthropicApiHost for existing StepFun providers', async () => {
      const state = {
        llm: {
          providers: [
            {
              id: 'stepfun',
              apiHost: 'https://api.stepfun.com'
            }
          ]
        },
        _persist: { version: 207, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 208)

      expect(migrated.llm.providers[0].anthropicApiHost).toBe('https://api.stepfun.com')
    })

    it('preserves existing StepFun anthropicApiHost customizations', async () => {
      const state = {
        llm: {
          providers: [
            {
              id: 'stepfun',
              apiHost: 'https://api.stepfun.com',
              anthropicApiHost: 'https://custom.example.com'
            }
          ]
        },
        _persist: { version: 207, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 208)

      expect(migrated.llm.providers[0].anthropicApiHost).toBe('https://custom.example.com')
    })
  })

  describe('migration 209: privacy policy data collection default', () => {
    it('enables data collection for non-intranet upgrades', async () => {
      const state = {
        settings: { enableDataCollection: false },
        _persist: { version: 208, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 209)

      expect(migrated.settings.enableDataCollection).toBe(true)
    })

    it('does not enable data collection in intranet mode', async () => {
      process.env.CHERRY_INTRANET_MODE = 'true'
      const state = {
        settings: { enableDataCollection: false },
        _persist: { version: 208, rehydrated: false }
      }

      const migrated: any = await migrate(state as any, 209)

      expect(migrated.settings.enableDataCollection).toBe(false)
      delete process.env.CHERRY_INTRANET_MODE
    })
  })
})
