import type { ImageModelV3CallOptions } from '@ai-sdk/provider'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createSessionFetch,
  setMainNetworkAllowlistRules as setNetworkAllowlistRules
} from '../../../../../../../tests/intranetSessionFetch'

const { createDashScope } = await import('../dashscope-provider')

describe('DashScope image provider', () => {
  it('rejects a successful response without image results', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    await expect(
      createDashScope({ apiKey: 'test', fetch: createSessionFetch(fetch) })
        .imageModel('qwen-image-3.0')
        .doGenerate({
          prompt: 'cat',
          n: 1,
          size: undefined,
          aspectRatio: undefined,
          seed: undefined,
          files: undefined,
          mask: undefined,
          providerOptions: {}
        })
    ).rejects.toThrow('no images')
  })

  it('rejects unapproved generation endpoints before sending the API key', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    setNetworkAllowlistRules([])
    const fetch = vi.fn()
    await expect(
      createDashScope({ apiKey: 'test', fetch: createSessionFetch(fetch) })
        .imageModel('qwen-image-3.0')
        .doGenerate({
          prompt: 'cat',
          n: 1,
          size: undefined,
          aspectRatio: undefined,
          seed: undefined,
          files: undefined,
          mask: undefined,
          providerOptions: {}
        })
    ).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('propagates generation HTTP failures without downloading images', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(
      createDashScope({ apiKey: 'test', fetch: createSessionFetch(fetch) })
        .imageModel('qwen-image-3.0')
        .doGenerate({
          prompt: 'cat',
          n: 1,
          size: undefined,
          aspectRatio: undefined,
          seed: undefined,
          files: undefined,
          mask: undefined,
          providerOptions: {}
        })
    ).rejects.toThrow('503')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('preserves the compatible endpoint for other image models', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          created: 1,
          data: [{ b64_json: 'AQID' }]
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    )
    await createDashScope({
      apiKey: 'test',
      baseURL: 'https://gateway.corp.example/compatible-mode/v1',
      fetch: createSessionFetch(fetch)
    })
      .imageModel('custom-image-model')
      .doGenerate({
        prompt: 'cat',
        n: 1,
        size: undefined,
        aspectRatio: undefined,
        seed: undefined,
        files: undefined,
        mask: undefined,
        providerOptions: {}
      })
    expect(fetch.mock.calls[0][0]).toBe('https://gateway.corp.example/compatible-mode/v1/images/generations')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    setNetworkAllowlistRules([])
  })

  it('uses the main-process session guard for returned image hosts', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    setNetworkAllowlistRules(['gateway.corp.example'])
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: { choices: [{ message: { content: [{ image: 'https://unapproved.example/image.png' }] } }] }
        })
      )
    )
    const model = createDashScope({
      apiKey: 'test',
      baseURL: 'https://gateway.corp.example/tenant/compatible-mode/v1',
      fetch: createSessionFetch(fetch)
    }).imageModel('qwen-image-3.0')

    await expect(
      model.doGenerate({
        prompt: 'cat',
        n: 1,
        size: undefined,
        aspectRatio: undefined,
        seed: undefined,
        files: undefined,
        mask: undefined,
        providerOptions: {}
      })
    ).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uses the native Qwen Image 3 endpoint and request contract', async () => {
    vi.stubEnv('CHERRY_INTRANET_MODE', 'true')
    setNetworkAllowlistRules(['proxy.example.com', 'cdn.example.com'])
    const fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init
      if (String(input) === 'https://cdn.example.com/result.png') {
        return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
      }
      return new Response(
        JSON.stringify({
          output: { choices: [{ message: { content: [{ image: 'https://cdn.example.com/result.png' }] } }] },
          request_id: 'request-1'
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    })
    const model = createDashScope({
      apiKey: 'dashscope-key',
      baseURL: 'https://proxy.example.com/tenant/compatible-mode/v1',
      fetch: createSessionFetch(fetch)
    }).imageModel('qwen-image-3.0')

    const result = await model.doGenerate({
      prompt: 'draw a cat',
      n: 2,
      size: '1024x1024',
      aspectRatio: undefined,
      seed: 7,
      files: [{ type: 'file', mediaType: 'image/png', data: 'aGVsbG8=' }],
      mask: undefined,
      providerOptions: { dashscope: { negativePrompt: 'blur', promptExtend: false } }
    } satisfies ImageModelV3CallOptions)

    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, init] = fetch.mock.calls[0]
    expect(String(url)).toBe('https://proxy.example.com/tenant/api/v1/services/aigc/multimodal-generation/generation')
    expect(new Headers(fetch.mock.calls[1][1]?.headers).has('authorization')).toBe(false)
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer dashscope-key')
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'qwen-image-3.0',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: 'draw a cat' }, { image: 'data:image/png;base64,aGVsbG8=' }]
          }
        ]
      },
      parameters: {
        size: '1024*1024',
        n: 2,
        seed: 7,
        negative_prompt: 'blur',
        prompt_extend: false
      }
    })
    expect(result.images).toEqual([new Uint8Array([1, 2, 3])])
  })
})
