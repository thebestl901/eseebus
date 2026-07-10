import type { AppLocale } from '../i18n/types'
import type { ActiveWarning, HkoWarningSummary, HomeWeatherData } from '../types/weather'

const API_BASE = '/api/hko/weatherAPI/opendata/weather.php'

const SEVERE_TYPHOON_CODES = new Set([
  'TC8NE',
  'TC8NW',
  'TC8SE',
  'TC8SW',
  'TC9',
  'TC10',
])

const SEVERE_RAIN_CODES = new Set(['WRAINR', 'WRAINB'])

function hkoLang(locale: AppLocale): string {
  if (locale === 'en') return 'en'
  if (locale === 'zh-CN') return 'sc'
  return 'tc'
}

async function fetchHko<T>(dataType: string, locale: AppLocale): Promise<T> {
  const params = new URLSearchParams({ dataType, lang: hkoLang(locale) })
  const res = await fetch(`${API_BASE}?${params}`)
  if (!res.ok) {
    throw new Error(`HKO API error (${res.status})`)
  }
  return res.json() as Promise<T>
}

interface RhrreadResponse {
  temperature?: {
    data?: { place: string; value: number; unit: string }[]
  }
}

interface WarnsumResponse {
  [key: string]: HkoWarningSummary | undefined
}

function parseTemperature(data: RhrreadResponse): number | null {
  const readings = data.temperature?.data
  if (!readings?.length) return null

  const hko =
    readings.find((item) => item.place === '香港天文台') ??
    readings.find((item) => item.place === 'Hong Kong Observatory')
  return hko?.value ?? readings[0]?.value ?? null
}

function parseWarnings(data: WarnsumResponse): ActiveWarning[] {
  return Object.values(data)
    .filter((item): item is HkoWarningSummary => Boolean(item?.name && item?.code))
    .filter((item) => item.actionCode?.toUpperCase() !== 'CANCEL')
    .map((item) => ({ name: item.name, code: item.code }))
}

export function isSevereWarning(code: string): boolean {
  const normalized = code.toUpperCase()
  return SEVERE_TYPHOON_CODES.has(normalized) || SEVERE_RAIN_CODES.has(normalized)
}

export function buildWeatherDisplayItems(
  data: HomeWeatherData | null,
): string[] {
  if (!data) return []

  const severe = data.warnings.filter((warning) => isSevereWarning(warning.code))
  const other = data.warnings.filter((warning) => !isSevereWarning(warning.code))
  const tempLabel = data.temperature !== null ? `${data.temperature}°C` : null

  if (severe.length > 0) {
    return severe.map((warning) => warning.name)
  }

  if (other.length > 0) {
    if (tempLabel) {
      return other.flatMap((warning) => [warning.name, tempLabel])
    }
    return other.map((warning) => warning.name)
  }

  return tempLabel ? [tempLabel] : []
}

export async function fetchHomeWeather(locale: AppLocale): Promise<HomeWeatherData> {
  const [rhrread, warnsum] = await Promise.all([
    fetchHko<RhrreadResponse>('rhrread', locale),
    fetchHko<WarnsumResponse>('warnsum', locale),
  ])

  return {
    temperature: parseTemperature(rhrread),
    warnings: parseWarnings(warnsum),
  }
}
