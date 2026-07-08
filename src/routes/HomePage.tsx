import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { EtaRow } from '../components/EtaRow'
import { useSettings } from '../hooks/useSettings'
import { favoriteRoutePath, useFavorites } from '../hooks/useFavorites'
import { useEtaPolling } from '../hooks/useEtaPolling'
import { getFavoriteEta } from '../services/etaService'
import type { EtaArrival, FavoriteStop } from '../types/kmb'
import { useFavoriteDisplayMap } from '../hooks/useFavoriteDisplay'
import { useTranslation } from '../i18n/I18nContext'

function useFavoriteEtas(
  favorites: FavoriteStop[],
  locale: ReturnType<typeof useSettings>['settings']['locale'],
  t: ReturnType<typeof useTranslation>['t'],
) {
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
    return results
  }, [favorites, locale, t])

  return useEtaPolling(fetchAll, 30000, favorites.length > 0)
}

export function HomePage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()
  const { favorites, removeFavorite, moveFavoriteToTop, moveFavoriteUp, moveFavoriteDown } =
    useFavorites()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: etaMap, loading, error } = useFavoriteEtas(favorites, settings.locale, t)
  const displayMap = useFavoriteDisplayMap(favorites, settings.locale)

  return (
    <div className="app-layout">
      <Header
        title={t('favorites')}
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
            )})}
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
