import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const FORBIDDEN_PATTERNS = [
  /unpkg\.com/i,
  /cdn\.jsdelivr\.net/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /cdn\.tailwindcss\.com/i,
  /cdn\.sheetjs\.com/i
]

const SCAN_PATHS = [
  'resources/cherry-studio/releases.html',
  'resources/cherry-studio/license.html',
  'resources/skills/skill-creator/eval-viewer/viewer.html',
  'resources/skills/skill-creator/assets/eval_review.html',
  'resources/skills/skill-creator/scripts/generate_report.py',
  'src/renderer/src/workers/pyodide.worker.ts'
]

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('offline CDN domain guard', () => {
  for (const relativePath of SCAN_PATHS) {
    it(`does not reference forbidden CDN hosts in ${relativePath}`, () => {
      const content = readWorkspaceFile(relativePath)
      const hits = FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(content)).map((pattern) => pattern.source)

      expect(hits, `Forbidden CDN references in ${relativePath}: ${hits.join(', ')}`).toEqual([])
    })
  }
})
