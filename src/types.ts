export type ProductId =
  | 'tote'
  | 'sleeve'
  | 'cardholder'
  | 'wallet'
  | 'handbag'
  | 'toiletry'
  | 'sunglass'

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
  basePrice?: number
  accentName?: string
  defaultDimensions?: { width: number; height: number; depth: number }
  carryCollection?: string
  indicativePriceRange?: string
}

export type LeatherId = string

export type Leather = {
  id: string
  name: string
  grade: string
  finish: string
  thickness: number
  temper: string
  description: string
  ratePerSqFt: number
  status: 'Verified' | 'Awaiting sample approval' | 'Quotation required'
  availableFinishes?: ('smooth' | 'pebble' | 'saffiano' | 'pullup' | 'suede')[]
  colors: { id: string; name: string; hex: string }[]
}

export type HardwareId = 'brass' | 'silver' | 'black' | 'rose' | 'gunmetal'

export type MonogramMethod =
  | 'embossed'
  | 'engraved'
  | 'gold_foil'
  | 'silver_foil'
  | 'rose_foil'
  | 'blind_deboss'

export type MonogramFont = 'script' | 'serif' | 'sans'
export type MonogramPlacement = 'center' | 'corner'
export type MonogramSize = 'S' | 'M' | 'L'

export type Configuration = {
  productId: ProductId
  leatherId: string
  colorId: string
  hardware: HardwareId
  widthCm: number
  heightCm: number
  depthCm: number
  monogram: string
  monogramMethod: MonogramMethod
  removableStrap: boolean
  paddedLining: boolean
  pocketCount: number
  customRequest: string
  accentColorId?: string
  threadColorId?: string
  edgeColorId?: string
  liningColorId?: string
  leatherFinish?: 'smooth' | 'pebble' | 'saffiano' | 'pullup' | 'suede'
  monogramFont?: MonogramFont
  monogramPlacement?: MonogramPlacement
  monogramSize?: MonogramSize
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

export type StudioCostBreakdown = {
  leatherCost: number
  hardwareCost: number
  laborCost: number
  liningCost: number
  monogramCost: number
  total: number
  estimatedDays: number
  leatherAreaSqFt: number
  ratePerSqFtUsed: number
}

export type BudgetAlternative = {
  configuration: Configuration
  price: number
  difference: number
  changes: string[]
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
