import type { AppSettings, FavoriteStop } from '../types/kmb'
import { DEFAULT_SETTINGS } from '../types/kmb'
import { normalizeSettingsForImport } from '../hooks/useSettings'

const FAVORITES_KEY = 'favorites'
const SETTINGS_KEY = 'settings'

export type BackupSettings = Omit<AppSettings, 'appIconMode'>

export interface AppBackupV1 {
  schema: 'eseebus-backup-v1'
  exportedAt: string
  favorites: FavoriteStop[]
  settings: BackupSettings
}

function settingsForBackup(settings: AppSettings): BackupSettings {
  const { appIconMode: _ignored, ...backupSettings } = settings
  return backupSettings
}

function loadCurrentAppIconMode(): AppSettings['appIconMode'] {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS.appIconMode
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized = normalizeSettingsForImport(parsed)
    return normalized.appIconMode
  } catch {
    return DEFAULT_SETTINGS.appIconMode
  }
}

export function createBackup(
  favorites: FavoriteStop[],
  settings: AppSettings,
): AppBackupV1 {
  return {
    schema: 'eseebus-backup-v1',
    exportedAt: new Date().toISOString(),
    favorites,
    settings: settingsForBackup(settings),
  }
}

export function serializeBackup(backup: AppBackupV1): string {
  return JSON.stringify(backup, null, 2)
}

function isFavoriteStop(value: unknown): value is FavoriteStop {
  if (!value || typeof value !== 'object') return false
  const fav = value as FavoriteStop
  return (
    typeof fav.route === 'string' &&
    typeof fav.direction === 'string' &&
    typeof fav.stopId === 'string' &&
    typeof fav.stopName === 'string' &&
    typeof fav.destTc === 'string'
  )
}

function normalizeBackupSettings(raw: Record<string, unknown>): BackupSettings {
  const normalized = normalizeSettingsForImport(raw)
  return settingsForBackup(normalized)
}

export function parseBackup(raw: string): AppBackupV1 | null {
  try {
    const data = JSON.parse(raw) as Partial<AppBackupV1> & {
      settings?: Record<string, unknown>
    }
    if (data.schema !== 'eseebus-backup-v1') return null
    if (!Array.isArray(data.favorites) || !data.favorites.every(isFavoriteStop)) return null
    if (!data.settings || typeof data.settings !== 'object') return null
    return {
      schema: 'eseebus-backup-v1',
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
      favorites: data.favorites,
      settings: normalizeBackupSettings(data.settings),
    }
  } catch {
    return null
  }
}

export function applyBackup(backup: AppBackupV1): void {
  const settings: AppSettings = {
    ...backup.settings,
    appIconMode: loadCurrentAppIconMode(),
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(backup.favorites))
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  window.location.reload()
}

export async function copyBackupToClipboard(backup: AppBackupV1): Promise<boolean> {
  const text = serializeBackup(backup)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadBackupFile(backup: AppBackupV1): void {
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `eseebus-backup-${backup.exportedAt.slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function readBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
