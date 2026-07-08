import { getCachedRouteStops } from '../stores/routeStopCache'
import type { GmbRegion, RouteStopPoint, StopEtaEntry } from '../types/transport'

const API_BASE = '/api/gmb'

interface ApiResponse<T> {
  type?: string
  data: T
}

export interface GmbRouteVariant {
  route_id: number
  region: GmbRegion
  route_code: string
  description_tc: string
  directions: GmbDirection[]
}

export interface GmbDirection {
  route_seq: number
  orig_tc: string
  orig_en: string
  orig_sc: string
  dest_tc: string
  dest_en: string
  dest_sc: string
}

export interface GmbRouteStop {
  stop_seq: number
  stop_id: number
  name_tc: string
  name_en: string
  name_sc: string
}

export interface GmbStop {
  coordinates?: {
    wgs84?: { latitude: number; longitude: number }
  }
}

export interface GmbStopEta {
  eta_seq: number
  diff: number
  timestamp: string
  remarks_tc: string
}

export interface GmbRouteCodes {
  HKI: string[]
  KLN: string[]
  NT: string[]
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`專線小巴 API 錯誤 (${res.status})`)
  const json = (await res.json()) as ApiResponse<T>
  return json.data
}

export async function getGmbRouteCodes(): Promise<GmbRouteCodes> {
  const data = await fetchJson<{ routes: GmbRouteCodes }>('/route')
  return data.routes
}

export async function getGmbRouteDetail(
  region: GmbRegion,
  code: string,
): Promise<GmbRouteVariant[]> {
  return fetchJson<GmbRouteVariant[]>(`/route/${region}/${code}`)
}

export async function getGmbRouteStops(
  routeId: number,
  routeSeq: number,
): Promise<GmbRouteStop[]> {
  const key = `gmb-${routeId}-${routeSeq}`
  return getCachedRouteStops(key, async () => {
    const data = await fetchJson<{ route_stops: GmbRouteStop[] }>(
      `/route-stop/${routeId}/${routeSeq}`,
    )
    return data.route_stops
  })
}

export async function getGmbStop(stopId: number): Promise<GmbStop> {
  return fetchJson<GmbStop>(`/stop/${stopId}`)
}

export async function getGmbStopEta(
  routeId: number,
  routeSeq: number,
  stopSeq: number,
): Promise<GmbStopEta[]> {
  const data = await fetchJson<{ eta: GmbStopEta[] }>(
    `/eta/route-stop/${routeId}/${routeSeq}/${stopSeq}`,
  )
  return data.eta ?? []
}

export async function getGmbRouteStopPoints(
  routeId: number,
  routeSeq: number,
): Promise<RouteStopPoint[]> {
  const routeStops = await getGmbRouteStops(routeId, routeSeq)
  const stops = await Promise.all(
    routeStops.map(async (rs) => {
      try {
        const stop = await getGmbStop(rs.stop_id)
        const wgs = stop.coordinates?.wgs84
        return {
          seq: rs.stop_seq,
          stopId: String(rs.stop_id),
          nameTc: rs.name_tc,
          nameSc: rs.name_sc,
          nameEn: rs.name_en,
          lat: wgs?.latitude,
          lng: wgs?.longitude,
        }
      } catch {
        return {
          seq: rs.stop_seq,
          stopId: String(rs.stop_id),
          nameTc: rs.name_tc,
          nameSc: rs.name_sc,
          nameEn: rs.name_en,
        }
      }
    }),
  )
  return stops
}

export function gmbEtaToEntries(etas: GmbStopEta[]): StopEtaEntry[] {
  return etas
    .filter((e) => e.timestamp)
    .sort((a, b) => a.eta_seq - b.eta_seq)
    .map((e) => ({
      eta_seq: e.eta_seq,
      eta: e.timestamp,
      rmk_tc: e.remarks_tc ?? '',
    }))
}
