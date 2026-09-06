import { net } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CopilotService from '../CopilotService'

function jsonResponse(body: unknown): Awaited<ReturnType<typeof net.fetch>> {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Awaited<ReturnType<typeof net.fetch>>
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  return Object.fromEntries(new Headers(headers).entries())
}

describe('CopilotService headers', () => {
  beforeEach(() => {
    vi.mocked(net.fetch).mockReset()
  })

  it('preserves required headers when custom Copilot headers are provided', async () => {
    vi.mocked(net.fetch).mockResolvedValueOnce(
      jsonResponse({
        device_code: 'device-code',
        user_code: 'user-code',
        verification_uri: 'https://github.com/login/device'
      })
    )

    await CopilotService.getAuthMessage({} as Electron.IpcMainInvokeEvent, { authorization: 'Bearer custom' })

    expect(net.fetch).toHaveBeenCalledWith(
      'https://github.com/login/device/code',
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: 'Bearer custom'
        })
      })
    )
  })

  it('does not retain custom headers across requests', async () => {
    const authResponse = {
      device_code: 'device-code',
      user_code: 'user-code',
      verification_uri: 'https://github.com/login/device'
    }
    vi.mocked(net.fetch)
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(authResponse))

    await CopilotService.getAuthMessage({} as Electron.IpcMainInvokeEvent, { authorization: 'Bearer sensitive' })
    await CopilotService.getAuthMessage({} as Electron.IpcMainInvokeEvent)

    const secondRequest = vi.mocked(net.fetch).mock.calls[1][1]
    expect(secondRequest?.headers).not.toEqual(expect.objectContaining({ authorization: 'Bearer sensitive' }))
  })

  it('does not allow custom headers to override the required response format', async () => {
    vi.mocked(net.fetch).mockResolvedValueOnce(
      jsonResponse({
        device_code: 'device-code',
        user_code: 'user-code',
        verification_uri: 'https://github.com/login/device'
      })
    )

    await CopilotService.getAuthMessage({} as Electron.IpcMainInvokeEvent, {
      Accept: 'text/html',
      'content-type': 'text/plain'
    })

    const request = vi.mocked(net.fetch).mock.calls[0][1]
    expect(normalizeHeaders(request?.headers)).toEqual(
      expect.objectContaining({ accept: 'application/json', 'content-type': 'application/json' })
    )
  })
})
