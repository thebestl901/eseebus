import type { AppIconMode } from '../types/kmb'

const ICON_DEFAULT = '/favicon.svg'
const ICON_KMB = '/kmb-app-icon.png'

const MANIFEST_BASE = {
  name: '巴士報站網頁版',
  short_name: '巴士報站',
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
  const sizes = useKmb ? '192x192' : 'any'

  upsertLink('icon', href, type)
  upsertLink('apple-touch-icon', href, useKmb ? 'image/png' : undefined)

  if (manifestBlobUrl) {
    URL.revokeObjectURL(manifestBlobUrl)
    manifestBlobUrl = null
  }

  const manifest = {
    ...MANIFEST_BASE,
    icons: [
      {
        src: href,
        sizes,
        type,
        purpose: 'any maskable',
      },
    ],
  }

  manifestBlobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
  )
  upsertLink('manifest', manifestBlobUrl)
}
