import type { AppIconMode } from '../types/kmb'
import { useTranslation } from '../i18n/I18nContext'

interface AppIconSelectorProps {
  value: AppIconMode
  onChange: (mode: AppIconMode) => void
}

export function AppIconSelector({ value, onChange }: AppIconSelectorProps) {
  const { t } = useTranslation()
  const options = [
    ['default', t('iconDefault'), '/eseebus-app-icon.png'],
    ['kmb', t('iconKmb'), '/kmb-app-icon.png'],
  ] as const

  return (
    <div className="settings-icon-options" role="list" aria-label={t('appIcon')}>
      {options.map(([mode, label, src]) => (
        <button
          key={mode}
          type="button"
          role="listitem"
          className={`settings-icon-option${value === mode ? ' settings-icon-option--active' : ''}`}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          <img className="settings-icon-option__preview" src={src} alt="" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
