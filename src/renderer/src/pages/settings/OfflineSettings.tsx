import { SYSTEM_PROVIDERS_CONFIG } from '@renderer/config/providers'
import type { PersistedOfflineSettings } from '@renderer/services/OfflineNetworkSettingsService'
import {
  applyOfflineSettings,
  getPersistedOfflineSettings,
  loadOfflineSettingsFromMain,
  validateOfflineSettings
} from '@renderer/services/OfflineNetworkSettingsService'
import { syncProviderNetworkAllowlist } from '@renderer/services/ProviderNetworkAllowlistService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { updateProvider } from '@renderer/store/llm'
import { isOfflineMode } from '@shared/config/intranet'
import { Button, Input, Switch, Tag } from 'antd'
import { ShieldOff } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '.'

const OfflineSettings: FC = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const providers = useAppSelector((state) => state.llm.providers)
  const offlineMode = isOfflineMode()
  const [settings, setSettings] = useState<PersistedOfflineSettings>(() => getPersistedOfflineSettings())

  useEffect(() => {
    void loadOfflineSettingsFromMain().then((loaded) => {
      if (loaded) {
        setSettings(loaded)
        applyOfflineSettings(loaded)
      }
    })
  }, [])

  if (!offlineMode) {
    return null
  }

  const onSave = () => {
    const validationKey = validateOfflineSettings(settings)
    if (validationKey) {
      window.toast.error(t(validationKey))
      return
    }

    applyOfflineSettings(settings)
    dispatch(
      updateProvider({
        id: SYSTEM_PROVIDERS_CONFIG.intranet.id,
        enabled: settings.localModelServiceEnabled,
        apiHost: settings.localModelServiceEnabled ? settings.localModelApiHost.trim() : ''
      })
    )

    const nextProviders = providers.map((provider) =>
      provider.id === SYSTEM_PROVIDERS_CONFIG.intranet.id
        ? {
            ...provider,
            enabled: settings.localModelServiceEnabled,
            apiHost: settings.localModelServiceEnabled ? settings.localModelApiHost.trim() : ''
          }
        : provider
    )
    syncProviderNetworkAllowlist(nextProviders)
    window.toast.success(t('offline.settings.saved'))
  }

  return (
    <SettingContainer>
      <SettingTitle>{t('offline.settings.title')}</SettingTitle>
      <SettingGroup>
        <SettingRow>
          <SettingRowTitle>
            <ShieldOff size={18} />
            {t('offline.settings.edition_label')}
          </SettingRowTitle>
          <Tag color="blue">{t('offline.settings.edition_tag')}</Tag>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('offline.settings.description')}</SettingRowTitle>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('offline.settings.enable_local_model')}</SettingRowTitle>
          <Switch
            checked={settings.localModelServiceEnabled}
            onChange={(checked) => setSettings((current) => ({ ...current, localModelServiceEnabled: checked }))}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('offline.settings.api_host')}</SettingRowTitle>
          <Input
            style={{ width: 360 }}
            placeholder={t('offline.settings.api_host_placeholder')}
            value={settings.localModelApiHost}
            disabled={!settings.localModelServiceEnabled}
            onChange={(event) => setSettings((current) => ({ ...current, localModelApiHost: event.target.value }))}
          />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('offline.settings.save')}</SettingRowTitle>
          <Button type="primary" onClick={onSave}>
            {t('common.save')}
          </Button>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

export default OfflineSettings
