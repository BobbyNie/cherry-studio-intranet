import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('resource-localized intranet templates', () => {
  const root = resolve(__dirname, '../..')
  const scopedFiles = [
    'resources/cherry-studio/license.html',
    'resources/cherry-studio/privacy-en.html',
    'resources/cherry-studio/privacy-zh.html',
    'resources/cherry-studio/releases.html',
    'resources/skills/skill-creator/assets/eval_review.html',
    'resources/skills/skill-creator/eval-viewer/viewer.html',
    'resources/skills/skill-creator/scripts/generate_report.py',
    'src/renderer/src/workers/pyodide.worker.ts'
  ]

  it('does not load boot-time JavaScript, CSS, or fonts from public CDNs', () => {
    const remoteAssetPatterns = [
      /<script\b[^>]*\bsrc=["']https?:\/\//i,
      /<link\b[^>]*\bhref=["']https?:\/\/[^"']*(?:\.css|fonts\.googleapis\.com|fonts\.gstatic\.com)/i,
      /<link\b[^>]*\brel=["']preconnect["'][^>]*\bhref=["']https?:\/\//i,
      /https:\/\/cdn\.jsdelivr\.net\/pyodide\//i
    ]

    for (const relativePath of scopedFiles) {
      const content = readFileSync(resolve(root, relativePath), 'utf8')

      for (const pattern of remoteAssetPatterns) {
        expect(content, `${relativePath} matched ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it('vendors the skill eval viewer SheetJS runtime locally', () => {
    const viewer = readFileSync(resolve(root, 'resources/skills/skill-creator/eval-viewer/viewer.html'), 'utf8')
    const vendoredXlsxPath = resolve(root, 'resources/skills/skill-creator/eval-viewer/assets/xlsx.full.min.js')

    expect(viewer).toContain('assets/xlsx.full.min.js')
    expect(viewer).not.toContain('cdn.sheetjs.com')
    expect(existsSync(vendoredXlsxPath)).toBe(true)
  })

  it('expects the renderer Pyodide runtime to be packaged locally', () => {
    const worker = readFileSync(resolve(root, 'src/renderer/src/workers/pyodide.worker.ts'), 'utf8')
    const pyodideModulePath = resolve(root, 'src/renderer/public/pyodide/v0.28.0/full/pyodide.mjs')

    expect(worker).toContain("const PYODIDE_VERSION = 'v0.28.0'")
    expect(worker).toContain('PYODIDE_INDEX_URL')
    expect(existsSync(pyodideModulePath)).toBe(true)
  })
})
