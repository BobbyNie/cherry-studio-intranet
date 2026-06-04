import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import https from 'node:https'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'

import { afterEach, describe, expect, it, vi } from 'vitest'

const requireForTest = createRequire(import.meta.url)
const root = path.resolve(__dirname, '../..')
const requireCache = requireForTest.cache as Record<string, any>

function loadDownloadModule(assertNetworkAllowed: (url: string) => void) {
  const modulePath = requireForTest.resolve(path.join(root, 'resources/scripts/download.js'))
  const guardPath = requireForTest.resolve(path.join(root, 'resources/scripts/network-guard.js'))
  const originalGuard = requireCache[guardPath]

  delete requireCache[modulePath]
  requireCache[guardPath] = {
    id: guardPath,
    filename: guardPath,
    loaded: true,
    exports: { assertNetworkAllowed }
  }

  const moduleExports = requireForTest(modulePath)

  return {
    moduleExports,
    restore: () => {
      delete requireCache[modulePath]
      if (originalGuard) {
        requireCache[guardPath] = originalGuard
      } else {
        delete requireCache[guardPath]
      }
    }
  }
}

function loadOpenClawModule(dependencies: {
  assertNetworkAllowed?: (url: string) => void
  downloadWithRedirects?: (url: string, destinationPath: string) => Promise<void>
  installFromBundledArchive?: (platformKey: string, archiveName: string, platform: string) => Promise<boolean>
}) {
  const filename = path.join(root, 'resources/scripts/install-openclaw.js')
  const source = fs.readFileSync(filename, 'utf8')
  const testableSource = source.includes('// Run the installation')
    ? source.replace(
        /\/\/ Run the installation[\s\S]*$/,
        'module.exports = { installOpenClaw, downloadWithFallback }\n'
      )
    : `${source}\nmodule.exports = { installOpenClaw, downloadWithFallback }\n`

  const module = { exports: {} }
  const sandbox = {
    Buffer,
    Date,
    Promise,
    URL,
    clearTimeout,
    console: {
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn()
    },
    module,
    process: { env: {} },
    require: (request: string) => {
      if (request === 'fs') return fs
      if (request === 'path') return path
      if (request === 'os') {
        return {
          arch: () => 'arm64',
          homedir: () => '/tmp/cherry-home',
          platform: () => 'darwin',
          tmpdir: () => '/tmp'
        }
      }
      if (request === 'https') return { get: vi.fn() }
      if (request === 'child_process') return { execSync: vi.fn() }
      if (request === 'node-stream-zip') return { async: class StreamZipMock {} }
      if (request === './download') {
        return {
          downloadWithRedirects: dependencies.downloadWithRedirects ?? vi.fn().mockResolvedValue(undefined)
        }
      }
      if (request === './network-guard') {
        return {
          assertNetworkAllowed: dependencies.assertNetworkAllowed ?? vi.fn()
        }
      }
      if (request === './local-binary') {
        return {
          installFromBundledArchive: dependencies.installFromBundledArchive ?? vi.fn().mockResolvedValue(false)
        }
      }
      return requireForTest(request)
    },
    setTimeout
  }

  vm.runInNewContext(testableSource, sandbox, { filename })
  return module.exports as {
    downloadWithFallback: (
      version: string,
      packageName: string,
      tempFilename: string,
      preferMirror?: boolean
    ) => Promise<void>
    installOpenClaw: () => Promise<number>
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resource installer network policy', () => {
  it('re-checks the network allowlist for redirected downloads', async () => {
    const assertedUrls: string[] = []
    const initialUrl = 'https://repo.intranet.local/openclaw.zip'
    const redirectedUrl = 'https://mirror.intranet.local/openclaw.zip'
    const outputStream = new EventEmitter()
    const { moduleExports, restore } = loadDownloadModule((url) => assertedUrls.push(url))

    vi.spyOn(fs, 'createWriteStream').mockReturnValue(outputStream as fs.WriteStream)
    vi.spyOn(https, 'get').mockImplementation(((url: string, callback: (response: any) => void) => {
      const request = new EventEmitter()
      const response = new EventEmitter() as any
      response.statusMessage = 'OK'

      if (url === initialUrl) {
        response.statusCode = 302
        response.headers = { location: redirectedUrl }
      } else {
        response.statusCode = 200
        response.headers = {}
        response.pipe = (file: EventEmitter) => {
          setImmediate(() => file.emit('finish'))
          return file
        }
      }

      setImmediate(() => callback(response))
      return request
    }) as typeof https.get)

    try {
      await moduleExports.downloadWithRedirects(initialUrl, '/tmp/openclaw.zip')
    } finally {
      restore()
    }

    expect(assertedUrls).toEqual([initialUrl, redirectedUrl])
  })

  it('rejects redirected downloads before a blocked redirect target is requested', async () => {
    const initialUrl = 'https://repo.intranet.local/openclaw.zip'
    const blockedRedirectUrl = 'https://github.com/CherryHQ/openclaw.zip'
    const { moduleExports, restore } = loadDownloadModule((url) => {
      if (url === blockedRedirectUrl) {
        throw new Error('blocked redirect target')
      }
    })

    const httpsGet = vi.spyOn(https, 'get').mockImplementation(((url: string, callback: (response: any) => void) => {
      const request = new EventEmitter()
      const response = new EventEmitter() as any
      response.statusCode = 302
      response.statusMessage = 'Found'
      response.headers = { location: blockedRedirectUrl }
      setImmediate(() => callback(response))
      return request
    }) as typeof https.get)

    try {
      await expect(moduleExports.downloadWithRedirects(initialUrl, '/tmp/openclaw.zip')).rejects.toThrow(
        'blocked redirect target'
      )
    } finally {
      restore()
    }

    expect(httpsGet).toHaveBeenCalledTimes(1)
    expect(httpsGet).toHaveBeenCalledWith(initialUrl, expect.any(Function))
  })

  it('installs OpenClaw from a bundled archive before checking GitHub latest', async () => {
    const assertNetworkAllowed = vi.fn(() => {
      throw new Error('network should not be needed for local OpenClaw install')
    })
    const installFromBundledArchive = vi.fn().mockResolvedValue(true)
    const { installOpenClaw } = loadOpenClawModule({ assertNetworkAllowed, installFromBundledArchive })

    await expect(installOpenClaw()).resolves.toBe(0)

    expect(installFromBundledArchive).toHaveBeenCalledWith('darwin-arm64', 'openclaw-darwin-arm64.tar.gz', 'darwin')
    expect(assertNetworkAllowed).not.toHaveBeenCalled()
  })

  it('checks allowlist before each OpenClaw fallback source download', async () => {
    const assertNetworkAllowed = vi.fn((url: string) => {
      if (url.includes('github.com')) {
        throw new Error('blocked public source')
      }
    })
    const downloadWithRedirects = vi.fn().mockResolvedValue(undefined)
    const { downloadWithFallback } = loadOpenClawModule({ assertNetworkAllowed, downloadWithRedirects })

    await downloadWithFallback('v2026.3.13', 'openclaw-darwin-arm64.tar.gz', '/tmp/openclaw.tar.gz')

    expect(assertNetworkAllowed).toHaveBeenCalledWith(
      'https://github.com/CherryHQ/openclaw/releases/download/v2026.3.13/openclaw-darwin-arm64.tar.gz'
    )
    expect(assertNetworkAllowed).toHaveBeenCalledWith(
      'https://gitcode.com/CherryHQ/openclaw-releases/releases/download/v2026.3.13/openclaw-darwin-arm64.tar.gz'
    )
    expect(downloadWithRedirects).toHaveBeenCalledTimes(1)
    expect(downloadWithRedirects).toHaveBeenCalledWith(
      'https://gitcode.com/CherryHQ/openclaw-releases/releases/download/v2026.3.13/openclaw-darwin-arm64.tar.gz',
      '/tmp/openclaw.tar.gz'
    )
  })
})
