import { readFileSync } from 'fs'
import { resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'

describe('installer network policy', () => {
  const root = resolve(__dirname, '../..')
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('uses the same hostname allowlist semantics before installer downloads', () => {
    const { assertNetworkAllowed } = require(resolve(root, 'resources/scripts/download.js'))
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_NETWORK_ALLOWLIST = 'comp.com\n*.internal.comp.com\n10.1.2.3'

    expect(() => assertNetworkAllowed('https://comp.com/download.zip')).not.toThrow()
    expect(() => assertNetworkAllowed('https://build.internal.comp.com/download.zip')).not.toThrow()
    expect(() => assertNetworkAllowed('https://10.1.2.3:8443/download.zip')).not.toThrow()
    expect(() => assertNetworkAllowed('https://evilcomp.com/download.zip')).toThrow()
    expect(() => assertNetworkAllowed('https://comp.com.evil.com/download.zip')).toThrow()
  })

  it('blocks installer downloads when the intranet allowlist is empty', () => {
    const { assertNetworkAllowed } = require(resolve(root, 'resources/scripts/download.js'))
    process.env.CHERRY_INTRANET_MODE = 'true'
    process.env.CHERRY_NETWORK_ALLOWLIST = ''

    expect(() => assertNetworkAllowed('https://github.com/CherryHQ/openclaw/releases/latest')).toThrow()
  })

  it.each(['install-uv.js', 'install-bun.js', 'install-openclaw.js', 'install-ovms.js'])(
    '%s tries resources/binaries packages before remote downloads',
    (scriptName) => {
      const script = readFileSync(resolve(root, 'resources/scripts', scriptName), 'utf8')

      expect(script).toContain("require('./local-binary')")
      expect(script).toContain('copyLocalBinaryPackage(')
    }
  )
})
