import type { WebSearchProvider } from '@renderer/types'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@shared/config/intranet', async () => {
  const actual = await vi.importActual<typeof import('@shared/config/intranet')>('@shared/config/intranet')
  return {
    ...actual,
    isIntranetMode: () => true
  }
})

vi.mock('../BochaProvider', () => ({ default: class BochaProviderMock {} }))
vi.mock('../DefaultProvider', () => ({ default: class DefaultProviderMock {} }))
vi.mock('../ExaMcpProvider', () => ({ default: class ExaMcpProviderMock {} }))
vi.mock('../ExaProvider', () => ({ default: class ExaProviderMock {} }))
vi.mock('../LocalBaiduProvider', () => ({ default: class LocalBaiduProviderMock {} }))
vi.mock('../LocalBingProvider', () => ({ default: class LocalBingProviderMock {} }))
vi.mock('../LocalGoogleProvider', () => ({ default: class LocalGoogleProviderMock {} }))
vi.mock('../QueritProvider', () => ({ default: class QueritProviderMock {} }))
vi.mock('../SearxngProvider', () => ({ default: class SearxngProviderMock {} }))
vi.mock('../TavilyProvider', () => ({ default: class TavilyProviderMock {} }))
vi.mock('../ZhipuProvider', () => ({ default: class ZhipuProviderMock {} }))

import WebSearchProviderFactory from '../WebSearchProviderFactory'

describe('WebSearchProviderFactory intranet mode', () => {
  it('creates the requested provider instead of enforcing a feature-level intranet allowlist', () => {
    const provider: WebSearchProvider = {
      id: 'local-bing',
      name: 'Bing',
      url: 'https://cn.bing.com/search?q=%s&ensearch=1'
    }

    const created = WebSearchProviderFactory.create(provider)

    expect(created.constructor.name).toBe('LocalBingProviderMock')
  })
})
