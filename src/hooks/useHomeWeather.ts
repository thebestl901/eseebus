import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppLocale } from '../i18n/types'
import {
  buildWeatherDisplayItems,
  fetchHomeWeather,
} from '../services/hkoWeatherApi'
import type { HomeWeatherData } from '../types/weather'
import { useOnlineStatus } from './useOnlineStatus'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useHomeWeather(locale: AppLocale) {
  const isOnline = useOnlineStatus()
  const [data, setData] = useState<HomeWeatherData | null>(null)

  const refresh = useCallback(async () => {
    if (!isOnline) return
    try {
      const next = await fetchHomeWeather(locale)
      setData(next)
    } catch {
      /* keep last known data */
    }
  }, [isOnline, locale])

  useEffect(() => {
    if (!isOnline) return
    refresh()
    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isOnline, refresh])

  const displayItems = useMemo(() => buildWeatherDisplayItems(data), [data])

  return { displayItems }
}
