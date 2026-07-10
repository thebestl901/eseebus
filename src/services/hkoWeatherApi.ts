import type { AppLocale } from '../i18n/types'
import type {
  ActiveWarning,
  HkoWarningSummary,
  HomeWeatherData,
  WeatherDisplay,
  WeatherDisplaySlide,
} from '../types/weather'
import { localWeatherIconPath } from '../constants/hkoWeatherIcons'

const API_BASE = '/api/hko/weatherAPI/opendata/weather.php'
const HKO_WARNING_ICON_BASE = 'https://www.hko.gov.hk/en/wxinfo/dailywx/images'

/** Official HKO warning symbols — https://www.hko.gov.hk/en/wxinfo/dailywx/warnlegend.htm */
const WARNING_ICON_FILES: Record<string, string> = {
  WHOT: 'vhot.gif',
  WCOLD: 'cold.gif',
  WFIRER: 'firer.gif',
  WFIREY: 'firey.gif',
  WFROST: 'frost.gif',
  WL: 'landslip.gif',
  WFNTSA: 'ntfl.gif',
  WRAINA: 'raina.gif',
  WRAINR: 'rainr.gif',
  WRAINB: 'rainb.gif',
  WMSGNL: 'sms.gif',
  TC1: 'tc1.gif',
  TC3: 'tc3.gif',
  TC8NE: 'tc8ne.gif',
  TC8SE: 'tc8b.gif',
  TC8SW: 'tc8c.gif',
  TC8NW: 'tc8d.gif',
  TC9: 'tc9.gif',
  TC10: 'tc10.gif',
  WTS: 'ts.gif',
  WTMW: 'tsunami-warn.gif',
}

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
  icon?: number[]
  temperature?: {
    data?: { place: string; value: number; unit: string }[]
  }
}

interface WarnsumResponse {
  [key: string]: HkoWarningSummary | undefined
}

function parseIconCode(data: RhrreadResponse): number | null {
  const code = data.icon?.[0]
  return typeof code === 'number' ? code : null
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

/** https://www.hko.gov.hk/textonly/v2/explain/wxicon_e.htm */
export function weatherIconUrl(iconCode: number): string {
  return localWeatherIconPath(iconCode)
}

export function warningIconUrl(code: string): string | null {
  const file = WARNING_ICON_FILES[code.toUpperCase()]
  return file ? `${HKO_WARNING_ICON_BASE}/${file}` : null
}

function toSlides(warnings: ActiveWarning[]): WeatherDisplaySlide[] {
  return warnings.map((warning) => ({
    warningCode: warning.code,
    label: warning.name,
  }))
}

export function buildWeatherDisplay(data: HomeWeatherData | null): WeatherDisplay | null {
  if (!data) return null

  const severe = data.warnings.filter((warning) => isSevereWarning(warning.code))
  const other = data.warnings.filter((warning) => !isSevereWarning(warning.code))

  let slides: WeatherDisplaySlide[] = []
  if (severe.length > 0) {
    slides = toSlides(severe)
  } else if (other.length > 0) {
    slides = toSlides(other)
  }

  return {
    iconCode: data.iconCode,
    temperature: data.temperature,
    slides,
  }
}

export async function fetchHomeWeather(locale: AppLocale): Promise<HomeWeatherData> {
  const [rhrread, warnsum] = await Promise.all([
    fetchHko<RhrreadResponse>('rhrread', locale),
    fetchHko<WarnsumResponse>('warnsum', locale),
  ])

  return {
    temperature: parseTemperature(rhrread),
    iconCode: parseIconCode(rhrread),
    warnings: parseWarnings(warnsum),
  }
}
