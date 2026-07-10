import type { AppLocale } from '../i18n/types'
import type { EtaArrival } from '../types/kmb'
import type { TranslateFn } from '../utils/helpers'

const API_BASE = '/api/mtr-bus'

export interface MtrBusLocation {
  latitude: number
  longitude: number
}

export interface MtrBus {
  arrivalTimeInSecond: string
  arrivalTimeText: string
  busId: string
  busLocation: MtrBusLocation
  busRemark: string | null
  departureTimeInSecond: string
  departureTimeText: string
  isDelayed: string
  isScheduled: string
  lineRef: string
}

export interface MtrBusStopSchedule {
  bus: MtrBus[]
  busStopId: string
  isSuspended: string
}

export interface MtrScheduleResponse {
  appRefreshTimeInSecond: string
  busStop: MtrBusStopSchedule[]
  routeName: string
  routeStatusRemarkContent?: string | null
  routeStatusRemarkTitle?: string | null
}

function mtrLang(locale: AppLocale): 'zh' | 'en' {
  return locale === 'en' ? 'en' : 'zh'
}

export async function getMtrSchedule(
  routeName: string,
  locale: AppLocale = 'zh-TW',
): Promise<MtrScheduleResponse> {
  const res = await fetch(`${API_BASE}/getSchedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: mtrLang(locale),
      routeName,
    }),
  })
  if (!res.ok) throw new Error(`港鐵巴士 API 錯誤 (${res.status})`)
  return res.json() as Promise<MtrScheduleResponse>
}

function parseMinutesFromText(text: string): number | null {
  const en = text.match(/(\d+)\s*minutes?/i)
  if (en) return Number(en[1])
  const zh = text.match(/(\d+)\s*分/)
  if (zh) return Number(zh[1])
  return null
}

function isImminentText(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('arriving') ||
    lower.includes('departed') ||
    lower.includes('departing') ||
    text.includes('即將') ||
    text.includes('已離開') ||
    text.includes('已開出')
  )
}

export function mtrBusesToArrivals(
  buses: MtrBus[],
  max: number,
  t: TranslateFn,
): EtaArrival[] {
  const arrivals: EtaArrival[] = []

  for (const bus of buses.slice(0, max)) {
    const text = bus.arrivalTimeText || bus.departureTimeText || ''
    const seconds = Number(bus.arrivalTimeInSecond)
    const scheduled = bus.isScheduled === '1'

    if (Number.isFinite(seconds) && seconds >= 0 && seconds < 86400) {
      const minutes = Math.max(0, Math.round(seconds / 60))
      arrivals.push({
        minutes,
        eta: new Date(Date.now() + seconds * 1000).toISOString(),
        remarkType: scheduled ? 'scheduled' : 'scheduled',
        remarkLabel: scheduled ? t('scheduledBus') : '',
      })
      continue
    }

    const parsedMinutes = parseMinutesFromText(text)
    if (parsedMinutes != null) {
      arrivals.push({
        minutes: parsedMinutes,
        eta: new Date(Date.now() + parsedMinutes * 60_000).toISOString(),
        remarkType: scheduled ? 'scheduled' : 'scheduled',
        remarkLabel: scheduled ? t('scheduledBus') : '',
      })
      continue
    }

    if (text || isImminentText(text)) {
      arrivals.push({
        minutes: isImminentText(text) ? 0 : 999,
        eta: '',
        remarkType: 'scheduled',
        remarkLabel: scheduled ? t('scheduledBus') : '',
        statusText: text || t('noService'),
      })
    }
  }

  return arrivals
}

export function getMtrStopArrivalsFromSchedule(
  schedule: MtrScheduleResponse,
  stopId: string,
  lineRef: string,
  max = 3,
  t: TranslateFn,
): EtaArrival[] {
  const stop = schedule.busStop.find((item) => item.busStopId === stopId)
  if (!stop) return []

  const buses = stop.bus.filter((bus) => bus.lineRef === lineRef)
  const arrivals = mtrBusesToArrivals(buses, max, t)
  if (arrivals.length > 0) return arrivals

  if (schedule.routeStatusRemarkContent || schedule.routeStatusRemarkTitle) {
    return [
      {
        minutes: 999,
        eta: '',
        remarkType: 'scheduled',
        remarkLabel: '',
        statusText:
          schedule.routeStatusRemarkContent ||
          schedule.routeStatusRemarkTitle ||
          t('noService'),
      },
    ]
  }

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
