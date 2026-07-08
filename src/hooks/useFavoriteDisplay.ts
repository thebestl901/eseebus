import { useEffect, useMemo, useState } from 'react'
import type { FavoriteStop, KmbRoute, KmbStop } from '../types/kmb'
import type { AppLocale } from '../i18n/types'
import { pickLocalizedText } from '../i18n/types'
import { getRoutes, getStops } from '../services/kmbApi'
import { getCtbRoutes, type CtbRoute } from '../services/citybusApi'
import { getGmbRouteDetail, type GmbDirection } from '../services/gmbApi'

export interface FavoriteDisplay {
  stop: string
  dest: string
}

function resolveKmbRoute(
  routes: Map<string, KmbRoute>,
  fav: FavoriteStop,
): KmbRoute | undefined {
  const serviceType = fav.serviceType ?? '1'
  return routes.get(`${fav.route}-${fav.direction}-${serviceType}`)
}

function resolveCtbRoute(
  routes: Map<string, CtbRoute>,
  fav: FavoriteStop,
): CtbRoute | undefined {
  return routes.get(`${fav.route}-${fav.direction}`)
}

function resolveGmbDirection(
  directions: Map<string, GmbDirection>,
  fav: FavoriteStop,
): GmbDirection | undefined {
  if (!fav.routeId || !fav.routeSeq) return undefined
  return directions.get(`${fav.routeId}-${fav.routeSeq}`)
}

export function resolveFavoriteDisplay(
  fav: FavoriteStop,
  locale: AppLocale,
  kmbStops: Map<string, KmbStop> | null,
  kmbRoutes: Map<string, KmbRoute> | null,
  ctbRoutes: Map<string, CtbRoute> | null,
  gmbDirections: Map<string, GmbDirection> | null,
): FavoriteDisplay {
  let stopSc = fav.stopNameSc
  let stopEn = fav.stopNameEn
  let destSc = fav.destSc
  let destEn = fav.destEn

  const operator = fav.operator ?? 'KMB'

  if (operator === 'KMB') {
    const stop = kmbStops?.get(fav.stopId)
    if (stop) {
      stopSc ??= stop.name_sc
      stopEn ??= stop.name_en
    }
    const route = kmbRoutes ? resolveKmbRoute(kmbRoutes, fav) : undefined
    if (route) {
      destSc ??= route.dest_sc
      destEn ??= route.dest_en
    }
  } else if (operator === 'CTB') {
    const route = ctbRoutes ? resolveCtbRoute(ctbRoutes, fav) : undefined
    if (route) {
      if (fav.direction === 'I') {
        destSc ??= route.orig_sc
        destEn ??= route.orig_en
      } else {
        destSc ??= route.dest_sc
        destEn ??= route.dest_en
      }
    }
  } else if (operator === 'GMB') {
    const dir = gmbDirections ? resolveGmbDirection(gmbDirections, fav) : undefined
    if (dir) {
      destSc ??= dir.dest_sc
      destEn ??= dir.dest_en
    }
  }

  return {
    stop: pickLocalizedText(locale, fav.stopName, stopSc, stopEn),
    dest: pickLocalizedText(locale, fav.destTc, destSc, destEn),
  }
}

export function useFavoriteDisplayMap(
  favorites: FavoriteStop[],
  locale: AppLocale,
): Map<string, FavoriteDisplay> {
  const [kmbStops, setKmbStops] = useState<Map<string, KmbStop> | null>(null)
  const [kmbRoutes, setKmbRoutes] = useState<Map<string, KmbRoute> | null>(null)
  const [ctbRoutes, setCtbRoutes] = useState<Map<string, CtbRoute> | null>(null)
  const [gmbDirections, setGmbDirections] = useState<Map<string, GmbDirection> | null>(null)

  const needsKmbLookup =
    locale !== 'zh-TW' && favorites.some((f) => (f.operator ?? 'KMB') === 'KMB')
  const needsCtbLookup =
    locale !== 'zh-TW' && favorites.some((f) => f.operator === 'CTB')
  const gmbFavorites = useMemo(
    () => favorites.filter((f) => f.operator === 'GMB' && f.routeId && f.region && f.route),
    [favorites],
  )
  const needsGmbLookup = locale !== 'zh-TW' && gmbFavorites.length > 0

  useEffect(() => {
    if (!needsKmbLookup) {
      setKmbStops(null)
      setKmbRoutes(null)
      return
    }

    let cancelled = false
    Promise.all([getStops(), getRoutes()])
      .then(([stops, routes]) => {
        if (cancelled) return
        setKmbStops(new Map(stops.map((s) => [s.stop, s])))
        setKmbRoutes(
          new Map(routes.map((r) => [`${r.route}-${r.bound}-${r.service_type}`, r])),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setKmbStops(null)
          setKmbRoutes(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [needsKmbLookup, favorites])

  useEffect(() => {
    if (!needsCtbLookup) {
      setCtbRoutes(null)
      return
    }

    let cancelled = false
    getCtbRoutes()
      .then((routes) => {
        if (cancelled) return
        const map = new Map<string, CtbRoute>()
        for (const r of routes) {
          map.set(`${r.route}-O`, r)
          map.set(`${r.route}-I`, r)
        }
        setCtbRoutes(map)
      })
      .catch(() => {
        if (!cancelled) setCtbRoutes(null)
      })

    return () => {
      cancelled = true
    }
  }, [needsCtbLookup, favorites])

  useEffect(() => {
    if (!needsGmbLookup) {
      setGmbDirections(null)
      return
    }

    let cancelled = false
    const uniqueKeys = new Map<string, { region: string; route: string; routeId: number; routeSeq: number }>()
    for (const fav of gmbFavorites) {
      if (!fav.routeId || !fav.routeSeq || !fav.region) continue
      uniqueKeys.set(`${fav.routeId}-${fav.routeSeq}`, {
        region: fav.region,
        route: fav.route,
        routeId: fav.routeId,
        routeSeq: fav.routeSeq,
      })
    }

    Promise.all(
      [...uniqueKeys.values()].map(async (entry) => {
        const variants = await getGmbRouteDetail(
          entry.region as import('../types/transport').GmbRegion,
          entry.route,
        )
        const variant = variants.find((v) => v.route_id === entry.routeId)
        const dir = variant?.directions.find((d) => d.route_seq === entry.routeSeq)
        return dir ? ([`${entry.routeId}-${entry.routeSeq}`, dir] as const) : null
      }),
    )
      .then((results) => {
        if (cancelled) return
        const map = new Map<string, GmbDirection>()
        for (const item of results) {
          if (item) map.set(item[0], item[1])
        }
        setGmbDirections(map)
      })
      .catch(() => {
        if (!cancelled) setGmbDirections(null)
      })

    return () => {
      cancelled = true
    }
  }, [needsGmbLookup, gmbFavorites])

  return useMemo(() => {
    const map = new Map<string, FavoriteDisplay>()
    for (const fav of favorites) {
      map.set(
        fav.id,
        resolveFavoriteDisplay(fav, locale, kmbStops, kmbRoutes, ctbRoutes, gmbDirections),
      )
    }
    return map
  }, [favorites, locale, kmbStops, kmbRoutes, ctbRoutes, gmbDirections])
}
