import { getRoutes } from './kmbApi'
import { getCtbRoutes } from './citybusApi'
import { getGmbRouteCodes, getGmbRouteDetail } from './gmbApi'
import type { KmbRoute } from '../types/kmb'
import type { CtbRoute } from './citybusApi'
import {
  OPERATOR_LABELS,
  type GmbRegion,
  type RouteSearchItem,
  type TransportOperator,
} from '../types/transport'

function kmbToSearchItems(routes: KmbRoute[]): RouteSearchItem[] {
  return routes.map((r) => ({
    operator: 'KMB' as TransportOperator,
    operatorLabel: OPERATOR_LABELS.KMB,
    route: r.route,
    direction: r.bound,
    destTc: r.dest_tc,
    destSc: r.dest_sc,
    destEn: r.dest_en,
    serviceType: r.service_type,
  }))
}

function ctbToSearchItems(routes: CtbRoute[]): RouteSearchItem[] {
  const items: RouteSearchItem[] = []
  for (const r of routes) {
    items.push({
      operator: 'CTB',
      operatorLabel: OPERATOR_LABELS.CTB,
      route: r.route,
      direction: 'O',
      destTc: r.dest_tc,
      destSc: r.dest_sc,
      destEn: r.dest_en,
    })
    items.push({
      operator: 'CTB',
      operatorLabel: OPERATOR_LABELS.CTB,
      route: r.route,
      direction: 'I',
      destTc: r.orig_tc,
      destSc: r.orig_sc,
      destEn: r.orig_en,
    })
  }
  return items
}

let gmbCodesCache: { region: GmbRegion; code: string }[] | null = null
const gmbDetailCache = new Map<string, RouteSearchItem[]>()

async function loadGmbCodes(): Promise<{ region: GmbRegion; code: string }[]> {
  if (gmbCodesCache) return gmbCodesCache
  const codes = await getGmbRouteCodes()
  gmbCodesCache = (
    Object.entries(codes) as [GmbRegion, string[]][]
  ).flatMap(([region, list]) => list.map((code) => ({ region, code })))
  return gmbCodesCache
}

function gmbCacheKey(region: GmbRegion, code: string): string {
  return `${region}-${code}`
}

async function fetchGmbSearchItems(
  region: GmbRegion,
  code: string,
): Promise<RouteSearchItem[]> {
  const key = gmbCacheKey(region, code)
  const cached = gmbDetailCache.get(key)
  if (cached) return cached

  const variants = await getGmbRouteDetail(region, code)
  const items: RouteSearchItem[] = []
  for (const variant of variants) {
    for (const dir of variant.directions) {
      items.push({
        operator: 'GMB',
        operatorLabel: OPERATOR_LABELS.GMB,
        route: variant.route_code,
        direction: String(dir.route_seq),
        destTc: dir.dest_tc,
        destSc: dir.dest_sc,
        destEn: dir.dest_en,
        routeId: variant.route_id,
        region: variant.region,
        routeCode: variant.route_code,
        routeSeq: dir.route_seq,
      })
    }
  }
  gmbDetailCache.set(key, items)
  return items
}

export interface TransportSearchIndex {
  kmb: RouteSearchItem[]
  ctb: RouteSearchItem[]
  gmbCodes: { region: GmbRegion; code: string }[]
}

export async function loadTransportSearchIndex(): Promise<TransportSearchIndex> {
  const [kmbRoutes, ctbRoutes, gmbCodes] = await Promise.all([
    getRoutes(),
    getCtbRoutes(),
    loadGmbCodes(),
  ])
  return {
    kmb: kmbToSearchItems(kmbRoutes),
    ctb: ctbToSearchItems(ctbRoutes),
    gmbCodes,
  }
}

export function clearTransportSearchCaches(): void {
  gmbCodesCache = null
  gmbDetailCache.clear()
}

export function filterStaticSearchItems(
  items: RouteSearchItem[],
  query: string,
): RouteSearchItem[] {
  const q = query.toUpperCase().trim()
  if (!q) return []
  return items.filter((item) => item.route.toUpperCase().startsWith(q))
}

export async function searchGmbItems(
  codes: { region: GmbRegion; code: string }[],
  query: string,
  limit = 20,
): Promise<RouteSearchItem[]> {
  const q = query.toUpperCase().trim()
  if (!q) return []

  const matching = codes.filter((c) => c.code.toUpperCase().startsWith(q)).slice(0, limit)
  const batches = await Promise.all(
    matching.map(({ region, code }) => fetchGmbSearchItems(region, code)),
  )
  return batches.flat()
}

export function mergeSearchResults(
  kmb: RouteSearchItem[],
  ctb: RouteSearchItem[],
  gmb: RouteSearchItem[],
): RouteSearchItem[] {
  return [...kmb, ...ctb, ...gmb].sort((a, b) => {
    const routeCmp = a.route.localeCompare(b.route, undefined, { numeric: true })
    if (routeCmp !== 0) return routeCmp
    return a.direction.localeCompare(b.direction)
  })
}

export function getAllRouteNames(index: TransportSearchIndex): string[] {
  const names = new Set<string>()
  for (const item of [...index.kmb, ...index.ctb]) {
    names.add(item.route.toUpperCase())
  }
  for (const { code } of index.gmbCodes) {
    names.add(code.toUpperCase())
  }
  return [...names]
}

export function searchResultKey(item: RouteSearchItem): string {
  if (item.operator === 'GMB') {
    return `${item.operator}-${item.routeId}-${item.routeSeq}`
  }
  return `${item.operator}-${item.route}-${item.direction}-${item.serviceType ?? '1'}`
}

export function routeDetailPath(item: RouteSearchItem): string {
  const op = item.operator.toLowerCase()
  const params = new URLSearchParams({ dest: item.destTc })
  if (item.destSc) params.set('destSc', item.destSc)
  if (item.destEn) params.set('destEn', item.destEn)
  if (item.operator === 'GMB') {
    params.set('routeId', String(item.routeId))
    params.set('region', item.region!)
    return `/route/${op}/${item.route}/${item.direction}?${params}`
  }
  return `/route/${op}/${item.route}/${item.direction}?${params}`
}
