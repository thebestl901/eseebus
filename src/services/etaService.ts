import { getStopEta, getRouteEta, getRouteStops } from './kmbApi'
import { getCtbStopEta, ctbEtaToEntries } from './citybusApi'
import { getGmbStopEta, gmbEtaToEntries } from './gmbApi'
import type { EtaArrival, FavoriteStop, KmbStopEta } from '../types/kmb'
import type { StopEtaEntry } from '../types/transport'
import { getEtaArrivals, type TranslateFn } from '../utils/helpers'
import type { AppLocale } from '../i18n/types'

function entriesToArrivals(
  entries: StopEtaEntry[],
  max: number,
  locale: AppLocale,
  t: TranslateFn,
): EtaArrival[] {
  const pseudo: KmbStopEta[] = entries.map((e) => ({
    co: '',
    route: '',
    dir: 'O',
    service_type: 1,
    seq: 1,
    dest_tc: '',
    dest_sc: '',
    dest_en: '',
    eta_seq: e.eta_seq,
    eta: e.eta,
    rmk_tc: e.rmk_tc,
    rmk_sc: e.rmk_tc,
    rmk_en: e.rmk_tc,
    data_timestamp: '',
  }))
  return getEtaArrivals(pseudo, max, locale, t)
}

function noEta(t: TranslateFn): EtaArrival[] {
  return [
    {
      minutes: 999,
      eta: '',
      remarkType: 'scheduled',
      remarkLabel: '',
      statusText: t('noService'),
    },
  ]
}

async function getKmbFavoriteEta(
  fav: FavoriteStop,
  max: number,
  locale: AppLocale,
  t: TranslateFn,
): Promise<EtaArrival[]> {
  const bound = fav.direction as 'O' | 'I'
  const serviceType = fav.serviceType ?? '1'

  const stopEtas = await getStopEta(fav.stopId)
  let filtered = stopEtas.filter(
    (e) =>
      e.route === fav.route &&
      e.dir === bound &&
      String(e.service_type) === serviceType,
  )

  if (filtered.length === 0) {
    const [routeEtas, routeStops] = await Promise.all([
      getRouteEta(fav.route, serviceType),
      getRouteStops(fav.route, bound, serviceType),
    ])
    const rs = routeStops.find((s) => s.stop === fav.stopId)
    if (rs) {
      const seq = parseInt(rs.seq)
      filtered = routeEtas.filter((e) => e.dir === bound && e.seq === seq)
    }
  }

  const arrivals = getEtaArrivals(filtered, max, locale, t)
  return arrivals.length > 0 ? arrivals : noEta(t)
}

export async function getFavoriteEta(
  fav: FavoriteStop,
  max = 2,
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): Promise<EtaArrival[]> {
  const tr: TranslateFn = t ?? ((key) => key)
  const operator = fav.operator ?? 'KMB'

  if (operator === 'KMB') {
    return getKmbFavoriteEta(fav, max, locale, tr)
  }

  if (operator === 'CTB') {
    const bound = fav.direction as 'O' | 'I'
    const etas = await getCtbStopEta(fav.stopId, fav.route)
    const arrivals = entriesToArrivals(ctbEtaToEntries(etas, bound), max, locale, tr)
    return arrivals.length > 0 ? arrivals : noEta(tr)
  }

  if (operator === 'GMB') {
    if (!fav.routeId || !fav.routeSeq || !fav.stopSeq) return noEta(tr)
    const etas = await getGmbStopEta(fav.routeId, fav.routeSeq, fav.stopSeq)
    const arrivals = entriesToArrivals(gmbEtaToEntries(etas), max, locale, tr)
    return arrivals.length > 0 ? arrivals : noEta(tr)
  }

  return noEta(tr)
}

export async function getCtbStopArrivals(
  stopId: string,
  route: string,
  bound: 'O' | 'I',
  max = 3,
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): Promise<EtaArrival[]> {
  const tr: TranslateFn = t ?? ((key) => key)
  const etas = await getCtbStopEta(stopId, route)
  const arrivals = entriesToArrivals(ctbEtaToEntries(etas, bound), max, locale, tr)
  return arrivals.length > 0 ? arrivals : noEta(tr)
}

export async function getGmbStopArrivals(
  routeId: number,
  routeSeq: number,
  stopSeq: number,
  max = 3,
  locale: AppLocale = 'zh-TW',
  t?: TranslateFn,
): Promise<EtaArrival[]> {
  const tr: TranslateFn = t ?? ((key) => key)
  const etas = await getGmbStopEta(routeId, routeSeq, stopSeq)
  const arrivals = entriesToArrivals(gmbEtaToEntries(etas), max, locale, tr)
  return arrivals.length > 0 ? arrivals : noEta(tr)
}
