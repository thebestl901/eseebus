import type { EtaArrival } from '../types/kmb'

const STORAGE_KEY = 'eseebus-favorite-eta-cache'

export interface FavoriteEtaCache {
  updatedAt: number
  etas: Record<string, EtaArrival[]>
}

export function loadFavoriteEtaCache(): FavoriteEtaCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FavoriteEtaCache
    if (typeof parsed.updatedAt !== 'number' || !parsed.etas) return null
    return parsed
  } catch {
    return null
  }
}

export function saveFavoriteEtaCache(cache: FavoriteEtaCache): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota errors */
  }
}
