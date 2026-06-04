const fs = require('fs')
const path = require('path')

function getLocalBinaryPackagePath(platformKey, packageName) {
  return path.join(__dirname, '..', 'binaries', platformKey, packageName)
}

function copyLocalBinaryPackage(platformKey, packageName, destinationPath) {
  const localPackagePath = getLocalBinaryPackagePath(platformKey, packageName)
  if (!fs.existsSync(localPackagePath)) {
    return false
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
  fs.copyFileSync(localPackagePath, destinationPath)
  console.log(`Using local binary package: ${localPackagePath}`)
  return true
}

module.exports = { copyLocalBinaryPackage, getLocalBinaryPackagePath }
