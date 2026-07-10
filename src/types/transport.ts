export type TransportOperator = 'KMB' | 'CTB' | 'GMB' | 'NLB' | 'MTR'

export const OPERATOR_LABELS: Record<TransportOperator, string> = {
  KMB: '九巴',
  CTB: '城巴',
  GMB: '專線小巴',
  NLB: '新大嶼山巴士',
  MTR: '港鐵巴士',
}

export interface RouteSearchItem {
  operator: TransportOperator
  operatorLabel: string
  route: string
  /** KMB/CTB: 'O' | 'I'. GMB: route_seq. NLB: routeId as string. */
  direction: string
  destTc: string
  destSc?: string
  destEn?: string
  serviceType?: string
  /** GMB / NLB */
  routeId?: number
  /** MTR only */
  mtrLineRef?: string
  mtrReferenceId?: string
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
