import type { AppIconMode } from '../types/kmb'

import { APP_FULL_NAME, APP_SHORT_NAME } from '../constants/appInfo'

const ICON_DEFAULT = '/favicon.svg'
const ICON_DEFAULT_APPLE = '/eseebus-app-icon.png'
const ICON_KMB = '/kmb-app-icon.png'

const MANIFEST_BASE = {
  name: APP_FULL_NAME,
  short_name: APP_SHORT_NAME,
  description: '大字體、無廣告的香港巴士到站查詢',
  start_url: '/',
  display: 'standalone',
  background_color: '#E60012',
  theme_color: '#E60012',
  orientation: 'portrait',
  lang: 'zh-HK',
} as const

let manifestBlobUrl: string | null = null

function upsertLink(rel: string, href: string, type?: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
  if (type) link.type = type
  else link.removeAttribute('type')
}

export function applyAppIcon(mode: AppIconMode) {
  const useKmb = mode === 'kmb'
  const href = useKmb ? ICON_KMB : ICON_DEFAULT
  const type = useKmb ? 'image/png' : 'image/svg+xml'

  upsertLink('icon', href, type)
  upsertLink(
    'apple-touch-icon',
    useKmb ? ICON_KMB : ICON_DEFAULT_APPLE,
    'image/png',
  )

  if (manifestBlobUrl) {
    URL.revokeObjectURL(manifestBlobUrl)
    manifestBlobUrl = null
  }

  const manifest = {
    ...MANIFEST_BASE,
    icons: useKmb
      ? [
          {
            src: ICON_KMB,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ]
      : [
          {
            src: ICON_DEFAULT_APPLE,
            sizes: '150x150',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: ICON_DEFAULT,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
  }

  manifestBlobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
  )
  upsertLink('manifest', manifestBlobUrl)
}
