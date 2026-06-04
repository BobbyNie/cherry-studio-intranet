import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

describe('download-intranet-binaries build script', () => {
  const root = resolve(__dirname, '../..')
  const scriptPath = resolve(root, 'scripts/download-intranet-binaries.js')
  const beforePackPath = resolve(root, 'scripts/before-pack.js')

  it('exists and documents alignment with install scripts', () => {
    expect(existsSync(scriptPath)).toBe(true)
    const source = readFileSync(scriptPath, 'utf8')
    expect(source).toContain('resources/binaries')
    expect(source).toContain('uv-aarch64-apple-darwin.tar.gz')
    expect(source).toContain('bun-darwin-aarch64.zip')
    expect(source).toContain('openclaw-darwin-arm64.tar.gz')
    expect(source).toContain('ovms_windows_python_on.zip')
    expect(source).toContain('CHERRY_INTRANET_MODE')
  })

  it('is invoked from before-pack with intranet failure semantics', () => {
    const source = readFileSync(beforePackPath, 'utf8')
    expect(source).toContain('download-intranet-binaries.js')
    expect(source).toContain('Intranet tool binary bundle failed')
  })
})
