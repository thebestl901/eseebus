import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HKO_PAGE = 'https://www.hko.gov.hk/textonly/v2/explain/wxicon_e.htm'
const HKO_ICON_BASE = 'https://www.hko.gov.hk/images/HKOWxIconOutline'
const OUTPUT_SIZE = 64

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../public/hko/wxicon')

async function fetchIconCodes() {
  const response = await fetch(HKO_PAGE)
  if (!response.ok) {
    throw new Error(`Failed to fetch HKO page (${response.status})`)
  }

  const html = await response.text()
  const matches = [...html.matchAll(/HKOWxIconOutline\/pic(\d+)\.png/g)]
  const codes = [...new Set(matches.map((match) => Number(match[1])))].sort((a, b) => a - b)
  if (codes.length === 0) {
    throw new Error('No weather icon codes found on HKO page')
  }

  return codes
}

async function fetchIcon(code) {
  const response = await fetch(`${HKO_ICON_BASE}/pic${code}.png`)
  if (!response.ok) {
    throw new Error(`Failed to fetch pic${code}.png (${response.status})`)
  }

  const source = Buffer.from(await response.arrayBuffer())
  const processed = await sharp(source)
    .trim()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  await writeFile(path.join(OUTPUT_DIR, `pic${code}.png`), processed)
  console.log(`pic${code}.png`)
}

await mkdir(OUTPUT_DIR, { recursive: true })

const iconCodes = await fetchIconCodes()
for (const code of iconCodes) {
  await fetchIcon(code)
}

console.log(`Saved ${iconCodes.length} weather icons to public/hko/wxicon`)
