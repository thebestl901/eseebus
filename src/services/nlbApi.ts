import type { AppLocale } from '../i18n/types'
import { getCachedRouteStops } from '../stores/routeStopCache'
import type { RouteStopPoint, StopEtaEntry } from '../types/transport'

/** v1 is authoritative for routes, stops, and ETA (v2 stops/ETA return empty). */
const API_BASE = '/api/nlb'

export interface NlbRoute {
  routeId: string
  routeNo: string
  routeName_c: string
  routeName_s: string
  routeName_e: string
  overnightRoute: number
  specialRoute: number
}

export interface NlbRouteStop {
  stopId: string
  stopName_c: string
  stopName_s: string
  stopName_e: string
  stopLocation_c: string
  stopLocation_s: string
  stopLocation_e: string
  latitude: string
  longitude: string
  fare: string
  fareHoliday: string
  someDepartureObserveOnly: number
}

export interface NlbEstimatedArrival {
  estimatedArrivalTime: string
  routeVariantName: string
  departed: string
  noGPS: string
  wheelChair: number
  generateTime?: string
}

interface NlbEstimatedArrivalsResponse {
  estimatedArrivals?: NlbEstimatedArrival[]
  message?: string
}

async function postJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`新大嶼山巴士 API 錯誤 (${res.status})`)
  return res.json() as Promise<T>
}

function nlbLang(locale: AppLocale): string {
  if (locale === 'en') return 'en'
  if (locale === 'zh-CN') return 'sc'
  return 'tc'
}

export function parseNlbDestination(route: NlbRoute): {
  destTc: string
  destSc: string
  destEn: string
} {
  const split = (name: string) => {
    const parts = name.split(/\s*>\s*/)
    return parts[parts.length - 1]?.trim() || name
  }
  return {
    destTc: split(route.routeName_c),
    destSc: split(route.routeName_s),
    destEn: split(route.routeName_e),
  }
}

export async function getNlbRoutes(): Promise<NlbRoute[]> {
  const data = await postJson<{ routes?: NlbRoute[] }>('/route.php?action=list', {})
  return data.routes ?? []
}

export async function getNlbRouteStops(routeId: number | string): Promise<NlbRouteStop[]> {
  const key = `nlb-v1-${routeId}`
  return getCachedRouteStops(key, async () => {
    const data = await postJson<{ stops?: NlbRouteStop[] }>('/stop.php?action=list', {
      routeId: String(routeId),
    })
    const stops = data.stops ?? []
    if (stops.length === 0) {
      throw new Error('NLB route stops unavailable')
    }
    return stops
  })
}

export async function getNlbStopEta(
  routeId: number | string,
  stopId: string,
  locale: AppLocale = 'zh-TW',
): Promise<NlbEstimatedArrival[]> {
  const data = await postJson<NlbEstimatedArrivalsResponse>('/stop.php?action=estimatedArrivals', {
    routeId: Number(routeId),
    stopId: Number(stopId),
    language: nlbLang(locale),
  })
  return data.estimatedArrivals ?? []
}

export async function getNlbRouteStopPoints(routeId: number | string): Promise<RouteStopPoint[]> {
  const stops = await getNlbRouteStops(routeId)
  return stops.map((stop, index) => ({
    seq: index + 1,
    stopId: stop.stopId,
    nameTc: stop.stopName_c,
    nameSc: stop.stopName_s,
    nameEn: stop.stopName_e,
    lat: parseFloat(stop.latitude),
    lng: parseFloat(stop.longitude),
  }))
}

function normalizeNlbEtaTime(raw: string): string {
  if (raw.includes('T')) return raw
  return `${raw.replace(' ', 'T')}+08:00`
}

export function nlbEtaToEntries(etas: NlbEstimatedArrival[]): StopEtaEntry[] {
  return etas
    .filter((entry) => entry.estimatedArrivalTime)
    .map((entry, index) => ({
      eta_seq: index + 1,
      eta: normalizeNlbEtaTime(entry.estimatedArrivalTime),
      rmk_tc: entry.routeVariantName || (entry.noGPS === '1' ? '未連接自動定位系統' : ''),
    }))
}
