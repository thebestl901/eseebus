import type { AppLocale } from '../i18n/types'
import { getRoutesUpdatedAt, getStopsUpdatedAt } from '../stores/routeStopCache'
import { forceRefreshRoutes, forceRefreshStops } from './kmbApi'
import { getCtbRoutes } from './citybusApi'
import { getGmbRouteCodes } from './gmbApi'
import { clearTransportSearchCaches } from './transportSearch'

const META_KEY = 'eseebus-catalog-meta'

export const ROUTE_CATALOG_UPDATED_EVENT = 'route-catalog-updated'

interface CatalogMeta {
  updatedAt: number
}

function readMeta(): CatalogMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CatalogMeta
  } catch {
    return null
  }
}

function writeMeta(meta: CatalogMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export async function getRouteCatalogUpdatedAt(): Promise<number | null> {
  const meta = readMeta()
  if (meta) return meta.updatedAt

  const [routesAt, stopsAt] = await Promise.all([getRoutesUpdatedAt(), getStopsUpdatedAt()])
  const times = [routesAt, stopsAt].filter((t): t is number => t != null)
  return times.length ? Math.max(...times) : null
}

export async function refreshRouteCatalog(): Promise<number> {
  await Promise.all([
    forceRefreshRoutes(),
    forceRefreshStops(),
    getCtbRoutes(),
    getGmbRouteCodes(),
  ])
  clearTransportSearchCaches()

  const updatedAt = Date.now()
  writeMeta({ updatedAt })
  window.dispatchEvent(new CustomEvent(ROUTE_CATALOG_UPDATED_EVENT))
  return updatedAt
}

export function formatCatalogUpdatedAt(timestamp: number, locale: AppLocale): string {
  const intlLocale = locale === 'en' ? 'en-HK' : locale === 'zh-CN' ? 'zh-CN' : 'zh-HK'
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
