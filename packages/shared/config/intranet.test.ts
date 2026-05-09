import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertNetworkAllowed,
  getAllowedHosts,
  isAutoUpdateDisabled,
  isIntranetMode,
  sanitizeExternalUrl
} from './intranet'

describe('intranet config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    process.env.CHERRY_DISABLE_AUTO_UPDATE = 'true'
    process.env.CHERRY_DISABLE_EXTERNAL_LINKS = 'true'
    delete process.env.CHERRY_NETWORK_ALLOWLIST
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('detects intranet mode and disabled update flags', () => {
    expect(isIntranetMode()).toBe(true)
    expect(isAutoUpdateDisabled()).toBe(true)
  })

  it('allows localhost and RFC1918 private network targets by default', () => {
    expect(() => assertNetworkAllowed('http://localhost:11434/api/tags')).not.toThrow()
    expect(() => assertNetworkAllowed('http://127.0.0.1:8000/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://10.10.8.20:8000/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://172.16.1.20:8000/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://172.31.255.255:8000/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://192.168.10.9:8000/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://[::1]:11434/api/tags')).not.toThrow()
  })

  it('blocks public model APIs with a clear enterprise intranet message', () => {
    expect(() => assertNetworkAllowed('https://api.openai.com/v1/chat/completions')).toThrow(
      '内网版已阻止公网访问：api.openai.com。请改用内网模型 API 或在管理员设置中加入白名单。'
    )
  })

  it('allows administrator configured hosts and ports', () => {
    process.env.CHERRY_NETWORK_ALLOWLIST = 'llm-gateway.intranet.local,npm-registry.intranet.local:4873'

    expect(getAllowedHosts()).toEqual(
      expect.arrayContaining(['llm-gateway.intranet.local', 'npm-registry.intranet.local:4873'])
    )
    expect(() => assertNetworkAllowed('http://llm-gateway.intranet.local/v1/models')).not.toThrow()
    expect(() => assertNetworkAllowed('http://npm-registry.intranet.local:4873/@scope/pkg')).not.toThrow()
  })

  it('sanitizes external links when external links are disabled', () => {
    expect(sanitizeExternalUrl('https://github.com/CherryHQ/cherry-studio')).toBeNull()
    expect(sanitizeExternalUrl('mailto:support@cherry-ai.com')).toBeNull()
  })
})
