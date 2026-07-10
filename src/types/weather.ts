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
  warnings: ActiveWarning[]
}
