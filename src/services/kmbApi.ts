import type { KmbRoute, KmbRouteEta, KmbRouteStop, KmbStop, KmbStopEta } from '../types/kmb'
import {
  forceRefreshRoutes as forceRefreshRoutesCache,
  forceRefreshStops as forceRefreshStopsCache,
  getCachedRouteStops,
  getCachedRoutes,
  getCachedStops,
} from '../stores/routeStopCache'
import { boundToDirection } from '../utils/helpers'

const API_BASE = '/api/kmb'

interface ApiResponse<T> {
  type: string
  data: T
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`API 錯誤 (${res.status})`)
  }
  const json = (await res.json()) as ApiResponse<T>
  return json.data
}

async function fetchRoutesRaw(): Promise<KmbRoute[]> {
  return fetchJson<KmbRoute[]>('/route/')
}

async function fetchStopsRaw(): Promise<KmbStop[]> {
  return fetchJson<KmbStop[]>('/stop')
}

export async function getRoutes(): Promise<KmbRoute[]> {
  return getCachedRoutes(fetchRoutesRaw)
}

export async function getStops(): Promise<KmbStop[]> {
  return getCachedStops(fetchStopsRaw)
}

export async function forceRefreshRoutes(): Promise<KmbRoute[]> {
  return forceRefreshRoutesCache(fetchRoutesRaw)
}

export async function forceRefreshStops(): Promise<KmbStop[]> {
  return forceRefreshStopsCache(fetchStopsRaw)
}

export async function getRouteStops(
  route: string,
  bound: 'O' | 'I',
  serviceType = '1',
): Promise<KmbRouteStop[]> {
  const direction = boundToDirection(bound)
  const key = `${route}-${direction}-${serviceType}`
  return getCachedRouteStops(key, () =>
    fetchJson<KmbRouteStop[]>(`/route-stop/${route}/${direction}/${serviceType}`),
  )
}

export async function getStopEta(stopId: string): Promise<KmbStopEta[]> {
  return fetchJson<KmbStopEta[]>(`/stop-eta/${stopId}`)
}

export async function getRouteEta(route: string, serviceType = '1'): Promise<KmbRouteEta[]> {
  return fetchJson<KmbRouteEta[]>(`/route-eta/${route}/${serviceType}`)
}

export async function searchRoutes(query: string, routes?: KmbRoute[]): Promise<KmbRoute[]> {
  const allRoutes = routes ?? (await getRoutes())
  const q = query.toUpperCase().trim()
  if (!q) return []
  return allRoutes.filter((r) => r.route.toUpperCase().startsWith(q))
}
