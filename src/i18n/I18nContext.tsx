import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSettings } from '../hooks/useSettings'
import { translate, type TranslationKey } from './translations'
import type { AppLocale } from './types'

interface I18nContextValue {
  locale: AppLocale
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const value = useMemo<I18nContextValue>(
    () => ({
      locale: settings.locale,
      t: (key, params) => translate(settings.locale, key, params),
    }),
    [settings.locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider')
  return ctx
}

export function useTranslationOptional(): I18nContextValue {
  const { settings } = useSettings()
  return useMemo(
    () => ({
      locale: settings.locale,
      t: (key, params) => translate(settings.locale, key, params),
    }),
    [settings.locale],
  )
}
