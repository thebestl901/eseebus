export type AppLocale = 'zh-TW' | 'en' | 'zh-CN'

export const DEFAULT_LOCALE: AppLocale = 'zh-TW'

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

export function localeToHtmlLang(locale: AppLocale): string {
  if (locale === 'zh-CN') return 'zh-Hans'
  if (locale === 'zh-TW') return 'zh-Hant'
  return 'en'
}

export function pickLocalizedText(
  locale: AppLocale,
  tc: string,
  sc?: string,
  en?: string,
): string {
  if (locale === 'en') return en || tc
  if (locale === 'zh-CN') return sc || tc
  return tc
}
