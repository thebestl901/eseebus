export interface KmbRoute {
  route: string
  bound: 'O' | 'I'
  service_type: string
  orig_en: string
  orig_tc: string
  orig_sc: string
  dest_en: string
  dest_tc: string
  dest_sc: string
}

export interface KmbStop {
  stop: string
  name_en: string
  name_tc: string
  name_sc: string
  lat: string
  long: string
}

export interface KmbRouteStop {
  route: string
  bound: 'O' | 'I'
  service_type: string
  seq: string
  stop: string
}

export interface KmbStopEta {
  co: string
  route: string
  dir: 'O' | 'I'
  service_type: number
  seq: number
  dest_tc: string
  dest_sc: string
  dest_en: string
  eta_seq: number
  eta: string | null
  rmk_tc: string
  rmk_sc: string
  rmk_en: string
  data_timestamp: string
}

export interface KmbRouteEta extends KmbStopEta {
  stop: string
}

import type { GmbRegion, TransportOperator } from './transport'
import type { AppLocale } from '../i18n/types'
import { DEFAULT_LOCALE } from '../i18n/types'

export interface FavoriteStop {
  id: string
  operator?: TransportOperator
  route: string
  /** KMB/CTB: 'O' | 'I'. GMB: route_seq as string. */
  direction: string
  serviceType?: string
  stopId: string
  /** Stop name (Traditional Chinese). */
  stopName: string
  stopNameSc?: string
  stopNameEn?: string
  /** Route destination (Traditional Chinese). */
  destTc: string
  destSc?: string
  destEn?: string
  /** GMB only */
  routeId?: number
  region?: GmbRegion
  routeSeq?: number
  stopSeq?: number
}

export type ContrastMode = 'normal' | 'high'

export type EtaDisplayMode = 'minutes' | 'clock'

export type ClockFormat = '12h' | '24h'

export type AppIconMode = 'default' | 'kmb'

export type EtaRemarkType = 'last' | 'scheduled'

export interface EtaArrival {
  minutes: number
  /** ISO timestamp; empty when API returns status only (e.g. 最後班次已過). */
  eta: string
  remarkType: EtaRemarkType
  remarkLabel: string
  /** Shown when `eta` is empty — raw status from API. */
  statusText?: string
}

export interface AppSettings {
  /** Base font size in px (applied to html root). */
  fontSizePx: number
  /** Background color (hex). */
  bgColor: string
  /** Accent / header color (hex). */
  accentColor: string
  /** Text color (hex). null = auto from background. */
  textColor: string | null
  contrastMode: ContrastMode
  /** Show countdown minutes or clock time (e.g. 12:30). */
  etaDisplayMode: EtaDisplayMode
  /** 12-hour or 24-hour clock when etaDisplayMode is clock. */
  clockFormat: ClockFormat
  /** Browser / home-screen icon style. */
  appIconMode: AppIconMode
  /** UI language. */
  locale: AppLocale
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSizePx: 16,
  bgColor: '#ffffff',
  accentColor: '#E60012',
  textColor: null,
  contrastMode: 'normal',
  etaDisplayMode: 'minutes',
  clockFormat: '24h',
  appIconMode: 'default',
  locale: DEFAULT_LOCALE,
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 28
export const FONT_SIZE_STEP = 1

export const BG_COLOR_PALETTE = [
  '#ffffff',
  '#faf6f0',
  '#f0f0f0',
  '#1a1a1a',
  '#000000',
  '#2d2d2d',
  '#e3f2fd',
  '#fce4ec',
] as const

export const TEXT_COLOR_PALETTE = [
  'auto',
  '#1a1a1a',
  '#f0f0f0',
  '#ffffff',
  '#333333',
  '#cccccc',
] as const

export const ACCENT_COLOR_PALETTE = [
  '#E60012',
  '#B8000E',
  '#0066CC',
  '#00875A',
  '#FF6600',
  '#7B1FA2',
  '#333333',
  '#D4A017',
] as const
