/**
 * Copies Pyodide runtime assets from node_modules into the renderer public folder
 * so the web worker can load them without a CDN.
 */
const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '..', 'node_modules', 'pyodide')
const targetDir = path.join(__dirname, '..', 'src', 'renderer', 'public', 'pyodide')

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.warn('[copy-pyodide] pyodide package not installed; run pnpm install first')
    process.exit(0)
  }

  fs.rmSync(targetDir, { recursive: true, force: true })
  copyRecursive(sourceDir, targetDir)
  console.log(`[copy-pyodide] Copied Pyodide assets to ${targetDir}`)
}

main()
