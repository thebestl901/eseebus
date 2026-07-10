import { useCallback, useEffect, useState } from 'react'
import type { FavoriteStop } from '../types/kmb'
import type { TransportOperator } from '../types/transport'

const STORAGE_KEY = 'favorites'

function migrateFavorite(fav: FavoriteStop): FavoriteStop {
  const operator = fav.operator ?? 'KMB'
  const id = favoriteId({ ...fav, operator })
  return { ...fav, operator, id }
}

function loadFavorites(): FavoriteStop[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const list = JSON.parse(raw) as FavoriteStop[]
      return list.map(migrateFavorite)
    }
  } catch {
    /* ignore */
  }
  return []
}

function saveFavorites(favorites: FavoriteStop[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

export function favoriteId(fav: Omit<FavoriteStop, 'id'>): string {
  const operator = fav.operator ?? 'KMB'
  if (operator === 'GMB') {
    return `${operator}-${fav.routeId}-${fav.routeSeq}-${fav.stopId}`
  }
  if (operator === 'NLB') {
    return `${operator}-${fav.routeId}-${fav.stopId}`
  }
  if (operator === 'MTR') {
    return `${operator}-${fav.route}-${fav.mtrLineRef}-${fav.stopId}`
  }
  return `${operator}-${fav.route}-${fav.direction}-${fav.stopId}`
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStop[]>(loadFavorites)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const addFavorite = useCallback((fav: Omit<FavoriteStop, 'id'>) => {
    const operator = fav.operator ?? 'KMB'
    const id = favoriteId({ ...fav, operator })
    setFavorites((prev) => {
      if (prev.some((f) => f.id === id)) return prev
      return [...prev, { ...fav, operator, id }]
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const isFavorite = useCallback(
    (fav: Pick<FavoriteStop, 'operator' | 'route' | 'direction' | 'stopId' | 'routeId' | 'routeSeq' | 'mtrLineRef'>) => {
      const id = favoriteId({ ...fav, operator: fav.operator ?? 'KMB', stopName: '', destTc: '' })
      return favorites.some((f) => f.id === id)
    },
    [favorites],
  )

  const toggleFavorite = useCallback((fav: Omit<FavoriteStop, 'id'>) => {
    const operator = fav.operator ?? 'KMB'
    const id = favoriteId({ ...fav, operator })
    setFavorites((prev) => {
      if (prev.some((f) => f.id === id)) {
        return prev.filter((f) => f.id !== id)
      }
      return [...prev, { ...fav, operator, id }]
    })
  }, [])

  const moveFavoriteToTop = useCallback((id: string) => {
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.unshift(item)
      return next
    })
  }, [])

  const upsertFavoriteToTop = useCallback((fav: Omit<FavoriteStop, 'id'>) => {
    const operator = fav.operator ?? 'KMB'
    const id = favoriteId({ ...fav, operator })
    setFavorites((prev) => {
      const existingIdx = prev.findIndex((f) => f.id === id)
      if (existingIdx >= 0) {
        const next = [...prev]
        const [item] = next.splice(existingIdx, 1)
        next.unshift({ ...item, ...fav, operator, id })
        return next
      }
      return [{ ...fav, operator, id }, ...prev]
    })
  }, [])

  const moveFavoriteUp = useCallback((id: string) => {
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }, [])

  const moveFavoriteDown = useCallback((id: string) => {
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
      return next
    })
  }, [])

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    moveFavoriteToTop,
    upsertFavoriteToTop,
    moveFavoriteUp,
    moveFavoriteDown,
  }
}

export function operatorLabelForFavorite(fav: FavoriteStop): string {
  const labels: Record<TransportOperator, string> = {
    KMB: '九巴',
    CTB: '城巴',
    GMB: '專線小巴',
    NLB: '新大嶼山巴士',
    MTR: '港鐵巴士',
  }
  return labels[fav.operator ?? 'KMB']
}

export function favoriteRoutePath(fav: FavoriteStop): string {
  const op = (fav.operator ?? 'KMB').toLowerCase()
  const params = new URLSearchParams({ stop: fav.stopId })
  if (fav.destTc) params.set('dest', fav.destTc)
  if (fav.destSc) params.set('destSc', fav.destSc)
  if (fav.destEn) params.set('destEn', fav.destEn)
  if (fav.operator === 'GMB' && fav.routeId && fav.region) {
    params.set('routeId', String(fav.routeId))
    params.set('region', fav.region)
    return `/route/${op}/${fav.route}/${fav.direction}?${params}`
  }
  if (fav.operator === 'NLB' && fav.routeId) {
    params.set('routeId', String(fav.routeId))
    return `/route/${op}/${fav.route}/${fav.direction}?${params}`
  }
  if (fav.operator === 'MTR' && fav.mtrLineRef && fav.mtrReferenceId) {
    params.set('lineRef', fav.mtrLineRef)
    params.set('refId', fav.mtrReferenceId)
    return `/route/${op}/${fav.route}/${fav.direction}?${params}`
  }
  return `/route/${op}/${fav.route}/${fav.direction}?${params}`
}
