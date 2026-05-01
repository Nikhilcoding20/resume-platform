/**
 * Builds public/favicon.png — 512×512, circular gradient + centered logo.
 * Run: node scripts/generate-favicon.mjs
 */
import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const circleSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#g)"/>
</svg>`

const bg = await sharp(Buffer.from(circleSvg)).png().toBuffer()

const logoBuf = await sharp(join(publicDir, 'logo.png'))
  .resize({ width: 300, fit: 'inside', withoutEnlargement: true })
  .toBuffer()

const { width: lw, height: lh } = await sharp(logoBuf).metadata()
const left = Math.round((512 - (lw || 0)) / 2)
const top = Math.round((512 - (lh || 0)) / 2)

await sharp(bg)
  .composite([{ input: logoBuf, left, top }])
  .png()
  .toFile(join(publicDir, 'favicon.png'))

console.log('Wrote public/favicon.png (512×512)')
