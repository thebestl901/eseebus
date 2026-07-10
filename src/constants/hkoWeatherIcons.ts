/** Official HKO weather icon codes — https://www.hko.gov.hk/textonly/v2/explain/wxicon_e.htm */
export const HKO_WEATHER_ICON_CODES = [
  50, 51, 52, 53, 54,
  60, 61, 62, 63, 64, 65,
  70, 71, 72, 73, 74, 75, 76, 77,
  80, 81, 82, 83, 84, 85,
  90, 91, 92, 93,
] as const

export type HkoWeatherIconCode = (typeof HKO_WEATHER_ICON_CODES)[number]

export function localWeatherIconPath(iconCode: number): string {
  return `/hko/wxicon/pic${iconCode}.png`
}
