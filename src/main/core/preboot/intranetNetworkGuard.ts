import { loggerService } from '@logger'
import { isPublicNetworkDisabled } from '@shared/utils/intranet'
import { app } from 'electron'

import { assertIntranetNetworkAllowed } from './intranetNetworkPolicy'

const logger = loggerService.withContext('IntranetNetworkGuard')

let installed = false

/**
 * Install the renderer/webview network boundary before the first window is
 * created. Every webContents session is covered through Electron's lifecycle
 * event, including sessions created later by webviews and auxiliary windows.
 */
export function installIntranetNetworkGuard(): void {
  if (installed || !isPublicNetworkDisabled()) return

  installed = true
  app.on('web-contents-created', (_, webContents) => {
    webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (details, callback) => {
        try {
          assertIntranetNetworkAllowed(details.url)
          callback({ cancel: false })
        } catch (error) {
          logger.warn(`Blocked renderer network request: ${details.url}`, error as Error)
          callback({ cancel: true })
        }
      }
    )
  })
}
