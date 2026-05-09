import { loggerService } from '@logger'
import { assertNetworkAllowed, isPublicNetworkDisabled } from '@shared/config/intranet'
import { net, type Session } from 'electron'

const logger = loggerService.withContext('IntranetNetworkGuard')
const guardedSessions = new WeakSet<Session>()

let globalFetchInstalled = false
let electronNetInstalled = false

export function installMainIntranetNetworkGuard(): void {
  if (!isPublicNetworkDisabled()) {
    return
  }

  installGlobalFetchGuard()
  installElectronNetFetchGuard()
}

export function installSessionIntranetNetworkGuard(targetSession: Session): void {
  if (!isPublicNetworkDisabled() || guardedSessions.has(targetSession)) {
    return
  }

  guardedSessions.add(targetSession)
  targetSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (details, callback) => {
      try {
        assertNetworkAllowed(details.url)
        callback({ cancel: false })
      } catch (error) {
        logger.warn('Blocked public network request in intranet mode', {
          url: details.url,
          error: error instanceof Error ? error.message : String(error)
        })
        callback({ cancel: true })
      }
    }
  )
}

function installGlobalFetchGuard(): void {
  if (globalFetchInstalled || typeof globalThis.fetch !== 'function') {
    return
  }

  const originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    assertNetworkAllowed(resolveFetchUrl(input))
    return originalFetch(input, init)
  }) as typeof globalThis.fetch
  globalFetchInstalled = true
}

function installElectronNetFetchGuard(): void {
  if (electronNetInstalled || typeof net.fetch !== 'function') {
    return
  }

  const originalNetFetch = net.fetch.bind(net)
  ;(net as unknown as { fetch: typeof net.fetch }).fetch = ((
    input: Parameters<typeof net.fetch>[0],
    init?: RequestInit
  ) => {
    assertNetworkAllowed(resolveFetchUrl(input as RequestInfo | URL))
    return originalNetFetch(input, init)
  }) as typeof net.fetch
  electronNetInstalled = true
}

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  if (input instanceof URL) {
    return input.toString()
  }
  return input.url
}
