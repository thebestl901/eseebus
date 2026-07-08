import type { AppLocale } from '../i18n/types'
import { LOCALE_OPTIONS } from '../i18n/types'
import { useTranslation } from '../i18n/I18nContext'

interface LanguageSelectorProps {
  locale: AppLocale
  onChange: (locale: AppLocale) => void
  /** onboarding: label + select row; settings: icon + button group */
  variant?: 'onboarding' | 'settings'
}

export function LanguageSelector({
  locale,
  onChange,
  variant = 'onboarding',
}: LanguageSelectorProps) {
  const { t } = useTranslation()
  const currentLabel = LOCALE_OPTIONS.find((o) => o.value === locale)?.label ?? locale

  if (variant === 'settings') {
    return (
      <div className="settings-section">
        <h3>
          <span aria-hidden="true">🌐 </span>
          {t('languageLabel')}
        </h3>
        <div className="settings-options">
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`settings-option${locale === opt.value ? ' settings-option--active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="language-selector">
      <label className="language-selector__label" htmlFor="app-locale">
        Language：{currentLabel}
      </label>
      <select
        id="app-locale"
        className="language-selector__select"
        value={locale}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        aria-label="Language"
      >
        {LOCALE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
