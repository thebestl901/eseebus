import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ICON_CODES = [
  50, 51, 52, 53, 54,
  60, 61, 62, 63, 64, 65,
  70, 71, 72, 73, 74, 75, 76, 77,
  80, 81, 82, 83, 84, 85,
  90, 91, 92, 93,
]

const HKO_SOURCE_BASE = 'https://www.hko.gov.hk/images/wxicon'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../public/hko/wxicon')

async function removeBlackMatte(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r < 28 && g < 28 && b < 28) {
      data[i + 3] = 0
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()
}

async function fetchIcon(code) {
  const response = await fetch(`${HKO_SOURCE_BASE}/pic${code}.png`)
  if (!response.ok) {
    throw new Error(`Failed to fetch pic${code}.png (${response.status})`)
  }

  const source = Buffer.from(await response.arrayBuffer())
  const processed = await removeBlackMatte(source)
  await writeFile(path.join(OUTPUT_DIR, `pic${code}.png`), processed)
  console.log(`pic${code}.png`)
}

await mkdir(OUTPUT_DIR, { recursive: true })

for (const code of ICON_CODES) {
  await fetchIcon(code)
}

console.log(`Saved ${ICON_CODES.length} weather icons to public/hko/wxicon`)
