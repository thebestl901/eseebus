import { useCallback, useEffect, useRef, useState } from 'react'

export function useEtaPolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 30000,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const result = await fetcherRef.current()
      setData(result)
    } catch {
      setError('暫時無法取得到站時間，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs, enabled])

  return { data, loading, error, refresh }
}
