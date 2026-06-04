import { InfoCircleOutlined } from '@ant-design/icons'
import { HStack } from '@renderer/components/Layout'
import Selector from '@renderer/components/Selector'
import { InfoTooltip } from '@renderer/components/TooltipIcons'
import { isMac } from '@renderer/config/constant'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useEnableDeveloperMode, useSettings } from '@renderer/hooks/useSettings'
import { useTimer } from '@renderer/hooks/useTimer'
import i18n from '@renderer/i18n'
import type { RootState } from '@renderer/store'
import { useAppDispatch } from '@renderer/store'
import { updateAssistant, updateDefaultAssistant } from '@renderer/store/assistants'
import {
  setEnableDataCollection,
  setEnableSpellCheck,
  setLanguage,
  setNotificationSettings,
  setProxyBypassRules as _setProxyBypassRules,
  setProxyMode,
  setProxyUrl as _setProxyUrl,
  setSpellCheckLanguages
} from '@renderer/store/settings'
import type { LanguageVarious } from '@renderer/types'
import type { NotificationSource } from '@renderer/types/notification'
import { isValidProxyUrl } from '@renderer/utils'
import { formatErrorMessage } from '@renderer/utils/error'
import { defaultByPassRules, defaultLanguage } from '@shared/config/constant'
import { isIntranetMode, isOfflineMode } from '@shared/config/intranet'
import { normalizeNetworkAllowlistRule, normalizeNetworkAllowlistRules } from '@shared/network/networkAllowlist'
import { Alert, Button, Flex, Input, Switch, Tooltip } from 'antd'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  SettingContainer,
  SettingDescription,
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingTitle
} from '.'

type SpellCheckOption = { readonly value: string; readonly label: string; readonly flag: string }

// Define available spell check languages with display names (only commonly supported languages)
const spellCheckLanguageOptions: readonly SpellCheckOption[] = [
  { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { value: 'pl', label: 'Polski', flag: '🇵🇱' },
  { value: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { value: 'el', label: 'Ελληνικά', flag: '🇬🇷' }
]

const getDefaultNamesForKey = (key: string): Set<string> =>
  new Set(Object.keys(i18n.store.data).map((locale) => i18n.getFixedT(locale)(key)))

const GeneralSettings: FC = () => {
  const {
    language,
    proxyUrl: storeProxyUrl,
    proxyBypassRules: storeProxyBypassRules,
    setLaunch,
    setTray,
    launchOnBoot,
    launchToTray,
    trayOnClose,
    tray,
    proxyMode: storeProxyMode,
    enableDataCollection,
    enableSpellCheck,
    disableHardwareAcceleration,
    setDisableHardwareAcceleration
  } = useSettings()
  const [proxyUrl, setProxyUrl] = useState<string | undefined>(storeProxyUrl)
  const [proxyBypassRules, setProxyBypassRules] = useState<string | undefined>(storeProxyBypassRules)
  const { theme } = useTheme()
  const offlineMode = isOfflineMode()
  const intranetMode = isIntranetMode()
  const showIntranetAllowlist = offlineMode || intranetMode
  const [intranetAllowlistText, setIntranetAllowlistText] = useState('')
  const [intranetAllowlistInvalidRules, setIntranetAllowlistInvalidRules] = useState<string[]>([])
  const [intranetAllowlistSaving, setIntranetAllowlistSaving] = useState(false)
  const { enableDeveloperMode, setEnableDeveloperMode } = useEnableDeveloperMode()
  const { setTimeoutTimer } = useTimer()

  const updateTray = (isShowTray: boolean) => {
    setTray(isShowTray)
    //only set tray on close/launch to tray when tray is enabled
    if (!isShowTray) {
      updateTrayOnClose(false)
      updateLaunchToTray(false)
    }
  }

  const updateTrayOnClose = (isTrayOnClose: boolean) => {
    setTray(undefined, isTrayOnClose)
    //in case tray is not enabled, enable it
    if (isTrayOnClose && !tray) {
      updateTray(true)
    }
  }

  const updateLaunchOnBoot = (isLaunchOnBoot: boolean) => {
    setLaunch(isLaunchOnBoot)
  }

  const updateLaunchToTray = (isLaunchToTray: boolean) => {
    setLaunch(undefined, isLaunchToTray)
    if (isLaunchToTray && !tray) {
      updateTray(true)
    }
  }

  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const defaultAssistant = useSelector((state: RootState) => state.assistants.defaultAssistant)

  const onSelectLanguage = async (value: LanguageVarious) => {
    dispatch(setLanguage(value))
    localStorage.setItem('language', value)
    void window.api.setLanguage(value)
    await i18n.changeLanguage(value)

    if (getDefaultNamesForKey('chat.default.name').has(defaultAssistant.name)) {
      const newName = i18n.t('chat.default.name')
      const knownTopicNames = getDefaultNamesForKey('chat.default.topic.name')
      const updatedTopics = defaultAssistant.topics.map((topic) =>
        knownTopicNames.has(topic.name) ? { ...topic, name: i18n.t('chat.default.topic.name') } : topic
      )
      dispatch(updateDefaultAssistant({ assistant: { ...defaultAssistant, name: newName, topics: updatedTopics } }))
      dispatch(updateAssistant({ id: defaultAssistant.id, name: newName, topics: updatedTopics }))
    }
  }

  const handleSpellCheckChange = (checked: boolean) => {
    dispatch(setEnableSpellCheck(checked))
    void window.api.setEnableSpellCheck(checked)
  }

  const onSetProxyUrl = () => {
    if (proxyUrl && !isValidProxyUrl(proxyUrl)) {
      window.toast.error(t('message.error.invalid.proxy.url'))
      return
    }

    dispatch(_setProxyUrl(proxyUrl))
  }

  const onSetProxyBypassRules = () => {
    dispatch(_setProxyBypassRules(proxyBypassRules))
  }

  const proxyModeOptions: { value: 'system' | 'custom' | 'none'; label: string }[] = [
    { value: 'system', label: t('settings.proxy.mode.system') },
    { value: 'custom', label: t('settings.proxy.mode.custom') },
    { value: 'none', label: t('settings.proxy.mode.none') }
  ]

  const onProxyModeChange = (mode: 'system' | 'custom' | 'none') => {
    dispatch(setProxyMode(mode))
  }

  const languagesOptions: { value: LanguageVarious; label: string; flag: string }[] = [
    { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { value: 'zh-TW', label: '中文（繁体）', flag: '🇭🇰' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
    { value: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'ja-JP', label: '日本語', flag: '🇯🇵' },
    { value: 'ru-RU', label: 'Русский', flag: '🇷🇺' },
    { value: 'el-GR', label: 'Ελληνικά', flag: '🇬🇷' },
    { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
    { value: 'fr-FR', label: 'Français', flag: '🇫🇷' },
    { value: 'pt-PT', label: 'Português', flag: '🇵🇹' },
    { value: 'ro-RO', label: 'Română', flag: '🇷🇴' },
    { value: 'vi-VN', label: 'Tiếng Việt', flag: '🇻🇳' }
  ]

  const notificationSettings = useSelector((state: RootState) => state.settings.notification)
  const spellCheckLanguages = useSelector((state: RootState) => state.settings.spellCheckLanguages)

  const handleNotificationChange = (type: NotificationSource, value: boolean) => {
    dispatch(setNotificationSettings({ ...notificationSettings, [type]: value }))
  }

  const handleSpellCheckLanguagesChange = (selectedLanguages: string[]) => {
    dispatch(setSpellCheckLanguages(selectedLanguages))
    void window.api.setSpellCheckLanguages(selectedLanguages)
  }

  useEffect(() => {
    if (!showIntranetAllowlist) {
      return
    }

    void window.api.config.get('intranetNetworkAllowlist').then((stored) => {
      const rules = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
      setIntranetAllowlistText(rules.join('\n'))
      setIntranetAllowlistInvalidRules([])
    })
  }, [showIntranetAllowlist])

  const handleSaveIntranetAllowlist = async () => {
    const lines = intranetAllowlistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const invalidRules = lines.filter((line) => !normalizeNetworkAllowlistRule(line))
    if (invalidRules.length > 0) {
      setIntranetAllowlistInvalidRules(invalidRules)
      return
    }

    const normalizedRules = normalizeNetworkAllowlistRules(lines)
    setIntranetAllowlistSaving(true)
    try {
      await window.api.config.set('intranetNetworkAllowlist', normalizedRules)
      setIntranetAllowlistText(normalizedRules.join('\n'))
      setIntranetAllowlistInvalidRules([])
      window.toast.success(t('settings.intranet.allowlist.save'))
    } catch (error) {
      window.toast.error(formatErrorMessage(error))
    } finally {
      setIntranetAllowlistSaving(false)
    }
  }

  const handleHardwareAccelerationChange = (checked: boolean) => {
    window.modal.confirm({
      title: t('settings.hardware_acceleration.confirm.title'),
      content: t('settings.hardware_acceleration.confirm.content'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      onOk() {
        try {
          setDisableHardwareAcceleration(checked)
        } catch (error) {
          window.toast.error(formatErrorMessage(error))
          return
        }

        // 重启应用
        setTimeoutTimer(
          'handleHardwareAccelerationChange',
          () => {
            void window.api.relaunchApp()
          },
          500
        )
      }
    })
  }

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.general.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('common.language')}</SettingRowTitle>
          <Selector
            size={14}
            value={language || defaultLanguage}
            onChange={onSelectLanguage}
            options={languagesOptions.map((lang) => ({
              label: (
                <Flex align="center" gap={8}>
                  <span role="img" aria-label={lang.flag}>
                    {lang.flag}
                  </span>
                  {lang.label}
                </Flex>
              ),
              value: lang.value
            }))}
          />
        </SettingRow>
        {!offlineMode && (
          <>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.proxy.mode.title')}</SettingRowTitle>
              <Selector value={storeProxyMode} onChange={onProxyModeChange} options={proxyModeOptions} />
            </SettingRow>
          </>
        )}
        {!offlineMode && storeProxyMode === 'custom' && (
          <>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle>{t('settings.proxy.address')}</SettingRowTitle>
              <Input
                spellCheck={false}
                placeholder="socks5://127.0.0.1:6153"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                style={{ width: 180 }}
                onBlur={() => onSetProxyUrl()}
                type="url"
              />
            </SettingRow>
          </>
        )}
        {!offlineMode && storeProxyMode === 'custom' && (
          <>
            <SettingDivider />
            <SettingRow>
              <SettingRowTitle style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{t('settings.proxy.bypass')}</span>
                <Tooltip title={t('settings.proxy.tip')} placement="right">
                  <InfoCircleOutlined style={{ cursor: 'pointer' }} />
                </Tooltip>
              </SettingRowTitle>
              <Input
                spellCheck={false}
                placeholder={defaultByPassRules}
                value={proxyBypassRules}
                onChange={(e) => setProxyBypassRules(e.target.value)}
                style={{ width: 180 }}
                onBlur={() => onSetProxyBypassRules()}
              />
            </SettingRow>
          </>
        )}
        <SettingDivider />
        <SettingRow>
          <HStack justifyContent="space-between" alignItems="center" style={{ flex: 1, marginRight: 16 }}>
            <SettingRowTitle>{t('settings.general.spell_check.label')}</SettingRowTitle>
            {enableSpellCheck && !isMac && (
              <Selector<string>
                size={14}
                multiple
                value={spellCheckLanguages}
                placeholder={t('settings.general.spell_check.languages')}
                onChange={handleSpellCheckLanguagesChange}
                options={spellCheckLanguageOptions.map((lang) => ({
                  value: lang.value,
                  label: (
                    <Flex align="center" gap={8}>
                      <span role="img" aria-label={lang.flag}>
                        {lang.flag}
                      </span>
                      {lang.label}
                    </Flex>
                  )
                }))}
              />
            )}
          </HStack>
          <Switch checked={enableSpellCheck} onChange={handleSpellCheckChange} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.hardware_acceleration.title')}</SettingRowTitle>
          <Switch checked={disableHardwareAcceleration} onChange={handleHardwareAccelerationChange} />
        </SettingRow>
      </SettingGroup>
      {showIntranetAllowlist ? (
        <SettingGroup theme={theme}>
          <SettingTitle>{t('settings.intranet.allowlist.title')}</SettingTitle>
          <SettingDescription>{t('settings.intranet.allowlist.description')}</SettingDescription>
          <SettingDivider />
          <Input.TextArea
            spellCheck={false}
            value={intranetAllowlistText}
            onChange={(e) => {
              setIntranetAllowlistText(e.target.value)
              if (intranetAllowlistInvalidRules.length > 0) {
                setIntranetAllowlistInvalidRules([])
              }
            }}
            placeholder={t('settings.intranet.allowlist.placeholder')}
            autoSize={{ minRows: 4, maxRows: 12 }}
            style={{ fontFamily: 'monospace' }}
          />
          <Button
            type="primary"
            onClick={() => void handleSaveIntranetAllowlist()}
            loading={intranetAllowlistSaving}
            style={{ marginTop: 10 }}>
            {t('settings.intranet.allowlist.save')}
          </Button>
          {intranetAllowlistInvalidRules.length > 0 ? (
            <Alert
              style={{ marginTop: 10 }}
              type="error"
              message={
                <div>
                  {intranetAllowlistInvalidRules.map((rule) => (
                    <div key={rule}>{t('settings.intranet.allowlist.invalidRule', { rule })}</div>
                  ))}
                </div>
              }
            />
          ) : null}
        </SettingGroup>
      ) : null}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.notification.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{t('settings.notification.assistant')}</span>
            <Tooltip title={t('notification.tip')} placement="right">
              <InfoCircleOutlined style={{ cursor: 'pointer' }} />
            </Tooltip>
          </SettingRowTitle>
          <Switch checked={notificationSettings.assistant} onChange={(v) => handleNotificationChange('assistant', v)} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.notification.backup')}</SettingRowTitle>
          <Switch checked={notificationSettings.backup} onChange={(v) => handleNotificationChange('backup', v)} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.notification.knowledge_embed')}</SettingRowTitle>
          <Switch checked={notificationSettings.knowledge} onChange={(v) => handleNotificationChange('knowledge', v)} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.launch.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.launch.onboot')}</SettingRowTitle>
          <Switch checked={launchOnBoot} onChange={(checked) => updateLaunchOnBoot(checked)} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.launch.totray')}</SettingRowTitle>
          <Switch checked={launchToTray} onChange={(checked) => updateLaunchToTray(checked)} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.tray.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.tray.show')}</SettingRowTitle>
          <Switch checked={tray} onChange={(checked) => updateTray(checked)} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.tray.onclose')}</SettingRowTitle>
          <Switch checked={trayOnClose} onChange={(checked) => updateTrayOnClose(checked)} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.privacy.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.privacy.enable_privacy_mode')}</SettingRowTitle>
          <Switch
            value={enableDataCollection}
            onChange={(v) => {
              dispatch(setEnableDataCollection(v))
              void window.api.config.set('enableDataCollection', v)
            }}
          />
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.developer.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <Flex align="center" gap={4}>
            <SettingRowTitle>{t('settings.developer.enable_developer_mode')}</SettingRowTitle>
            <InfoTooltip title={t('settings.developer.help')} />
          </Flex>
          <Switch checked={enableDeveloperMode} onChange={setEnableDeveloperMode} />
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

export default GeneralSettings
