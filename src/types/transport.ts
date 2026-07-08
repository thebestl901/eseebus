export type TransportOperator = 'KMB' | 'CTB' | 'GMB'

export const OPERATOR_LABELS: Record<TransportOperator, string> = {
  KMB: '九巴',
  CTB: '城巴',
  GMB: '專線小巴',
}

export interface RouteSearchItem {
  operator: TransportOperator
  operatorLabel: string
  route: string
  /** KMB/CTB: 'O' | 'I'. GMB: route_seq as string. */
  direction: string
  destTc: string
  destSc?: string
  destEn?: string
  serviceType?: string
  /** GMB only */
  routeId?: number
  region?: GmbRegion
  routeCode?: string
  routeSeq?: number
}

export type GmbRegion = 'HKI' | 'KLN' | 'NT'

export interface RouteStopPoint {
  seq: number
  stopId: string
  nameTc: string
  nameSc?: string
  nameEn?: string
  lat?: number
  lng?: number
}

export interface StopEtaEntry {
  eta_seq: number
  eta: string
  rmk_tc: string
}
