import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { BottomNav } from '../components/BottomNav'
import { RouteKeypad } from '../components/RouteKeypad'
import {
  filterStaticSearchItems,
  getAllRouteNames,
  loadTransportSearchIndex,
  mergeSearchResults,
  routeDetailPath,
  searchGmbItems,
  searchResultKey,
  type TransportSearchIndex,
} from '../services/transportSearch'
import { ROUTE_CATALOG_UPDATED_EVENT } from '../services/routeCatalog'
import type { RouteSearchItem } from '../types/transport'
import { getValidRouteKeypresses, collectRouteLetters, searchResultLabel, searchItemDest } from '../utils/helpers'
import { useTranslation } from '../i18n/I18nContext'
import { useSettings } from '../hooks/useSettings'
import { translate } from '../i18n/translations'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<TransportSearchIndex | null>(null)
  const [gmbResults, setGmbResults] = useState<RouteSearchItem[]>([])
  const [gmbLoading, setGmbLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { settings } = useSettings()

  useEffect(() => {
    let cancelled = false
    const load = () => {
      setLoading(true)
      setError(null)
      loadTransportSearchIndex()
        .then((data) => {
          if (!cancelled) setIndex(data)
        })
        .catch(() => {
          if (!cancelled) setError(translate(settings.locale, 'loadRoutesError'))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()

    const onCatalogUpdated = () => load()
    window.addEventListener(ROUTE_CATALOG_UPDATED_EVENT, onCatalogUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(ROUTE_CATALOG_UPDATED_EVENT, onCatalogUpdated)
    }
  }, [settings.locale])

  useEffect(() => {
    if (!index || !query.trim()) {
      setGmbResults([])
      return
    }

    let cancelled = false
    setGmbLoading(true)
    const timer = setTimeout(() => {
      searchGmbItems(index.gmbCodes, query)
        .then((items) => {
          if (!cancelled) setGmbResults(items)
        })
        .catch(() => {
          if (!cancelled) setGmbResults([])
        })
        .finally(() => {
          if (!cancelled) setGmbLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, index])

  const results = useMemo(() => {
    if (!index || !query.trim()) return []
    const kmb = filterStaticSearchItems(index.kmb, query)
    const ctb = filterStaticSearchItems(index.ctb, query)
    return mergeSearchResults(kmb, ctb, gmbResults)
  }, [query, index, gmbResults])

  const routeNames = useMemo(() => (index ? getAllRouteNames(index) : []), [index])

  const suffixKeys = useMemo(() => collectRouteLetters(routeNames), [routeNames])

  const validKeys = useMemo(() => {
    if (loading || !index) return null
    return getValidRouteKeypresses(query, routeNames)
  }, [query, routeNames, loading, index])

  const handleSelect = (item: RouteSearchItem) => {
    navigate(routeDetailPath(item))
  }

  return (
    <div className="app-layout search-page">
      <Header title={t('navSearch')} />

      <main className="page-content page-content--with-header search-page__content">
        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <div className="loading-spinner">{t('loadingRoutes')}</div>
        ) : (
          <ul className="search-results" aria-label={t('searchResults')}>
            {query && results.length === 0 && !gmbLoading && (
              <li className="search-results__empty">{t('noRouteFound', { query })}</li>
            )}
            {gmbLoading && query && results.length === 0 && (
              <li className="search-results__empty">{t('searchingGmb')}</li>
            )}
            {results.map((item) => (
              <li key={searchResultKey(item)}>
                <button className="search-result-item" onClick={() => handleSelect(item)}>
                  <span className="route-number">{item.route}</span>
                  <span className="search-result-item__dest">
                    {searchResultLabel(
                      searchItemDest(item, settings.locale),
                      item.operator,
                      t,
                    )}
                  </span>
                  <span className="search-result-item__chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <RouteKeypad value={query} onChange={setQuery} validKeys={validKeys} suffixKeys={suffixKeys} />
      <BottomNav />
    </div>
  )
}
