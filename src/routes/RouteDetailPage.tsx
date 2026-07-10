import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { LatLngExpression } from 'leaflet'
import { RouteMap } from '../components/RouteMap'
import { EtaArrivalList } from '../components/EtaArrivalList'
import { getRouteEta, getRouteStops, getStops } from '../services/kmbApi'
import {
  getCtbRouteStopPoints,
} from '../services/citybusApi'
import { getGmbRouteStopPoints } from '../services/gmbApi'
import { getCtbStopArrivals, getGmbStopArrivals } from '../services/etaService'
import type { KmbRouteEta, KmbRouteStop, KmbStop } from '../types/kmb'
import type { RouteStopPoint, TransportOperator } from '../types/transport'
import { formatArrivalTime, getEtaArrivals, localizedStopName } from '../utils/helpers'
import { useFavorites } from '../hooks/useFavorites'
import { useEtaPolling } from '../hooks/useEtaPolling'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from '../i18n/I18nContext'
import { pickLocalizedText } from '../i18n/types'

function parseOperator(raw?: string): TransportOperator {
  const op = raw?.toUpperCase()
  if (op === 'CTB') return 'CTB'
  if (op === 'GMB') return 'GMB'
  return 'KMB'
}

const ROUTE_MAP_HEIGHT_MIN = 96
const ROUTE_MAP_HEIGHT_MAX_CAP = 280

function getRouteMapHeightMax() {
  return Math.min(Math.round(window.innerHeight * 0.36), ROUTE_MAP_HEIGHT_MAX_CAP)
}

function mapHeightForScroll(scrollTop: number) {
  return Math.max(ROUTE_MAP_HEIGHT_MIN, getRouteMapHeightMax() - scrollTop * 0.55)
}

export function RouteDetailPage() {
  const { operator: operatorParam, route, direction } = useParams<{
    operator?: string
    route: string
    direction: string
  }>()
  const [searchParams] = useSearchParams()
  const highlightStopId = searchParams.get('stop')
  const destFromQuery = searchParams.get('dest') ?? ''
  const destScFromQuery = searchParams.get('destSc') ?? undefined
  const destEnFromQuery = searchParams.get('destEn') ?? undefined
  const navigate = useNavigate()
  const operator = parseOperator(operatorParam)
  const bound = (direction === 'I' ? 'I' : direction === 'O' ? 'O' : null) as 'O' | 'I' | null
  const gmbRouteId = searchParams.get('routeId') ? Number(searchParams.get('routeId')) : undefined
  const gmbRouteSeq = operator === 'GMB' ? Number(direction) : undefined
  const { toggleFavorite, upsertFavoriteToTop, isFavorite } = useFavorites()
  const { settings } = useSettings()
  const { t } = useTranslation()

  const [kmbRouteStops, setKmbRouteStops] = useState<KmbRouteStop[]>([])
  const [allStops, setAllStops] = useState<KmbStop[]>([])
  const [stopPoints, setStopPoints] = useState<RouteStopPoint[]>([])
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const [destTitle, setDestTitle] = useState('')
  const [altStopArrivals, setAltStopArrivals] = useState<Record<number, import('../types/kmb').EtaArrival[]>>({})
  const headerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [mapHeight, setMapHeight] = useState(getRouteMapHeightMax)

  useEffect(() => {
    if (!route) return
    setLoading(true)
    setSelectedSeq(null)
    setActionMenu(null)
    setAltStopArrivals({})
    setError(null)

    if (operator === 'KMB') {
      const kmbBound = bound ?? 'O'
      Promise.all([getRouteStops(route, kmbBound), getStops()])
        .then(([stops, stopList]) => {
          setKmbRouteStops(stops)
          setAllStops(stopList)
          setStopPoints(
            stops.map((rs) => ({
              seq: parseInt(rs.seq),
              stopId: rs.stop,
              nameTc: stopList.find((s) => s.stop === rs.stop)?.name_tc ?? rs.stop,
              nameSc: stopList.find((s) => s.stop === rs.stop)?.name_sc,
              nameEn: stopList.find((s) => s.stop === rs.stop)?.name_en,
              lat: parseFloat(stopList.find((s) => s.stop === rs.stop)?.lat ?? ''),
              lng: parseFloat(stopList.find((s) => s.stop === rs.stop)?.long ?? ''),
            })),
          )
          if (highlightStopId) {
            const match = stops.find((rs) => rs.stop === highlightStopId)
            if (match) setSelectedSeq(parseInt(match.seq))
          }
        })
        .catch(() => setError(t('loadRouteError')))
        .finally(() => setLoading(false))
      return
    }

    if (operator === 'CTB') {
      const ctbBound = bound ?? 'O'
      getCtbRouteStopPoints(route, ctbBound)
        .then((points) => {
          setStopPoints(points)
          setDestTitle(destFromQuery)
          if (highlightStopId) {
            const match = points.find((p) => p.stopId === highlightStopId)
            if (match) setSelectedSeq(match.seq)
          }
        })
        .catch(() => setError(t('loadCtbError')))
        .finally(() => setLoading(false))
      return
    }

    if (operator === 'GMB' && gmbRouteId && gmbRouteSeq) {
      getGmbRouteStopPoints(gmbRouteId, gmbRouteSeq)
        .then((points) => {
          setStopPoints(points)
          setDestTitle(destFromQuery)
          if (highlightStopId) {
            const match = points.find((p) => p.stopId === highlightStopId)
            if (match) setSelectedSeq(match.seq)
          }
        })
        .catch(() => setError(t('loadGmbError')))
        .finally(() => setLoading(false))
    }
  }, [route, bound, operator, highlightStopId, gmbRouteId, gmbRouteSeq, destFromQuery, t])

  useEffect(() => {
    const onResize = () => {
      const scrollTop = scrollRef.current?.scrollTop ?? 0
      setMapHeight(mapHeightForScroll(scrollTop))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setMapHeight(getRouteMapHeightMax())
  }, [route, bound, operator, gmbRouteId, gmbRouteSeq])

  const handleTimelineScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setMapHeight(mapHeightForScroll(event.currentTarget.scrollTop))
  }, [])

  useEffect(() => {
    if (!selectedSeq || loading) return
    const el = scrollRef.current?.querySelector('.timeline-stop--selected')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedSeq, loading])

  const stopMap = useMemo(() => {
    const map = new Map<string, KmbStop>()
    for (const s of allStops) map.set(s.stop, s)
    return map
  }, [allStops])

  const coordinates: LatLngExpression[] = useMemo(() => {
    return stopPoints
      .filter((p) => p.lat != null && p.lng != null && !Number.isNaN(p.lat) && !Number.isNaN(p.lng))
      .map((p) => [p.lat!, p.lng!] as LatLngExpression)
  }, [stopPoints])

  const fetchRouteEta = useCallback(async () => {
    if (!route || operator !== 'KMB') return []
    return getRouteEta(route)
  }, [route, operator])

  const { data: routeEtas, loading: etaLoading, error: etaError } = useEtaPolling(
    fetchRouteEta,
    30000,
    operator === 'KMB' && !!route,
  )

  const etaBySeq = useMemo(() => {
    const map = new Map<number, KmbRouteEta[]>()
    if (!routeEtas || operator !== 'KMB') return map
    const kmbBound = bound ?? 'O'
    for (const eta of routeEtas) {
      if (eta.dir !== kmbBound) continue
      if (!map.has(eta.seq)) map.set(eta.seq, [])
      map.get(eta.seq)!.push(eta)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.eta_seq - b.eta_seq)
    }
    return map
  }, [routeEtas, bound, operator])

  useEffect(() => {
    if (!selectedSeq || !route) return

    if (operator === 'CTB' && bound) {
      const point = stopPoints.find((p) => p.seq === selectedSeq)
      if (!point) return
      getCtbStopArrivals(point.stopId, route, bound, 3, settings.locale, t)
        .then((arrivals) => {
          setAltStopArrivals((prev) => ({ ...prev, [selectedSeq]: arrivals }))
        })
        .catch(() => {
          setAltStopArrivals((prev) => ({ ...prev, [selectedSeq]: [] }))
        })
      return
    }

    if (operator === 'GMB' && gmbRouteId && gmbRouteSeq) {
      getGmbStopArrivals(gmbRouteId, gmbRouteSeq, selectedSeq, 3, settings.locale, t)
        .then((arrivals) => {
          setAltStopArrivals((prev) => ({ ...prev, [selectedSeq]: arrivals }))
        })
        .catch(() => {
          setAltStopArrivals((prev) => ({ ...prev, [selectedSeq]: [] }))
        })
    }
  }, [selectedSeq, route, operator, bound, stopPoints, gmbRouteId, gmbRouteSeq, settings.locale, t])

  const getStopArrivals = (seq: number) => {
    if (operator === 'KMB') {
      const etas = etaBySeq.get(seq)
      if (!etas) return []
      return getEtaArrivals(etas, 3, settings.locale, t)
    }
    return altStopArrivals[seq] ?? []
  }

  const handleStopAction = (seq: number) => {
    setSelectedSeq(seq)
    setActionMenu(seq)
  }

  const handleFavorite = (point: RouteStopPoint) => {
    if (!route) return

    if (operator === 'KMB') {
      const rs = kmbRouteStops.find((s) => parseInt(s.seq) === point.seq)
      const stop = stopMap.get(point.stopId)
      if (!rs || !stop) return
      const etas = etaBySeq.get(point.seq)
      toggleFavorite({
        operator: 'KMB',
        route,
        direction: bound ?? 'O',
        serviceType: rs.service_type,
        stopId: point.stopId,
        stopName: stop.name_tc,
        stopNameSc: stop.name_sc,
        stopNameEn: stop.name_en,
        destTc: etas?.[0]?.dest_tc ?? destTitle,
        destSc: etas?.[0]?.dest_sc,
        destEn: etas?.[0]?.dest_en,
      })
    } else if (operator === 'CTB') {
      toggleFavorite({
        operator: 'CTB',
        route,
        direction: bound ?? 'O',
        stopId: point.stopId,
        stopName: point.nameTc,
        stopNameSc: point.nameSc,
        stopNameEn: point.nameEn,
        destTc: destFromQuery || destTitle,
        destSc: destScFromQuery,
        destEn: destEnFromQuery,
      })
    } else if (operator === 'GMB' && gmbRouteId && gmbRouteSeq) {
      toggleFavorite({
        operator: 'GMB',
        route,
        direction: String(gmbRouteSeq),
        routeId: gmbRouteId,
        routeSeq: gmbRouteSeq,
        stopSeq: point.seq,
        stopId: point.stopId,
        stopName: point.nameTc,
        stopNameSc: point.nameSc,
        stopNameEn: point.nameEn,
        destTc: destFromQuery || destTitle,
        destSc: destScFromQuery,
        destEn: destEnFromQuery,
        region: (searchParams.get('region') as import('../types/transport').GmbRegion) ?? undefined,
      })
    }
    setActionMenu(null)
  }

  const handlePinFavorite = (point: RouteStopPoint) => {
    if (!route) return
    if (operator === 'KMB') {
      const rs = kmbRouteStops.find((s) => parseInt(s.seq) === point.seq)
      const stop = stopMap.get(point.stopId)
      if (!rs || !stop) return
      const etas = etaBySeq.get(point.seq)
      upsertFavoriteToTop({
        operator: 'KMB',
        route,
        direction: bound ?? 'O',
        serviceType: rs.service_type,
        stopId: point.stopId,
        stopName: stop.name_tc,
        stopNameSc: stop.name_sc,
        stopNameEn: stop.name_en,
        destTc: etas?.[0]?.dest_tc ?? destTitle,
        destSc: etas?.[0]?.dest_sc,
        destEn: etas?.[0]?.dest_en,
      })
    } else if (operator === 'CTB') {
      upsertFavoriteToTop({
        operator: 'CTB',
        route,
        direction: bound ?? 'O',
        stopId: point.stopId,
        stopName: point.nameTc,
        stopNameSc: point.nameSc,
        stopNameEn: point.nameEn,
        destTc: destFromQuery || destTitle,
        destSc: destScFromQuery,
        destEn: destEnFromQuery,
      })
    } else if (operator === 'GMB' && gmbRouteId && gmbRouteSeq) {
      upsertFavoriteToTop({
        operator: 'GMB',
        route,
        direction: String(gmbRouteSeq),
        routeId: gmbRouteId,
        routeSeq: gmbRouteSeq,
        stopSeq: point.seq,
        stopId: point.stopId,
        stopName: point.nameTc,
        stopNameSc: point.nameSc,
        stopNameEn: point.nameEn,
        destTc: destFromQuery || destTitle,
        destSc: destScFromQuery,
        destEn: destEnFromQuery,
        region: (searchParams.get('region') as import('../types/transport').GmbRegion) ?? undefined,
      })
    }
    setActionMenu(null)
  }

  const handleWalk = (point: RouteStopPoint) => {
    if (point.lat == null || point.lng == null) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`
    window.open(url, '_blank')
    setActionMenu(null)
  }

  const etaEntry = routeEtas?.find((e) => e.dir === (bound ?? 'O'))
  const titleDest =
    operator === 'KMB'
      ? pickLocalizedText(
          settings.locale,
          etaEntry?.dest_tc ?? destTitle,
          etaEntry?.dest_sc,
          etaEntry?.dest_en,
        )
      : pickLocalizedText(
          settings.locale,
          destFromQuery || destTitle,
          destScFromQuery,
          destEnFromQuery,
        )

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => setHeaderHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [titleDest, error, loading, route])

  if (!route) {
    navigate('/search')
    return null
  }

  const timelineStops: RouteStopPoint[] =
    operator === 'KMB'
      ? kmbRouteStops.map((rs) => {
          const stop = stopMap.get(rs.stop)
          return {
            seq: parseInt(rs.seq),
            stopId: rs.stop,
            nameTc: stop?.name_tc ?? rs.stop,
            nameSc: stop?.name_sc,
            nameEn: stop?.name_en,
            lat: stop ? parseFloat(stop.lat) : undefined,
            lng: stop ? parseFloat(stop.long) : undefined,
          }
        })
      : stopPoints

  const checkFavorited = (point: RouteStopPoint) => {
    if (operator === 'GMB') {
      return isFavorite({
        operator: 'GMB',
        route,
        direction: String(gmbRouteSeq),
        stopId: point.stopId,
        routeId: gmbRouteId,
        routeSeq: gmbRouteSeq,
      })
    }
    return isFavorite({
      operator,
      route,
      direction: bound ?? 'O',
      stopId: point.stopId,
    })
  }

  return (
    <div className="app-layout app-layout--no-nav route-detail">
      <div ref={headerRef} className="route-detail__header">
        <button className="route-detail__back btn-touch" onClick={() => navigate(-1)}>
          ← {t('back')}
        </button>
        <h1 className="route-detail__title">
          <span className="route-number">{route}</span>
          {titleDest ? ` ${t('towards', { dest: titleDest })}` : ''}
        </h1>
      </div>

      <main
        ref={scrollRef}
        className="route-detail__scroll"
        style={{ paddingTop: headerHeight }}
        onScroll={handleTimelineScroll}
      >
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-spinner">{t('loadingRoutes')}</div>
        ) : (
          <>
            <RouteMap
              coordinates={coordinates}
              stops={timelineStops}
              selectedSeq={selectedSeq}
              height={mapHeight}
            />

            <div className="route-timeline">
              <h2 className="route-timeline__heading">{t('stopList')}</h2>
              {operator === 'KMB' && etaError && (
                <div className="error-message">{etaError}</div>
              )}
              {operator === 'KMB' && etaLoading && !routeEtas && (
                <div className="loading-spinner">{t('loadingEta')}</div>
              )}
              <ol className="route-timeline__list">
              {timelineStops.map((point) => {
                const seq = point.seq
                const arrivals = getStopArrivals(seq)
                const firstArrival = arrivals[0]
                const favorited = checkFavorited(point)
                const isSelected = selectedSeq === seq
                const showMenu = actionMenu === seq

                return (
                  <li
                    key={`${seq}-${point.stopId}`}
                    className={`timeline-stop${isSelected ? ' timeline-stop--selected' : ''}`}
                  >
                    <button
                      className="timeline-stop__btn"
                      onClick={() => handleStopAction(seq)}
                    >
                      <span className="timeline-stop__seq">{seq}</span>
                      <span className="timeline-stop__name">
                        {localizedStopName(
                          settings.locale,
                          point.nameTc,
                          point.nameSc,
                          point.nameEn,
                        )}
                        {favorited && ' ★'}
                      </span>
                      {firstArrival && !isSelected && (operator === 'KMB' || firstArrival.statusText) && (
                        <span
                          className={`${firstArrival.eta ? 'eta-number' : 'eta-row__eta-sub'} timeline-stop__eta${firstArrival.statusText ? ' timeline-stop__eta--status' : ''}`}
                        >
                          {formatArrivalTime(firstArrival, settings.etaDisplayMode, t)}
                        </span>
                      )}
                    </button>

                    {isSelected && arrivals.length > 0 && (
                      <div className="timeline-stop__etas">
                        <EtaArrivalList
                          arrivals={arrivals}
                          displayMode={settings.etaDisplayMode}
                          variant="detail"
                        />
                      </div>
                    )}

                    {showMenu && (
                      <div className="timeline-stop__menu">
                        <button onClick={() => handleFavorite(point)}>
                          {favorited ? t('unfavoriteStop') : t('favoriteStop')}
                        </button>
                        <button onClick={() => handlePinFavorite(point)}>{t('pinFavorite')}</button>
                        {point.lat != null && point.lng != null && (
                          <button onClick={() => handleWalk(point)}>{t('walkToStop')}</button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
