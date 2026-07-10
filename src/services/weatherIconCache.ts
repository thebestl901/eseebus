import { HKO_WEATHER_ICON_CODES, localWeatherIconPath } from '../constants/hkoWeatherIcons'

let preloadStarted = false

export function weatherIconUrl(iconCode: number): string {
  return localWeatherIconPath(iconCode)
}

export function preloadWeatherIcons(): void {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true

  for (const code of HKO_WEATHER_ICON_CODES) {
    const img = new Image()
    img.decoding = 'async'
    img.src = localWeatherIconPath(code)
  }
}

export async function preloadWeatherIconsAsync(): Promise<void> {
  if (typeof window === 'undefined') return

  await Promise.all(
    HKO_WEATHER_ICON_CODES.map(
      (code) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.decoding = 'async'
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = localWeatherIconPath(code)
        }),
    ),
  )
}
