import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppSettings, FavoriteStop } from '../types/kmb'
import {
  ACCENT_COLOR_PALETTE,
  BG_COLOR_PALETTE,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  TEXT_COLOR_PALETTE,
} from '../types/kmb'
import { resetOnboarding } from '../hooks/useSettings'
import { useTranslation } from '../i18n/I18nContext'
import { LanguageSelector } from './LanguageSelector'
import {
  formatCatalogUpdatedAt,
  getRouteCatalogUpdatedAt,
  refreshRouteCatalog,
} from '../services/routeCatalog'
import {
  applyBackup,
  copyBackupToClipboard,
  createBackup,
  downloadBackupFile,
  parseBackup,
} from '../services/backup'
import { APP_VERSION, GITHUB_REPO_URL } from '../constants/appInfo'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  favorites: FavoriteStop[]
  onUpdate: (partial: Partial<AppSettings>) => void
}

function ColorPalette({
  label,
  value,
  palette,
  onChange,
  customLabel,
}: {
  label: string
  value: string
  palette: readonly string[]
  onChange: (color: string) => void
  customLabel: string
}) {
  const normalized = value.toLowerCase()

  return (
    <div className="settings-section">
      <h3>{label}</h3>
      <div className="color-palette" role="list" aria-label={label}>
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            role="listitem"
            className={`color-swatch${normalized === color.toLowerCase() ? ' color-swatch--active' : ''}`}
            style={{ backgroundColor: color }}
            aria-label={color}
            aria-pressed={normalized === color.toLowerCase()}
            onClick={() => onChange(color)}
          />
        ))}
        <label className="color-swatch color-swatch--custom" aria-label={customLabel}>
          <span className="color-swatch__custom-icon">＋</span>
          <input
            type="color"
            className="color-swatch__input"
            value={value.startsWith('#') ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
      <div className="color-palette__value">{value.toUpperCase()}</div>
    </div>
  )
}

function TextColorPalette({
  value,
  onChange,
}: {
  value: string | null
  onChange: (color: string | null) => void
}) {
  const { t } = useTranslation()
  const presetColors = TEXT_COLOR_PALETTE.filter((c) => c !== 'auto') as string[]
  const isAuto = value === null

  return (
    <div className="settings-section">
      <h3>{t('textColor')}</h3>
      <div className="settings-options" style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          className={`settings-option${isAuto ? ' settings-option--active' : ''}`}
          onClick={() => onChange(null)}
        >
          {t('textAuto')}
        </button>
      </div>
      <div className="color-palette" role="list" aria-label={t('textColor')}>
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            role="listitem"
            className={`color-swatch${value?.toLowerCase() === color.toLowerCase() ? ' color-swatch--active' : ''}`}
            style={{ backgroundColor: color }}
            aria-label={color}
            aria-pressed={value?.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
          />
        ))}
        <label className="color-swatch color-swatch--custom" aria-label={t('customTextColor')}>
          <span className="color-swatch__custom-icon">＋</span>
          <input
            type="color"
            className="color-swatch__input"
            value={value?.startsWith('#') ? value : '#f0f0f0'}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
      <div className="color-palette__value">
        {isAuto ? t('textAutoHint') : value.toUpperCase()}
      </div>
      <p className="settings-hint">{t('textColorHint')}</p>
    </div>
  )
}

export function SettingsDrawer({
  open,
  onClose,
  settings,
  favorites,
  onUpdate,
}: SettingsDrawerProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<number | null>(null)
  const [catalogRefreshing, setCatalogRefreshing] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCatalogError(null)
    setBackupMessage(null)
    setImportOpen(false)
    setImportText('')
    setImportError(null)
    getRouteCatalogUpdatedAt().then(setCatalogUpdatedAt)
  }, [open])

  if (!open) return null

  const handleRefreshCatalog = async () => {
    if (catalogRefreshing) return
    setCatalogRefreshing(true)
    setCatalogError(null)
    try {
      const updatedAt = await refreshRouteCatalog()
      setCatalogUpdatedAt(updatedAt)
    } catch {
      setCatalogError(t('routeInfoRefreshError'))
    } finally {
      setCatalogRefreshing(false)
    }
  }

  const handleResetOnboarding = () => {
    resetOnboarding()
    onClose()
    navigate('/')
  }

  const changeFontSize = (delta: number) => {
    onUpdate({ fontSizePx: settings.fontSizePx + delta })
  }

  const handleExportBackup = async () => {
    const backup = createBackup(favorites, settings)
    const copied = await copyBackupToClipboard(backup)
    if (copied) {
      setBackupMessage(t('backupCopied'))
    }
    downloadBackupFile(backup)
  }

  const handleConfirmImport = () => {
    const backup = parseBackup(importText.trim())
    if (!backup) {
      setImportError(t('backupImportError'))
      return
    }
    setImportError(null)
    applyBackup(backup)
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <div
        className="settings-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('settings')}
      >
        <div className="settings-drawer__header">
          <h2>{t('settings')}</h2>
          <button className="btn-touch settings-drawer__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <LanguageSelector
          locale={settings.locale}
          onChange={(locale) => onUpdate({ locale })}
          variant="settings"
        />

        <div className="settings-section">
          <h3>{t('fontSize')}</h3>
          <div className="font-size-control">
            <button
              type="button"
              className="font-size-control__btn btn-touch"
              aria-label={t('decreaseFont')}
              disabled={settings.fontSizePx <= FONT_SIZE_MIN}
              onClick={() => changeFontSize(-FONT_SIZE_STEP)}
            >
              −
            </button>
            <div className="font-size-control__value">
              <span className="font-size-control__number">{settings.fontSizePx}</span>
              <span className="font-size-control__unit">px</span>
            </div>
            <button
              type="button"
              className="font-size-control__btn btn-touch"
              aria-label={t('increaseFont')}
              disabled={settings.fontSizePx >= FONT_SIZE_MAX}
              onClick={() => changeFontSize(FONT_SIZE_STEP)}
            >
              ＋
            </button>
          </div>
          <input
            type="range"
            className="font-size-slider"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={FONT_SIZE_STEP}
            value={settings.fontSizePx}
            aria-label={t('fontSlider')}
            onChange={(e) => onUpdate({ fontSizePx: Number(e.target.value) })}
          />
          <div className="font-size-slider__labels">
            <span>{FONT_SIZE_MIN}px</span>
            <span>{FONT_SIZE_MAX}px</span>
          </div>
        </div>

        <ColorPalette
          label={t('bgColor')}
          value={settings.bgColor}
          palette={BG_COLOR_PALETTE}
          onChange={(bgColor) => onUpdate({ bgColor })}
          customLabel={t('customColor')}
        />

        <ColorPalette
          label={t('accentColor')}
          value={settings.accentColor}
          palette={ACCENT_COLOR_PALETTE}
          onChange={(accentColor) => onUpdate({ accentColor })}
          customLabel={t('customColor')}
        />

        <TextColorPalette
          value={settings.textColor}
          onChange={(textColor) => onUpdate({ textColor })}
        />

        <div className="settings-section">
          <h3>{t('appIcon')}</h3>
          <div className="settings-icon-options">
            {(
              [
                ['default', t('iconDefault'), '/favicon.svg'],
                ['kmb', t('iconKmb'), '/kmb-app-icon.png'],
              ] as const
            ).map(([value, label, src]) => (
              <button
                key={value}
                type="button"
                className={`settings-icon-option${settings.appIconMode === value ? ' settings-icon-option--active' : ''}`}
                onClick={() => onUpdate({ appIconMode: value })}
              >
                <img className="settings-icon-option__preview" src={src} alt="" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <p className="settings-hint">{t('iconHint')}</p>
        </div>

        <div className="settings-section">
          <h3>{t('etaDisplay')}</h3>
          <div className="settings-options">
            {(
              [
                ['minutes', t('etaMinutes')],
                ['clock', t('etaClock')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`settings-option${settings.etaDisplayMode === value ? ' settings-option--active' : ''}`}
                onClick={() => onUpdate({ etaDisplayMode: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="settings-hint">
            {settings.etaDisplayMode === 'minutes' ? t('etaMinutesHint') : t('etaClockHint')}
          </p>
        </div>

        <div className="settings-section">
          <h3>{t('contrast')}</h3>
          <div className="settings-options">
            {(
              [
                ['normal', t('contrastNormal')],
                ['high', t('contrastHigh')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`settings-option${settings.contrastMode === value ? ' settings-option--active' : ''}`}
                onClick={() => onUpdate({ contrastMode: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <button
            type="button"
            className="settings-route-info__title"
            onClick={handleRefreshCatalog}
            disabled={catalogRefreshing}
          >
            {catalogRefreshing ? t('routeInfoUpdating') : t('routeInfo')}
          </button>
          <p className="settings-hint">
            {catalogUpdatedAt
              ? t('routeInfoUpdated', {
                  time: formatCatalogUpdatedAt(catalogUpdatedAt, settings.locale),
                })
              : t('routeInfoNever')}
          </p>
          {!catalogRefreshing && (
            <p className="settings-hint settings-route-info__hint">{t('routeInfoTapRefresh')}</p>
          )}
          {catalogError && <p className="settings-route-info__error">{catalogError}</p>}
        </div>

        <div className="settings-section">
          <h3>{t('about')}</h3>
          <p className="settings-hint">{t('versionLabel', { version: APP_VERSION })}</p>
          <p className="settings-hint">{t('licenseLabel')}</p>
          {GITHUB_REPO_URL ? (
            <a
              className="settings-link"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('githubLink')}
            </a>
          ) : (
            <p className="settings-hint">{t('githubLink')}</p>
          )}
        </div>

        <div className="settings-section">
          <h3>{t('backupSection')}</h3>
          <p className="settings-hint">{t('backupExportHint')}</p>
          <div className="settings-options">
            <button type="button" className="settings-option" onClick={handleExportBackup}>
              {t('backupExport')}
            </button>
          </div>
          {backupMessage && <p className="settings-hint">{backupMessage}</p>}
          {!importOpen ? (
            <button
              type="button"
              className="settings-reset-btn settings-backup-import-btn"
              onClick={() => setImportOpen(true)}
            >
              {t('backupImport')}
            </button>
          ) : (
            <div className="settings-backup-import">
              <p className="settings-hint">{t('backupImportHint')}</p>
              <textarea
                className="settings-backup-import__textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
                spellCheck={false}
              />
              {importError && <p className="settings-route-info__error">{importError}</p>}
              <div className="settings-backup-import__actions">
                <button type="button" className="settings-option" onClick={handleConfirmImport}>
                  {t('backupConfirmImport')}
                </button>
                <button
                  type="button"
                  className="settings-reset-btn"
                  onClick={() => {
                    setImportOpen(false)
                    setImportText('')
                    setImportError(null)
                  }}
                >
                  {t('backupCancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <button type="button" className="settings-reset-btn" onClick={handleResetOnboarding}>
            {t('replayOnboarding')}
          </button>
        </div>
      </div>
    </div>
  )
}
