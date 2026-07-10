import type { EtaArrival, EtaDisplayMode } from '../types/kmb'
import { formatArrivalTime } from '../utils/helpers'
import { useTranslation } from '../i18n/I18nContext'
import { useSettings } from '../hooks/useSettings'

/** Home row: at most 2 timed buses, or one status line when no ETA. */
function compactArrivals(arrivals: EtaArrival[]): EtaArrival[] {
  const withTime = arrivals.filter((a) => a.eta)
  if (withTime.length > 0) {
    const unique: EtaArrival[] = []
    const seen = new Set<string>()
    for (const arrival of withTime) {
      const key = arrival.eta
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(arrival)
      if (unique.length >= 2) break
    }
    return unique
  }
  if (arrivals.length === 0) return []
  return [arrivals[0]]
}

interface EtaArrivalListProps {
  arrivals: EtaArrival[]
  displayMode: EtaDisplayMode
  loading?: boolean
  /** compact: home row; detail: route stop timeline */
  variant?: 'compact' | 'detail'
  showRemarks?: boolean
}

export function EtaArrivalList({
  arrivals,
  displayMode,
  loading,
  variant = 'compact',
  showRemarks = variant === 'detail',
}: EtaArrivalListProps) {
  const { t } = useTranslation()
  const { settings } = useSettings()

  if (loading) {
    return <span className="eta-row__loading">…</span>
  }
  if (arrivals.length === 0) {
    return <span className="eta-row__na">--</span>
  }

  if (variant === 'compact') {
    const shown = compactArrivals(arrivals)
    return (
      <div className="eta-row__etas">
        {shown.map((arrival, i) => (
          <div
            key={i}
            className={`eta-arrival-compact${i > 0 ? ' eta-arrival-compact--sub' : ''}${arrival.remarkType === 'last' || arrival.statusText?.includes('最後') || arrival.statusText?.includes('最后') ? ' eta-arrival-compact--last' : ''}`}
          >
            <span className={i === 0 && !arrival.eta ? 'eta-row__eta-sub' : i === 0 ? 'eta-number' : 'eta-row__eta-sub'}>
              {formatArrivalTime(
                arrival,
                displayMode,
                t,
                settings.clockFormat,
                settings.locale,
              )}
            </span>
            {showRemarks && arrival.eta && (i > 0 || arrival.remarkType === 'last') && (
              <span
                className={`eta-remark${arrival.remarkType === 'last' ? ' eta-remark--last' : ' eta-remark--scheduled'}`}
              >
                {arrival.remarkLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="eta-arrival-detail-list">
      {arrivals.map((arrival, i) => (
        <li
          key={i}
          className={`eta-arrival-detail${arrival.remarkType === 'last' ? ' eta-arrival-detail--last' : ''}`}
        >
          <span className="eta-arrival-detail__time">
            {formatArrivalTime(
              arrival,
              displayMode,
              t,
              settings.clockFormat,
              settings.locale,
            )}
          </span>
          <span
            className={`eta-remark${arrival.remarkType === 'last' ? ' eta-remark--last' : ' eta-remark--scheduled'}`}
          >
            {arrival.remarkLabel}
          </span>
        </li>
      ))}
    </ul>
  )
}
