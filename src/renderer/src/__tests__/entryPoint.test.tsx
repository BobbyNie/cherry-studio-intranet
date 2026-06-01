import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderSpy = vi.fn()
const createRootSpy = vi.fn(() => ({ render: renderSpy }))
const installRendererIntranetNetworkGuardSpy = vi.fn()
const registerIconifyCollectionsSpy = vi.fn()

vi.mock('react-dom/client', () => ({
  createRoot: createRootSpy
}))

vi.mock('../App', () => ({
  default: () => null
}))

vi.mock('../network/intranetNetworkGuard', () => ({
  installRendererIntranetNetworkGuard: installRendererIntranetNetworkGuardSpy
}))

vi.mock('../components/Icons/registerIconifyCollections', () => ({
  registerIconifyCollections: registerIconifyCollectionsSpy
}))

describe('entryPoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('registers iconify collections before rendering the app', async () => {
    await import('../entryPoint')

    expect(installRendererIntranetNetworkGuardSpy).toHaveBeenCalledTimes(1)
    expect(registerIconifyCollectionsSpy).toHaveBeenCalledTimes(1)
    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById('root'))
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(registerIconifyCollectionsSpy.mock.invocationCallOrder[0]).toBeLessThan(
      renderSpy.mock.invocationCallOrder[0]
    )
  })
})
