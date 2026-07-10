import type { RouteSearchItem } from '../types/transport'
import { OPERATOR_LABELS } from '../types/transport'
import type { RouteStopPoint } from '../types/transport'

const DATA_BASE = '/api/mtr-data'
const ROUTES_URL = `${DATA_BASE}/mtr_bus_routes.csv`
const STOPS_URL = `${DATA_BASE}/mtr_bus_stops.csv`

export interface MtrRouteRow {
  routeId: string
  nameTc: string
  nameEn: string
  isCircular: boolean
  lineUp: string
  lineDown: string
  referenceId: string
}

export interface MtrStopRow {
  routeId: string
  direction: 'O' | 'I'
  seq: number
  stopId: string
  lat: number
  lng: number
  nameTc: string
  nameEn: string
  referenceId: string
}

interface MtrCatalog {
  routes: MtrRouteRow[]
  stops: MtrStopRow[]
  searchItems: RouteSearchItem[]
}

let catalogCache: MtrCatalog | null = null
let catalogLoadedAt = 0
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }
    current += ch
  }
  fields.push(current)
  return fields
}

function parseDestination(nameTc: string, nameEn: string): {
  destTc: string
  destEn: string
} {
  const tcParts = nameTc.split('至')
  const enParts = nameEn.split(' to ')
  return {
    destTc: tcParts[tcParts.length - 1]?.replace(/\s*\(.*\)\s*$/, '').trim() || nameTc,
    destEn: enParts[enParts.length - 1]?.replace(/\s*\(.*\)\s*$/, '').trim() || nameEn,
  }
}

function buildSearchItems(routes: MtrRouteRow[]): RouteSearchItem[] {
  const items: RouteSearchItem[] = []

  for (const route of routes) {
    const dest = parseDestination(route.nameTc, route.nameEn)
    if (route.lineUp) {
      items.push({
        operator: 'MTR',
        operatorLabel: OPERATOR_LABELS.MTR,
        route: route.routeId,
        direction: 'O',
        destTc: dest.destTc,
        destEn: dest.destEn,
        mtrLineRef: route.lineUp,
        mtrReferenceId: route.referenceId,
      })
    }
    if (route.lineDown) {
      items.push({
        operator: 'MTR',
        operatorLabel: OPERATOR_LABELS.MTR,
        route: route.routeId,
        direction: 'I',
        destTc: dest.destTc,
        destEn: dest.destEn,
        mtrLineRef: route.lineDown,
        mtrReferenceId: route.referenceId,
      })
    }
  }

  return items
}

function parseRoutesCsv(text: string): MtrRouteRow[] {
  const lines = text.trim().split(/\r?\n/)
  return lines.slice(1).map((line) => {
    const [
      routeId,
      nameTc,
      nameEn,
      isCircular,
      lineUp,
      lineDown,
      referenceId,
    ] = parseCsvLine(line)
    return {
      routeId,
      nameTc,
      nameEn,
      isCircular: isCircular === '1',
      lineUp,
      lineDown,
      referenceId,
    }
  })
}

function parseStopsCsv(text: string): MtrStopRow[] {
  const lines = text.trim().split(/\r?\n/)
  return lines.slice(1).map((line) => {
    const [
      routeId,
      direction,
      seq,
      stopId,
      lat,
      lng,
      nameTc,
      nameEn,
      referenceId,
    ] = parseCsvLine(line)
    return {
      routeId,
      direction: direction === 'I' ? 'I' : 'O',
      seq: Number(seq),
      stopId,
      lat: Number(lat),
      lng: Number(lng),
      nameTc,
      nameEn,
      referenceId,
    }
  })
}

export async function loadMtrBusCatalog(force = false): Promise<MtrCatalog> {
  if (!force && catalogCache && Date.now() - catalogLoadedAt < CATALOG_TTL_MS) {
    return catalogCache
  }

  const [routesRes, stopsRes] = await Promise.all([fetch(ROUTES_URL), fetch(STOPS_URL)])
  if (!routesRes.ok || !stopsRes.ok) {
    throw new Error('MTR bus catalog fetch failed')
  }

  const routes = parseRoutesCsv(await routesRes.text())
  const stops = parseStopsCsv(await stopsRes.text())
  catalogCache = {
    routes,
    stops,
    searchItems: buildSearchItems(routes),
  }
  catalogLoadedAt = Date.now()
  return catalogCache
}

export function clearMtrBusCatalogCache(): void {
  catalogCache = null
  catalogLoadedAt = 0
}

export function getMtrRouteStopPoints(
  catalog: MtrCatalog,
  routeId: string,
  direction: 'O' | 'I',
  referenceId: string,
): RouteStopPoint[] {
  return catalog.stops
    .filter(
      (stop) =>
        stop.routeId === routeId &&
        stop.direction === direction &&
        stop.referenceId === referenceId,
    )
    .sort((a, b) => a.seq - b.seq)
    .map((stop) => ({
      seq: stop.seq,
      stopId: stop.stopId,
      nameTc: stop.nameTc,
      nameEn: stop.nameEn,
      lat: stop.lat,
      lng: stop.lng,
    }))
}

export function findMtrRouteVariant(
  catalog: MtrCatalog,
  routeId: string,
  direction: 'O' | 'I',
  lineRef: string,
  referenceId?: string,
): MtrRouteRow | undefined {
  return catalog.routes.find((route) => {
    if (route.routeId !== routeId) return false
    if (referenceId && route.referenceId !== referenceId) return false
    return direction === 'O' ? route.lineUp === lineRef : route.lineDown === lineRef
  })
}
