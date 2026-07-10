export interface HkoWarningSummary {
  name: string
  code: string
  actionCode?: string
  issueTime?: string
  updateTime?: string
  expireTime?: string
}

export interface ActiveWarning {
  name: string
  code: string
}

export interface HomeWeatherData {
  temperature: number | null
  iconCode: number | null
  warnings: ActiveWarning[]
}

export interface WeatherDisplaySlide {
  warningCode: string
  label: string
}

export interface WeatherDisplay {
  iconCode: number | null
  temperature: number | null
  slides: WeatherDisplaySlide[]
}
