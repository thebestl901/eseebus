const MAIN_PACKAGE_URL = 'https://raw.githubusercontent.com/thebestl901/Eseebus/main/package.json'
const CACHE_KEY = 'eseebus-latest-version-check'
const CACHE_TTL_MS = 60 * 60 * 1000

export interface VersionCheckResult {
  latestVersion: string | null
  updateAvailable: boolean
}

function parseVersion(version: string): [number, number, number] {
  const parts = version
    .replace(/^v/i, '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function isVersionNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

function readCache(): { latestVersion: string; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { latestVersion?: string; ts?: number }
    if (!parsed.latestVersion || !parsed.ts) return null
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return { latestVersion: parsed.latestVersion, ts: parsed.ts }
  } catch {
    return null
  }
}

function writeCache(latestVersion: string) {
  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ latestVersion, ts: Date.now() }),
  )
}

export async function checkLatestVersion(currentVersion: string): Promise<VersionCheckResult> {
  const cached = readCache()
  if (cached) {
    return {
      latestVersion: cached.latestVersion,
      updateAvailable: isVersionNewer(cached.latestVersion, currentVersion),
    }
  }

  try {
    const response = await fetch(MAIN_PACKAGE_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`main package.json ${response.status}`)

    const pkg = (await response.json()) as { version?: string }
    const latestVersion = pkg.version?.trim() || null

    if (latestVersion) writeCache(latestVersion)

    return {
      latestVersion,
      updateAvailable: latestVersion ? isVersionNewer(latestVersion, currentVersion) : false,
    }
  } catch {
    return { latestVersion: null, updateAvailable: false }
  }
}
