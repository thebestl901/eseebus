import { getCachedRouteStops } from '../stores/routeStopCache'
import type { RouteStopPoint, StopEtaEntry } from '../types/transport'

const API_BASE = '/api/citybus'

interface ApiResponse<T> {
  type?: string
  data: T
}

export interface CtbRoute {
  co: string
  route: string
  orig_tc: string
  orig_en: string
  orig_sc: string
  dest_tc: string
  dest_en: string
  dest_sc: string
}

export interface CtbRouteStop {
  co: string
  route: string
  dir: 'O' | 'I'
  seq: number
  stop: string
}

export interface CtbStop {
  stop: string
  name_tc: string
  name_en: string
  name_sc: string
  lat: string
  long: string
}

export interface CtbStopEta {
  co: string
  route: string
  dir: 'O' | 'I'
  seq: number
  stop: string
  dest_tc: string
  eta: string | null
  rmk_tc: string
  eta_seq: number
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`城巴 API 錯誤 (${res.status})`)
  const json = (await res.json()) as ApiResponse<T>
  return json.data
}

export async function getCtbRoutes(): Promise<CtbRoute[]> {
  return fetchJson<CtbRoute[]>('/route/ctb')
}

function boundToCtbDir(bound: 'O' | 'I'): 'outbound' | 'inbound' {
  return bound === 'O' ? 'outbound' : 'inbound'
}

export async function getCtbRouteStops(
  route: string,
  bound: 'O' | 'I',
): Promise<CtbRouteStop[]> {
  const dir = boundToCtbDir(bound)
  const key = `ctb-${route}-${dir}`
  return getCachedRouteStops(key, () =>
    fetchJson<CtbRouteStop[]>(`/route-stop/ctb/${route}/${dir}`),
  )
}

export async function getCtbStop(stopId: string): Promise<CtbStop> {
  return fetchJson<CtbStop>(`/stop/${stopId}`)
}

export async function getCtbStopEta(stopId: string, route: string): Promise<CtbStopEta[]> {
  return fetchJson<CtbStopEta[]>(`/eta/ctb/${stopId}/${route}`)
}

export async function getCtbRouteStopPoints(
  route: string,
  bound: 'O' | 'I',
): Promise<RouteStopPoint[]> {
  const routeStops = await getCtbRouteStops(route, bound)
  const stops = await Promise.all(
    routeStops.map(async (rs) => {
      try {
        const stop = await getCtbStop(rs.stop)
        return {
          seq: rs.seq,
          stopId: rs.stop,
          nameTc: stop.name_tc,
          nameSc: stop.name_sc,
          nameEn: stop.name_en,
          lat: parseFloat(stop.lat),
          lng: parseFloat(stop.long),
        }
      } catch {
        return {
          seq: rs.seq,
          stopId: rs.stop,
          nameTc: rs.stop,
        }
      }
    }),
  )
  return stops
}

export function ctbEtaToEntries(etas: CtbStopEta[], bound: 'O' | 'I'): StopEtaEntry[] {
  return etas
    .filter((e) => e.dir === bound && e.eta)
    .sort((a, b) => a.eta_seq - b.eta_seq)
    .map((e) => ({
      eta_seq: e.eta_seq,
      eta: e.eta!,
      rmk_tc: e.rmk_tc,
    }))
}
