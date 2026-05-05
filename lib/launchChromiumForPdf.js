import { existsSync } from 'node:fs'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

function isServerlessPdfEnv() {
  return Boolean(
    process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_VERSION,
  )
}

const DEFAULT_VIEWPORT = {
  deviceScaleFactor: 1,
  hasTouch: false,
  height: 1080,
  isLandscape: true,
  isMobile: false,
  width: 1920,
}

function findLocalChromeExecutable() {
  const envPath =
    process.env.CHROMIUM_PATH || process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH
  if (envPath) return envPath

  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'linux'
        ? [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
          ]
        : process.platform === 'win32'
          ? [
              'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
              'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            ]
          : []

  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return undefined
}

/**
 * Launches Chromium for HTML → PDF via puppeteer-core.
 * On Vercel/AWS Lambda, uses @sparticuz/chromium. Locally, uses system Chrome/Chromium or CHROMIUM_PATH.
 */
export async function launchChromiumForPdf() {
  if (isServerlessPdfEnv()) {
    chromium.setGraphicsMode = false
    return puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
      defaultViewport: DEFAULT_VIEWPORT,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    })
  }

  const executablePath = findLocalChromeExecutable()
  if (!executablePath) {
    throw new Error(
      'Chrome or Chromium not found for local PDF generation. Install Google Chrome or set CHROMIUM_PATH.',
    )
  }

  return puppeteer.launch({
    headless: true,
    defaultViewport: DEFAULT_VIEWPORT,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}
