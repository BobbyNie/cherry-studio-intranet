const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const StreamZip = require('node-stream-zip')

/**
 * @param {string} platformKey e.g. darwin-arm64
 * @returns {string} resources/binaries/<platformKey>
 */
function getBundledBinaryDir(platformKey) {
  return path.join(__dirname, '..', 'binaries', platformKey)
}

/**
 * @param {string} platformKey
 * @param {string[]} names Candidate filenames (e.g. uv, uv.exe)
 * @returns {string | null}
 */
function findBundledBinary(platformKey, names) {
  const dir = getBundledBinaryDir(platformKey)
  if (!fs.existsSync(dir)) {
    return null
  }
  for (const name of names) {
    const candidate = path.join(dir, name)
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

/**
 * @param {string} platformKey
 * @param {string} archiveName Archive file in bundled dir
 * @returns {string | null}
 */
function findBundledArchive(platformKey, archiveName) {
  const candidate = path.join(getBundledBinaryDir(platformKey), archiveName)
  return fs.existsSync(candidate) ? candidate : null
}

/**
 * Copy a bundled executable into ~/.cherrystudio/bin
 * @returns {boolean} true if installed from bundle
 */
function installExecutableFromBundle(platformKey, names) {
  const source = findBundledBinary(platformKey, names)
  if (!source) {
    return false
  }

  const binDir = path.join(os.homedir(), '.cherrystudio', 'bin')
  fs.mkdirSync(binDir, { recursive: true })
  const filename = path.basename(source)
  const dest = path.join(binDir, filename)
  fs.copyFileSync(source, dest)
  if (process.platform !== 'win32') {
    fs.chmodSync(dest, 0o755)
  }
  console.log(`Installed ${filename} from bundled resources (${platformKey})`)
  return true
}

/**
 * Extract a bundled archive from resources/binaries into ~/.cherrystudio/bin
 * @returns {Promise<boolean>}
 */
async function installFromBundledArchive(platformKey, archiveName, platform) {
  const archivePath = findBundledArchive(platformKey, archiveName)
  if (!archivePath) {
    return false
  }

  const binDir = path.join(os.homedir(), '.cherrystudio', 'bin')
  fs.mkdirSync(binDir, { recursive: true })
  const isTarGz = archiveName.endsWith('.tar.gz')

  if (isTarGz) {
    const tempExtractDir = path.join(os.tmpdir(), `bundle-extract-${Date.now()}`)
    fs.mkdirSync(tempExtractDir, { recursive: true })
    execSync(`tar -xzf "${archivePath}" -C "${tempExtractDir}"`, { stdio: 'inherit' })

    const findAndMoveFiles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'lib') {
            const destLibDir = path.join(binDir, 'lib')
            fs.mkdirSync(destLibDir, { recursive: true })
            for (const libFile of fs.readdirSync(fullPath)) {
              fs.copyFileSync(path.join(fullPath, libFile), path.join(destLibDir, libFile))
            }
          } else {
            findAndMoveFiles(fullPath)
          }
        } else {
          const outputPath = path.join(binDir, path.basename(entry.name))
          fs.copyFileSync(fullPath, outputPath)
          if (platform !== 'win32') {
            fs.chmodSync(outputPath, 0o755)
          }
        }
      }
    }

    findAndMoveFiles(tempExtractDir)
    fs.rmSync(tempExtractDir, { recursive: true })
  } else {
    const zip = new StreamZip.async({ file: archivePath })
    const entries = await zip.entries()
    for (const entry of Object.values(entries)) {
      if (!entry.isDirectory) {
        const outputPath = path.join(binDir, path.basename(entry.name))
        await zip.extract(entry.name, outputPath)
        if (platform !== 'win32') {
          fs.chmodSync(outputPath, 0o755)
        }
      }
    }
    await zip.close()
  }

  console.log(`Installed from bundled archive ${archiveName} (${platformKey})`)
  return true
}

module.exports = {
  getBundledBinaryDir,
  findBundledBinary,
  findBundledArchive,
  installExecutableFromBundle,
  installFromBundledArchive
}
