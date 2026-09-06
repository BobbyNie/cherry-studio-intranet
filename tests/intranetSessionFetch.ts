import type { Session } from 'electron'
import { vi } from 'vitest'

vi.mock('electron', () => ({ net: { fetch: vi.fn() } }))

// Electron keeps policy in the main process. Retain that module instance, then
// load renderer modules in a fresh cache so their local allowlist stays empty.
const mainPolicy = await import('../packages/shared/config/intranet')
const { installSessionIntranetNetworkGuard } = await import('../src/main/network/intranetNetworkGuard')
vi.resetModules()

export const setMainNetworkAllowlistRules = mainPolicy.setNetworkAllowlistRules

/** A browser transport double that invokes the real Electron session guard. */
export function createSessionFetch(transport: typeof fetch): typeof fetch {
  const onBeforeRequest = vi.fn()
  installSessionIntranetNetworkGuard({ webRequest: { onBeforeRequest } } as unknown as Session)
  const listener = onBeforeRequest.mock.calls[0]?.[1]

  return async (input, init) => {
    if (listener) {
      const callback = vi.fn()
      listener({ url: input instanceof Request ? input.url : String(input) }, callback)
      if (callback.mock.calls[0][0].cancel) throw new Error('Blocked by Electron session network guard')
    }
    return transport(input, init)
  }
}
