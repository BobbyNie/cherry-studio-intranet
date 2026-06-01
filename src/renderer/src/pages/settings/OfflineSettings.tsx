import { SYSTEM_PROVIDERS_CONFIG } from '@renderer/config/providers'
import { updateProvider } from '@renderer/store/llm'
import {
  applyOfflineSettings,
  getPersistedOfflineSettings,
  loadOfflineSettingsFromMain,
  validateOfflineSettings,
  type PersistedOfflineSettings
} from '@renderer/services/OfflineNetworkSettingsService'
import { useAppDispatch } from '@renderer/store'
import { getDefaultLocalModelPorts, isOfflineMode } from '@shared/config/intranet'
import { Button, Input, Switch, Tag } from 'antd'
import { ShieldOff } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '.'

const OfflineSettings: FC = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
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
          <SettingRowTitle>{t('offline.settings.allowed_ports')}</SettingRowTitle>
          <Input
            style={{ width: 360 }}
            placeholder={getDefaultLocalModelPorts().join(', ')}
            value={settings.allowedPorts.join(', ')}
            disabled={!settings.localModelServiceEnabled}
            onChange={(event) => {
              const allowedPorts = event.target.value
                .split(/[\n,;]/)
                .map((entry) => Number(entry.trim()))
                .filter((port) => Number.isInteger(port) && port >= 1 && port <= 65535)
              setSettings((current) => ({ ...current, allowedPorts }))
            }}
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
