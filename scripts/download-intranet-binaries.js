/**
 * Build-time download of uv / bun / openclaw / ovms archives into resources/binaries/.
 * Mirrors scripts/download-rtk-binaries.js and is invoked from scripts/before-pack.js
 * when CHERRY_INTRANET_MODE is enabled (intranet release / package:*:intranet).
 *
 * Runtime install scripts (resources/scripts/install-*.js) read the same archive
 * filenames from resources/binaries/<platform>-<arch>/ via local-binary.js.
 *
 * Usage:
 *   node scripts/download-intranet-binaries.js <platform> <arch>
 *   e.g. node scripts/download-intranet-binaries.js darwin arm64
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const UV_VERSION = '0.9.5'
const BUN_VERSION = '1.3.1'
const OPENCLAW_VERSION = 'v2026.3.13'

const UV_PACKAGES = {
  'darwin-arm64': 'uv-aarch64-apple-darwin.tar.gz',
  'darwin-x64': 'uv-x86_64-apple-darwin.tar.gz',
  'win32-arm64': 'uv-aarch64-pc-windows-msvc.zip',
  'win32-x64': 'uv-x86_64-pc-windows-msvc.zip',
  'linux-arm64': 'uv-aarch64-unknown-linux-gnu.tar.gz',
  'linux-x64': 'uv-x86_64-unknown-linux-gnu.tar.gz'
}

const BUN_PACKAGES = {
  'darwin-arm64': 'bun-darwin-aarch64.zip',
  'darwin-x64': 'bun-darwin-x64.zip',
  'win32-arm64': 'bun-windows-x64-baseline.zip',
  'win32-x64': 'bun-windows-x64-baseline.zip',
  'linux-arm64': 'bun-linux-aarch64.zip',
  'linux-x64': 'bun-linux-x64.zip'
}

const OPENCLAW_PACKAGES = {
  'darwin-arm64': 'openclaw-darwin-arm64.tar.gz',
  'darwin-x64': 'openclaw-darwin-x64.tar.gz',
  'win32-arm64': 'openclaw-windows-arm64.zip',
  'win32-x64': 'openclaw-windows-x64.zip',
  'linux-arm64': 'openclaw-linux-arm64.tar.gz',
  'linux-x64': 'openclaw-linux-x64.tar.gz'
}

const OVMS_BASE_ARCHIVE = 'ovms_windows_python_on.zip'
const OVMS_EXTRA_ARCHIVE = 'ovms_25.4_ex.zip'
const OVMS_BASE_URL =
  'https://storage.openvinotoolkit.org/repositories/openvino_model_server/packages/2025.4.1/ovms_windows_python_on.zip'
const OVMS_EXTRA_URL = 'https://gitcode.com/gcw_ggDjjkY3/kjfile/releases/download/download/ovms_25.4_ex.zip'

function isIntranetBuildEnabled() {
  const value = process.env.CHERRY_INTRANET_MODE ?? process.env.CHERRY_OFFLINE_MODE
  return typeof value === 'string' && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function downloadFile(url, destPath) {
  console.log(`Downloading: ${url}`)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  execFileSync('curl', ['-fSL', '--retry', '3', '-o', destPath, url], { stdio: 'inherit' })
  if (!fs.existsSync(destPath)) {
    throw new Error(`Download failed: ${destPath} not found`)
  }
}

function downloadNamedArchive(url, outputDir, filename) {
  const destPath = path.join(outputDir, filename)
  if (fs.existsSync(destPath)) {
    console.log(`[intranet-binaries] Already present: ${filename}`)
    return
  }
  downloadFile(url, destPath)
  console.log(`[intranet-binaries] Saved ${filename}`)
}

function downloadUv(platformKey, outputDir) {
  const packageName = UV_PACKAGES[platformKey]
  if (!packageName) {
    console.log(`[intranet-binaries] No uv package for ${platformKey}, skipping`)
    return
  }
  const url = `https://gitcode.com/CherryHQ/uv/releases/download/${UV_VERSION}/${packageName}`
  downloadNamedArchive(url, outputDir, packageName)
}

function downloadBun(platformKey, outputDir) {
  const packageName = BUN_PACKAGES[platformKey]
  if (!packageName) {
    console.log(`[intranet-binaries] No bun package for ${platformKey}, skipping`)
    return
  }
  const url = `https://gitcode.com/CherryHQ/bun/releases/download/bun-v${BUN_VERSION}/${packageName}`
  downloadNamedArchive(url, outputDir, packageName)
}

function downloadOpenClaw(platformKey, outputDir) {
  const packageName = OPENCLAW_PACKAGES[platformKey]
  if (!packageName) {
    console.log(`[intranet-binaries] No openclaw package for ${platformKey}, skipping`)
    return
  }
  const url = `https://gitcode.com/CherryHQ/openclaw-releases/releases/download/${OPENCLAW_VERSION}/${packageName}`
  downloadNamedArchive(url, outputDir, packageName)
}

function downloadOvms(outputDir) {
  downloadNamedArchive(OVMS_BASE_URL, outputDir, OVMS_BASE_ARCHIVE)
  downloadNamedArchive(OVMS_EXTRA_URL, outputDir, OVMS_EXTRA_ARCHIVE)
}

function main() {
  if (!isIntranetBuildEnabled()) {
    console.log('[intranet-binaries] CHERRY_INTRANET_MODE not set, skipping tool binary bundle')
    return
  }

  const platform = process.argv[2] || process.platform
  const arch = process.argv[3] || process.arch
  const platformKey = `${platform}-${arch}`

  console.log(`[intranet-binaries] Bundling uv/bun/openclaw/ovms for ${platformKey}...`)

  const outputDir = path.join(__dirname, '..', 'resources', 'binaries', platformKey)
  fs.mkdirSync(outputDir, { recursive: true })

  downloadUv(platformKey, outputDir)
  downloadBun(platformKey, outputDir)
  downloadOpenClaw(platformKey, outputDir)

  if (platformKey === 'win32-x64') {
    downloadOvms(outputDir)
  }

  console.log(`[intranet-binaries] Finished bundling into ${outputDir}`)
}

try {
  main()
} catch (error) {
  console.error('[intranet-binaries] Failed to download tool binaries:', error.message)
  process.exit(1)
}
