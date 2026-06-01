import AgentStatusScreen from '@renderer/pages/agents/components/status/AgentStatusScreen'
import { Button } from 'antd'
import { ServerOff, Settings } from 'lucide-react'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const ChatLocalModelEmpty: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleGoToOfflineSettings = useCallback(() => {
    navigate('/settings/offline')
  }, [navigate])

  const handleGoToProviderSettings = useCallback(() => {
    navigate('/settings/provider?id=intranet')
  }, [navigate])

  return (
    <AgentStatusScreen
      icon={ServerOff}
      iconClassName="text-(--color-text-3)"
      title={t('offline.chat.empty_title')}
      description={t('offline.chat.empty_description')}
      actions={
        <>
          <Button type="primary" icon={<Settings size={16} />} onClick={handleGoToOfflineSettings}>
            {t('offline.chat.configure_local_model')}
          </Button>
          <Button type="default" onClick={handleGoToProviderSettings}>
            {t('offline.chat.configure_provider')}
          </Button>
        </>
      }
    />
  )
}

export default ChatLocalModelEmpty
