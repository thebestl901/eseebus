import { useState } from 'react'
import type { AppSettings, FavoriteStop } from '../types/kmb'
import { useTranslation } from '../i18n/I18nContext'
import {
  copyBackupToClipboard,
  createBackup,
  downloadBackupFile,
} from '../services/backup'
import { APP_VERSION, APP_SITE_URL, GITHUB_CHANGELOG_URL } from '../constants/appInfo'

interface UpdateGuideDrawerProps {
  open: boolean
  latestVersion: string
  onClose: () => void
  settings: AppSettings
  favorites: FavoriteStop[]
}

export function UpdateGuideDrawer({
  open,
  latestVersion,
  onClose,
  settings,
  favorites,
}: UpdateGuideDrawerProps) {
  const { t } = useTranslation()
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  if (!open) return null

  const handleExportBackup = async () => {
    const backup = createBackup(favorites, settings)
    const copied = await copyBackupToClipboard(backup)
    if (copied) {
      setBackupMessage(t('backupCopied'))
    }
    downloadBackupFile(backup)
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <div
        className="settings-drawer update-guide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('updateGuideTitle')}
      >
        <div className="settings-drawer__header">
          <h2>{t('updateGuideTitle')}</h2>
          <button className="btn-touch settings-drawer__close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="update-guide__version">
          <p>{t('updateGuideVersionCurrent', { version: APP_VERSION })}</p>
          <p>{t('updateGuideVersionLatest', { version: latestVersion })}</p>
        </div>

        <div className="update-guide__export settings-section">
          <h3>{t('updateGuideExportTitle')}</h3>
          <p className="update-guide__warning">{t('updateGuideDataWarning')}</p>
          <p className="settings-hint">{t('updateGuideExportHint')}</p>
          <button type="button" className="update-guide__export-btn" onClick={handleExportBackup}>
            {t('backupExport')}
          </button>
          {backupMessage && <p className="settings-hint">{backupMessage}</p>}
          <a
            className="update-guide__site-link"
            href={APP_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('updateGuideOpenSite')}
          </a>
        </div>

        <div className="settings-section">
          <h3>{t('updateGuideStepsTitle')}</h3>
          <ol className="update-guide__steps">
            <li>{t('updateGuideStep1')}</li>
            <li>{t('updateGuideStep2')}</li>
            <li>{t('updateGuideStep3')}</li>
            <li>{t('updateGuideStep4')}</li>
          </ol>
        </div>

        <div className="settings-section">
          <a
            className="settings-link"
            href={GITHUB_CHANGELOG_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('updateGuideViewGithub')}
          </a>
        </div>
      </div>
    </div>
  )
}
