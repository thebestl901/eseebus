import { useState } from 'react'
import type { EtaArrival, EtaDisplayMode, FavoriteStop } from '../types/kmb'
import { searchResultLabel } from '../utils/helpers'
import { EtaArrivalList } from './EtaArrivalList'
import { useTranslation } from '../i18n/I18nContext'

interface EtaRowProps {
  favorite: FavoriteStop
  displayStop?: string
  displayDest?: string
  arrivals?: EtaArrival[]
  displayMode?: EtaDisplayMode
  loading?: boolean
  onOpen?: (favorite: FavoriteStop) => void
  onRemove?: (id: string) => void
  onPin?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
}

export function EtaRow({
  favorite,
  displayStop,
  displayDest,
  arrivals = [],
  displayMode = 'minutes',
  loading,
  onOpen,
  onRemove,
  onPin,
  onMoveUp,
  onMoveDown,
}: EtaRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const operator = favorite.operator ?? 'KMB'
  const stopLabel = displayStop ?? favorite.stopName
  const destLabel = displayDest ?? favorite.destTc
  const etaBlock = (
    <EtaArrivalList
      arrivals={arrivals}
      displayMode={displayMode}
      loading={loading}
      variant="compact"
      showRemarks
    />
  )

  return (
    <div className="eta-row">
      {onOpen ? (
        <button
          type="button"
          className="eta-row__open btn-touch"
          onClick={() => onOpen(favorite)}
          aria-label={t('viewRouteStops', { route: favorite.route })}
        >
          <div className="eta-row__main">
            <div className="eta-row__route">
              <span className="route-number">{favorite.route}</span>
              <span className="eta-row__dest">
                {searchResultLabel(destLabel, operator, t)}
              </span>
            </div>
            <div className="eta-row__stop">{stopLabel}</div>
          </div>
          <div className="eta-row__right">
            {menuOpen ? (
              <div className="eta-row__tools" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="eta-row__tool-btn eta-row__tool-btn--close"
                  aria-label={t('closeActionMenu')}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                  }}
                >
                  🔧
                </button>
                {onRemove && (
                  <button
                    type="button"
                    className="eta-row__tool-btn"
                    aria-label={t('deleteFavorite')}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemove(favorite.id)
                      setMenuOpen(false)
                    }}
                  >
                    🗑️
                  </button>
                )}
                {onPin && (
                  <button
                    type="button"
                    className="eta-row__tool-btn"
                    aria-label={t('pinFavoriteAction')}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onPin(favorite.id)
                      setMenuOpen(false)
                    }}
                  >
                    🔝
                  </button>
                )}
                {onMoveUp && (
                  <button
                    type="button"
                    className="eta-row__tool-btn"
                    aria-label={t('moveFavoriteUp')}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onMoveUp(favorite.id)
                    }}
                  >
                    ↑
                  </button>
                )}
                {onMoveDown && (
                  <button
                    type="button"
                    className="eta-row__tool-btn"
                    aria-label={t('moveFavoriteDown')}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onMoveDown(favorite.id)
                    }}
                  >
                    ↓
                  </button>
                )}
              </div>
            ) : (
              <>
                {etaBlock}
                <button
                  type="button"
                  className="eta-row__menu-btn"
                  aria-label={t('favoriteActions')}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(true)
                  }}
                >
                  🔧
                </button>
                <span className="eta-row__chevron" aria-hidden="true">
                  ›
                </span>
              </>
            )}
          </div>
        </button>
      ) : (
        <>
          <div className="eta-row__main">
            <div className="eta-row__route">
              <span className="route-number">{favorite.route}</span>
              <span className="eta-row__dest">
                {searchResultLabel(destLabel, operator, t)}
              </span>
            </div>
            <div className="eta-row__stop">{stopLabel}</div>
          </div>
          <div className="eta-row__right">{etaBlock}</div>
        </>
      )}
    </div>
  )
}
