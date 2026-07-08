import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { KmbRoute, KmbStop } from '../types/kmb'

interface KmbCacheDB extends DBSchema {
  routes: {
    key: string
    value: { data: KmbRoute[]; updatedAt: number }
  }
  stops: {
    key: string
    value: { data: KmbStop[]; updatedAt: number }
  }
  routeStops: {
    key: string
    value: { data: unknown[]; updatedAt: number }
  }
}

const DB_NAME = 'eseebus-cache'
const DB_VERSION = 1
const ROUTE_STOP_TTL = 5 * 60 * 1000

let dbPromise: Promise<IDBPDatabase<KmbCacheDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<KmbCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('routes')
        db.createObjectStore('stops')
        db.createObjectStore('routeStops')
      },
    })
  }
  return dbPromise
}

function isStale(updatedAt: number, ttl: number): boolean {
  return Date.now() - updatedAt > ttl
}

function shouldRefreshDaily(updatedAt: number): boolean {
  const updated = new Date(updatedAt)
  const now = new Date()
  const today5am = new Date(now)
  today5am.setHours(5, 0, 0, 0)
  if (now < today5am) today5am.setDate(today5am.getDate() - 1)
  return updated < today5am
}

export async function getCachedRoutes(
  fetcher: () => Promise<KmbRoute[]>,
): Promise<KmbRoute[]> {
  const db = await getDb()
  const cached = await db.get('routes', 'all')
  if (cached && !shouldRefreshDaily(cached.updatedAt)) {
    return cached.data
  }
  const data = await fetcher()
  await db.put('routes', { data, updatedAt: Date.now() }, 'all')
  return data
}

export async function getCachedStops(
  fetcher: () => Promise<KmbStop[]>,
): Promise<KmbStop[]> {
  const db = await getDb()
  const cached = await db.get('stops', 'all')
  if (cached && !shouldRefreshDaily(cached.updatedAt)) {
    return cached.data
  }
  const data = await fetcher()
  await db.put('stops', { data, updatedAt: Date.now() }, 'all')
  return data
}

export async function getCachedRouteStops<T>(
  key: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  const db = await getDb()
  const cached = await db.get('routeStops', key)
  if (cached && !isStale(cached.updatedAt, ROUTE_STOP_TTL)) {
    return cached.data as T[]
  }
  const data = await fetcher()
  await db.put('routeStops', { data, updatedAt: Date.now() }, key)
  return data
}

export async function getStopsFromCache(): Promise<KmbStop[] | null> {
  const db = await getDb()
  const cached = await db.get('stops', 'all')
  return cached?.data ?? null
}

export async function getRoutesFromCache(): Promise<KmbRoute[] | null> {
  const db = await getDb()
  const cached = await db.get('routes', 'all')
  return cached?.data ?? null
}

export async function getRoutesUpdatedAt(): Promise<number | null> {
  const db = await getDb()
  const cached = await db.get('routes', 'all')
  return cached?.updatedAt ?? null
}

export async function getStopsUpdatedAt(): Promise<number | null> {
  const db = await getDb()
  const cached = await db.get('stops', 'all')
  return cached?.updatedAt ?? null
}

export async function forceRefreshRoutes(
  fetcher: () => Promise<KmbRoute[]>,
): Promise<KmbRoute[]> {
  const db = await getDb()
  const data = await fetcher()
  await db.put('routes', { data, updatedAt: Date.now() }, 'all')
  return data
}

export async function forceRefreshStops(
  fetcher: () => Promise<KmbStop[]>,
): Promise<KmbStop[]> {
  const db = await getDb()
  const data = await fetcher()
  await db.put('stops', { data, updatedAt: Date.now() }, 'all')
  return data
}
