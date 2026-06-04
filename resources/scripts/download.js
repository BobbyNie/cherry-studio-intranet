const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const net = require('net')

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const NETWORK_BLOCKED_MESSAGE = 'Network target is not in CHERRY_NETWORK_ALLOWLIST'

function isFlagEnabled(name) {
  const value = process.env[name]
  return typeof value === 'string' && TRUE_VALUES.has(value.toLowerCase())
}

function isPublicNetworkDisabled() {
  return (
    isFlagEnabled('CHERRY_INTRANET_MODE') ||
    isFlagEnabled('CHERRY_OFFLINE_MODE') ||
    isFlagEnabled('CHERRY_DISABLE_PUBLIC_NETWORK')
  )
}

function normalizeHostname(hostname) {
  return hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
}

function parseNetworkAllowlist() {
  return (process.env.CHERRY_NETWORK_ALLOWLIST || '')
    .split(/[,\n]/)
    .map((rule) => normalizeAllowlistRule(rule))
    .filter(Boolean)
    .filter((rule, index, rules) => rules.indexOf(rule) === index)
}

function normalizeAllowlistRule(rawRule) {
  const trimmed = String(rawRule || '').trim()
  if (!trimmed) {
    return ''
  }

  let hostname = trimmed
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    hostname = new URL(trimmed).hostname
  }

  hostname = normalizeHostname(hostname)
  if (hostname.includes('/') || /\s/.test(hostname)) {
    throw new Error(`Invalid network allowlist rule: ${rawRule}`)
  }

  if (net.isIP(hostname)) {
    return hostname
  }

  if (hostname.startsWith('*.')) {
    const baseDomain = hostname.slice(2)
    if (!isHostname(baseDomain)) {
      throw new Error(`Invalid network allowlist rule: ${rawRule}`)
    }
    return `*.${baseDomain}`
  }

  if (hostname.includes(':') || !isHostname(hostname)) {
    throw new Error(`Invalid network allowlist rule: ${rawRule}`)
  }

  return hostname
}

function isHostname(hostname) {
  return (
    hostname.length <= 253 &&
    !hostname.includes('..') &&
    hostname.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))
  )
}

function hostnameMatchesRule(hostname, rule) {
  if (rule.startsWith('*.')) {
    const baseDomain = rule.slice(2)
    return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)
  }

  return hostname === rule
}

function assertNetworkAllowed(url) {
  if (!isPublicNetworkDisabled()) {
    return
  }

  const parsed = new URL(url)
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(NETWORK_BLOCKED_MESSAGE)
  }

  const rules = parseNetworkAllowlist()
  if (rules.length === 0) {
    throw new Error(NETWORK_BLOCKED_MESSAGE)
  }

  const hostname = normalizeHostname(parsed.hostname)
  if (!rules.some((rule) => hostnameMatchesRule(hostname, rule))) {
    throw new Error(NETWORK_BLOCKED_MESSAGE)
  }
}

/**
 * Downloads a file from a URL with redirect handling
 * @param {string} url The URL to download from
 * @param {string} destinationPath The path to save the file to
 * @returns {Promise<void>} Promise that resolves when download is complete
 */
async function downloadWithRedirects(url, destinationPath) {
  return new Promise((resolve, reject) => {
    const request = (url) => {
      try {
        assertNetworkAllowed(url)
      } catch (error) {
        reject(error)
        return
      }

      https
        .get(url, (response) => {
          if (response.statusCode == 301 || response.statusCode == 302) {
            if (!response.headers.location) {
              reject(new Error('Download redirect missing location header'))
              return
            }
            request(new URL(response.headers.location, url).toString())
            return
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`))
            return
          }
          const file = fs.createWriteStream(destinationPath)
          response.pipe(file)
          file.on('finish', () => resolve())
        })
        .on('error', (err) => {
          reject(err)
        })
    }
    request(url)
  })
}

/**
 * Downloads a file using PowerShell Invoke-WebRequest command
 * @param {string} url The URL to download from
 * @param {string} destinationPath The path to save the file to
 * @returns {Promise<boolean>} Promise that resolves to true if download succeeds
 */
async function downloadWithPowerShell(url, destinationPath) {
  return new Promise((resolve, reject) => {
    try {
      // Only support windows platform for PowerShell download
      if (process.platform !== 'win32') {
        return reject(new Error('PowerShell download is only supported on Windows'))
      }

      const outputDir = path.dirname(destinationPath)
      fs.mkdirSync(outputDir, { recursive: true })
      assertNetworkAllowed(url)

      // PowerShell command to download the file with progress disabled for faster download
      const psCommand = `powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest '${url}' -OutFile '${destinationPath}'"`

      console.log(`Downloading with PowerShell: ${url}`)
      execSync(psCommand, { stdio: 'inherit' })

      if (fs.existsSync(destinationPath)) {
        console.log(`Download completed: ${destinationPath}`)
        resolve(true)
      } else {
        reject(new Error('Download failed: File not found after download'))
      }
    } catch (error) {
      reject(new Error(`PowerShell download failed: ${error.message}`))
    }
  })
}

module.exports = { assertNetworkAllowed, downloadWithRedirects, downloadWithPowerShell }
