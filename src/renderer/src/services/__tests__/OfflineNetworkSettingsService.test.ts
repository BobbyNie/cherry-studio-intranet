import { describe, expect, it } from 'vitest'

import {
  createIntranetProviderShortcutUpdate,
  mergeIntranetProviderShortcut,
  normalizeOfflineSettingsForSave,
  type PersistedOfflineSettings,
  validateOfflineSettings
} from '../OfflineNetworkSettingsService'

function makeSettings(overrides: Partial<PersistedOfflineSettings> = {}): PersistedOfflineSettings {
  return {
    localModelServiceEnabled: false,
    localModelApiHost: '',
    allowedPorts: [],
    ...overrides
  }
}

describe('OfflineNetworkSettingsService', () => {
  it('normalizes the legacy local model flag from the configured provider api host', () => {
    expect(
      normalizeOfflineSettingsForSave(makeSettings({ localModelServiceEnabled: false, localModelApiHost: '  ' }))
    ).toMatchObject({
      localModelServiceEnabled: false,
      localModelApiHost: ''
    })
    expect(
      normalizeOfflineSettingsForSave(
        makeSettings({ localModelServiceEnabled: false, localModelApiHost: ' http://llm-gateway.intranet.local/v1 ' })
      )
    ).toMatchObject({
      localModelServiceEnabled: true,
      localModelApiHost: 'http://llm-gateway.intranet.local/v1'
    })
  })

  it('validates provider api hosts when present without requiring the legacy switch', () => {
    expect(validateOfflineSettings(makeSettings())).toBeNull()
    expect(validateOfflineSettings(makeSettings({ localModelApiHost: 'not-a-url' }))).toBe(
      'offline.settings.validation.invalid_host'
    )
    expect(
      validateOfflineSettings(makeSettings({ localModelApiHost: 'http://llm-gateway.intranet.local/v1' }))
    ).toBeNull()
  })

  it('does not clear or disable an existing intranet provider when no shortcut api host is saved', () => {
    const providers = [
      {
        id: 'intranet',
        enabled: true,
        apiHost: 'http://llm-gateway.intranet.local/v1'
      }
    ]

    expect(mergeIntranetProviderShortcut(providers, makeSettings(), 'intranet')).toEqual(providers)
    expect(createIntranetProviderShortcutUpdate(makeSettings(), 'intranet')).toBeNull()
  })

  it('updates and enables the intranet provider when a shortcut api host is saved', () => {
    const providers = [
      {
        id: 'intranet',
        enabled: false,
        apiHost: ''
      }
    ]
    const settings = makeSettings({ localModelApiHost: ' http://llm-gateway.intranet.local/v1 ' })

    expect(createIntranetProviderShortcutUpdate(settings, 'intranet')).toEqual({
      id: 'intranet',
      enabled: true,
      apiHost: 'http://llm-gateway.intranet.local/v1'
    })
    expect(mergeIntranetProviderShortcut(providers, settings, 'intranet')).toEqual([
      {
        id: 'intranet',
        enabled: true,
        apiHost: 'http://llm-gateway.intranet.local/v1'
      }
    ])
  })
})
