import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { HeaderWeather } from '../components/HeaderWeather'
import { BottomNav } from '../components/BottomNav'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { EtaRow } from '../components/EtaRow'
import { useSettings } from '../hooks/useSettings'
import { favoriteRoutePath, useFavorites } from '../hooks/useFavorites'
import { useEtaPolling } from '../hooks/useEtaPolling'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getFavoriteEta } from '../services/etaService'
import { formatCatalogUpdatedAt } from '../services/routeCatalog'
import {
  loadFavoriteEtaCache,
  saveFavoriteEtaCache,
} from '../stores/favoriteEtaCache'
import type { EtaArrival, FavoriteStop } from '../types/kmb'
import { useFavoriteDisplayMap } from '../hooks/useFavoriteDisplay'
import { useHomeWeather } from '../hooks/useHomeWeather'
import { useTranslation } from '../i18n/I18nContext'

function useFavoriteEtas(
  favorites: FavoriteStop[],
  locale: ReturnType<typeof useSettings>['settings']['locale'],
  t: ReturnType<typeof useTranslation>['t'],
  isOnline: boolean,
) {
  const [cached, setCached] = useState(() => loadFavoriteEtaCache())
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    () => loadFavoriteEtaCache()?.updatedAt ?? null,
  )

  const fetchAll = useCallback(async () => {
    const results: Record<string, EtaArrival[]> = {}
    await Promise.all(
      favorites.map(async (fav) => {
        try {
          results[fav.id] = await getFavoriteEta(fav, 2, locale, t)
        } catch {
          results[fav.id] = []
        }
      }),
    )

    const updatedAt = Date.now()
    const nextCache = { updatedAt, etas: results }
    saveFavoriteEtaCache(nextCache)
    setCached(nextCache)
    setLastRefreshAt(updatedAt)
    return results
  }, [favorites, locale, t])

  const { data, loading, error } = useEtaPolling(
    fetchAll,
    30000,
    favorites.length > 0 && isOnline,
  )

  useEffect(() => {
    if (isOnline) return
    const stored = loadFavoriteEtaCache()
    if (stored) {
      setCached(stored)
      setLastRefreshAt(stored.updatedAt)
    }
  }, [isOnline])

  const etaMap = useMemo(() => {
    if (isOnline) return data ?? cached?.etas ?? null
    return cached?.etas ?? data ?? null
  }, [cached, data, isOnline])

  const showFetchError = Boolean(error && isOnline && !etaMap)

  return {
    etaMap,
    loading: loading && !etaMap,
    error: showFetchError ? error : null,
    lastRefreshAt,
    isShowingCached: !isOnline && Boolean(cached),
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const { favorites, removeFavorite, moveFavoriteToTop, moveFavoriteUp, moveFavoriteDown } =
    useFavorites()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { etaMap, loading, error, lastRefreshAt } = useFavoriteEtas(
    favorites,
    settings.locale,
    t,
    isOnline,
  )
  const displayMap = useFavoriteDisplayMap(favorites, settings.locale)
  const { displayItems: weatherItems } = useHomeWeather(settings.locale)

  const headerTitle = !isOnline ? (
    <span className="header__title--offline">
      <span>
        {lastRefreshAt
          ? t('favoritesLastRefresh', {
              time: formatCatalogUpdatedAt(lastRefreshAt, settings.locale),
            })
          : t('favorites')}
      </span>
      <span className="header__offline-status">{t('noNetwork')}</span>
    </span>
  ) : (
    t('favorites')
  )

  return (
    <div className="app-layout">
      <Header
        title={headerTitle}
        leftAction={<HeaderWeather items={weatherItems} />}
        rightAction={
          <button
            className="header__gear btn-touch"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings')}
          >
            ⚙️
          </button>
        }
      />

      {error && <div className="error-message">{error}</div>}

      <main className="page-content page-content--with-header">
        {favorites.length === 0 ? (
          <div className="empty-state">
            {t('emptyFavorites')}
            <br />
            {t('emptyFavoritesHint')}
          </div>
        ) : (
          <div className="eta-list">
            {favorites.map((fav) => {
              const display = displayMap.get(fav.id)
              return (
                <EtaRow
                  key={fav.id}
                  favorite={fav}
                  displayStop={display?.stop}
                  displayDest={display?.dest}
                  arrivals={etaMap?.[fav.id] ?? []}
                  displayMode={settings.etaDisplayMode}
                  loading={loading && !etaMap}
                  onOpen={(item) => navigate(favoriteRoutePath(item))}
                  onRemove={removeFavorite}
                  onPin={moveFavoriteToTop}
                  onMoveUp={moveFavoriteUp}
                  onMoveDown={moveFavoriteDown}
                />
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        favorites={favorites}
        onUpdate={updateSettings}
      />
    </div>
  )
}
