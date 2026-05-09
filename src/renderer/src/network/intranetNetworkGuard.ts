import { assertNetworkAllowed, isPublicNetworkDisabled } from '@shared/config/intranet'

let installed = false

export function installRendererIntranetNetworkGuard(): void {
  if (installed || !isPublicNetworkDisabled()) {
    return
  }

  installed = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    assertNetworkAllowed(resolveFetchUrl(input))
    return originalFetch(input, init)
  }) as typeof window.fetch

  const OriginalWebSocket = window.WebSocket
  window.WebSocket = new Proxy(OriginalWebSocket, {
    construct(target, args: [string | URL, string | string[] | undefined]) {
      assertNetworkAllowed(args[0].toString())
      return Reflect.construct(target, args)
    }
  })

  if (typeof window.EventSource === 'function') {
    const OriginalEventSource = window.EventSource
    window.EventSource = new Proxy(OriginalEventSource, {
      construct(target, args: [string | URL, EventSourceInit | undefined]) {
        assertNetworkAllowed(args[0].toString())
        return Reflect.construct(target, args)
      }
    })
  }
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
