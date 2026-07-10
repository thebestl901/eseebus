import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AppSettings } from '../types/kmb'
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
} from '../types/kmb'
import { resolveThemeVars } from '../utils/themeColors'
import { applyAppIcon } from '../utils/appIcon'
import type { AppLocale } from '../i18n/types'
import { DEFAULT_LOCALE, localeToHtmlLang } from '../i18n/types'

const STORAGE_KEY = 'settings'

const LEGACY_FONT_SIZE_PX: Record<string, number> = {
  standard: 16,
  large: 18,
  xlarge: 21,
}

const LEGACY_BG_COLORS: Record<string, string> = {
  white: '#ffffff',
  cream: '#faf6f0',
  lightgray: '#f0f0f0',
}

const LEGACY_ACCENT_COLORS: Record<string, string> = {
  'kmb-red': '#E60012',
  'dark-red': '#B8000E',
  blue: '#0066CC',
  green: '#00875A',
}

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'zh-TW' || value === 'en' || value === 'zh-CN'
}

function clampFontSize(px: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(px)))
}

export function normalizeSettingsForImport(raw: Record<string, unknown>): AppSettings {
  return normalizeSettings(raw)
}

function normalizeSettings(raw: Record<string, unknown>): AppSettings {
  const contrastMode =
    raw.contrastMode === 'high' || raw.contrastMode === 'normal'
      ? raw.contrastMode
      : DEFAULT_SETTINGS.contrastMode

  const locale = isAppLocale(raw.locale) ? raw.locale : DEFAULT_LOCALE

  if (typeof raw.fontSizePx === 'number') {
    const etaDisplayMode =
      raw.etaDisplayMode === 'clock' || raw.etaDisplayMode === 'minutes'
        ? raw.etaDisplayMode
        : DEFAULT_SETTINGS.etaDisplayMode
    const clockFormat =
      raw.clockFormat === '12h' || raw.clockFormat === '24h'
        ? raw.clockFormat
        : DEFAULT_SETTINGS.clockFormat
    const textColor: string | null =
      raw.textColor === null
        ? null
        : typeof raw.textColor === 'string'
          ? raw.textColor
          : DEFAULT_SETTINGS.textColor
    const appIconMode =
      raw.appIconMode === 'kmb' || raw.appIconMode === 'default'
        ? raw.appIconMode
        : DEFAULT_SETTINGS.appIconMode
    return {
      fontSizePx: clampFontSize(raw.fontSizePx),
      bgColor: typeof raw.bgColor === 'string' ? raw.bgColor : DEFAULT_SETTINGS.bgColor,
      accentColor:
        typeof raw.accentColor === 'string' ? raw.accentColor : DEFAULT_SETTINGS.accentColor,
      textColor,
      contrastMode,
      etaDisplayMode,
      clockFormat,
      appIconMode,
      locale,
    }
  }

  const legacyFont = typeof raw.fontSize === 'string' ? raw.fontSize : 'standard'
  const legacyBg = typeof raw.bgColor === 'string' ? raw.bgColor : 'white'
  const legacyAccent = typeof raw.accentColor === 'string' ? raw.accentColor : 'kmb-red'

  return {
    fontSizePx: LEGACY_FONT_SIZE_PX[legacyFont] ?? DEFAULT_SETTINGS.fontSizePx,
    bgColor: LEGACY_BG_COLORS[legacyBg] ?? legacyBg,
    accentColor: LEGACY_ACCENT_COLORS[legacyAccent] ?? legacyAccent,
    textColor: DEFAULT_SETTINGS.textColor,
    contrastMode,
    etaDisplayMode: DEFAULT_SETTINGS.etaDisplayMode,
    clockFormat: DEFAULT_SETTINGS.clockFormat,
    appIconMode: DEFAULT_SETTINGS.appIconMode,
    locale,
  }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeSettings(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

function applySettings(settings: AppSettings) {
  const root = document.documentElement
  const theme = resolveThemeVars(
    settings.bgColor,
    settings.accentColor,
    settings.textColor,
    settings.contrastMode === 'high',
  )

  root.style.setProperty('--font-scale', String(settings.fontSizePx / 16))
  root.style.setProperty('--bg-primary', settings.bgColor)
  root.style.setProperty('--bg-secondary', theme.bgSecondary)
  root.style.setProperty('--accent-color', settings.accentColor)
  root.style.setProperty('--eta-color', settings.accentColor)
  root.style.setProperty('--text-primary', theme.textPrimary)
  root.style.setProperty('--text-secondary', theme.textSecondary)
  root.style.setProperty('--border-color', theme.borderColor)
  root.dataset.contrast = settings.contrastMode
  root.dataset.theme = theme.isDark ? 'dark' : 'light'
  root.dataset.accentRed = theme.isRedAccent ? 'true' : 'false'
  root.lang = localeToHtmlLang(settings.locale)
  applyAppIcon(settings.appIconMode)
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function useSettingsState(): SettingsContextValue {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    applySettings(settings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial }
      if (partial.fontSizePx !== undefined) {
        next.fontSizePx = clampFontSize(partial.fontSizePx)
      }
      return next
    })
  }, [])

  return { settings, updateSettings }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const value = useSettingsState()
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export function resetOnboarding() {
  localStorage.removeItem('hasSeenOnboarding')
}

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem('hasSeenOnboarding') === 'true'
}

export function markOnboardingSeen() {
  localStorage.setItem('hasSeenOnboarding', 'true')
}

export function applySettingsOnLoad() {
  applySettings(loadSettings())
}
