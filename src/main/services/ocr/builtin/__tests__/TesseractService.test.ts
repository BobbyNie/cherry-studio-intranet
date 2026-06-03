import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('TesseractService network guards', () => {
  const originalEnv = { ...process.env }
  const createWorkerMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.CHERRY_TESSERACT_LANG_PATH
    delete process.env.TESSERACT_LANG_PATH
    process.env.CHERRY_DISABLE_PUBLIC_NETWORK = 'true'
    createWorkerMock.mockReset()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  async function loadService() {
    vi.doMock('fs', async () => {
      const actual = (await vi.importActual('fs')) as any
      const access = vi.fn(async () => undefined)
      const mkdir = vi.fn(async () => undefined)
      return {
        ...actual,
        default: {
          ...actual,
          promises: {
            ...actual.promises,
            access,
            mkdir
          }
        },
        promises: {
          ...actual.promises,
          access,
          mkdir
        }
      }
    })
    vi.doMock('electron', () => ({
      app: {
        getPath: vi.fn(() => '/tmp/cherry-tesseract-test')
      }
    }))
    vi.doMock('@main/utils/ipService', () => ({
      isPublicNetworkDisabled: vi.fn(() => true),
      getIpCountry: vi.fn()
    }))
    vi.doMock('tesseract.js', () => ({
      createWorker: createWorkerMock
    }))

    return import('../TesseractService')
  }

  it('rejects when no intranet tessdata mirror is configured', async () => {
    const { tesseractService } = await loadService()

    await expect(tesseractService.getWorker()).rejects.toThrow(
      'Tesseract language data is not configured for intranet mode'
    )
    expect(createWorkerMock).not.toHaveBeenCalled()
  })

  it('uses the configured intranet tessdata mirror', async () => {
    process.env.CHERRY_TESSERACT_LANG_PATH = 'http://tessdata.internal/'

    createWorkerMock.mockResolvedValue({
      terminate: vi.fn()
    })

    const { tesseractService } = await loadService()
    const worker = await tesseractService.getWorker()

    expect(worker).toBeDefined()
    expect(createWorkerMock).toHaveBeenCalledWith(
      expect.arrayContaining(['chi_sim', 'chi_tra', 'eng']),
      undefined,
      expect.objectContaining({
        langPath: 'http://tessdata.internal/',
        cachePath: expect.stringContaining('/tmp/cherry-tesseract-test')
      })
    )
  })
})
