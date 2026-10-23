export type ProductId = 'tote' | 'sleeve' | 'cardholder'

export type Product = {
  id: ProductId
  name: string
  category: string
  tagline: string
  description: string
  dimensions: {
    width: [number, number]
    height: [number, number]
    depth: [number, number]
  }
  maxLeatherThickness: number
  supportsStrap: boolean
  supportsPadding: boolean
  supportsPockets: boolean
  leatherAreaFactor: number
}

export type Leather = {
  id: string
  name: string
  grade: string
  finish: string
  thickness: number
  temper: string
  description: string
  colors: { id: string; name: string; hex: string }[]
}

export type Configuration = {
  productId: ProductId
  leatherId: string
  colorId: string
  hardware: 'brass' | 'silver' | 'black'
  widthCm: number
  heightCm: number
  depthCm: number
  monogram: string
  monogramMethod: 'embossed' | 'engraved'
  removableStrap: boolean
  paddedLining: boolean
  pocketCount: number
  customRequest: string
}

export type ValidationIssue = {
  code: string
  message: string
  attribute: keyof Configuration
  severity: 'error' | 'warning'
}

export type PriceEstimate = {
  total: null
  status: 'unavailable'
  reason: string
}

export type ParsedDesign = {
  configuration: Configuration
  recognized: string[]
  questions: string[]
}

export type Recommendation = {
  title: string
  reason: string
  configuration: Configuration
  changes: string[]
}
