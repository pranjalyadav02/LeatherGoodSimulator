export type Species = 'cow' | 'buffalo' | 'goat' | 'sheep-lamb' | 'other' | 'unknown'
export type Grade = 'full-grain' | 'top-grain' | 'corrected-grain' | 'split-suede' | 'other' | 'unknown'
export type Tanning = 'vegetable' | 'chrome' | 'other' | 'unknown'
export type MarketFinish = 'oil-pull-up' | 'nubuck' | 'suede' | 'smooth' | 'embossed' | 'other' | 'unknown'
export type MarketSegment = 'retail' | 'wholesale'
export type StockStatus = 'in-stock' | 'out-of-stock' | 'unknown'
export type VerificationStatus = 'verified' | 'pending' | 'rejected'
export type PriceUnit = 'sq-ft' | 'sq-m' | 'hide' | 'side' | 'sheet' | 'panel' | 'piece' | 'kg'
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP'

export type SupplierSource = {
  id: string
  supplier: string
  url: string
  region: 'India' | 'International'
  access: 'manual'
  notes: string
}

export type PriceObservation = {
  id: string
  sourceId: string
  supplier: string
  productName: string
  sourceUrl: string
  species: Species
  grade: Grade
  tanning: Tanning
  finish: MarketFinish
  thicknessMm: number | null
  country: string
  displayedPrice: number
  currency: CurrencyCode
  unit: PriceUnit
  unitAreaSqFt: number | null
  minimumOrder: string
  segment: MarketSegment
  stock: StockStatus
  taxesShipping: string
  observedAt: string
  expiresAt: string | null
  verification: VerificationStatus
  verifiedBy: string
  correctionReason: string
}

export type ExchangeRateObservation = {
  id: string
  currency: Exclude<CurrencyCode, 'INR'>
  inrPerUnit: number
  sourceUrl: string
  observedAt: string
  verifiedBy: string
}

export type MarketStore = {
  version: 1
  observations: PriceObservation[]
  exchangeRates: ExchangeRateObservation[]
  freshnessDays: number
}

export type NormalizedObservation = {
  observation: PriceObservation
  inrPerSqFt: number | null
  excludedReason: string | null
}

export type MarketAverage = {
  mean: number
  median: number
  minimum: number
  maximum: number
  listingCount: number
  supplierCount: number
  latestObservedAt: string
  confidence: 'low' | 'moderate' | 'high'
  groupKey: string
}

export type ConvertedSupplierPrice = {
  amountInInr: number
  rate: number
  sourceUrl: string
  observedAt: string
}

export const SUPPLIER_SOURCES: SupplierSource[] = [
  { id: 'india-leather-supply', supplier: 'India Leather Supply', url: 'https://indialeathersupply.com/collections/leather', region: 'India', access: 'manual', notes: 'Public supplier page; confirm terms before automated access.' },
  { id: 'craft-leather-supply', supplier: 'Craft Leather Supply', url: 'https://www.craftleathersupply.com/finished-leather.html', region: 'India', access: 'manual', notes: 'Public product page; confirm terms before automated access.' },
  { id: 'tradeindia-goat', supplier: 'TradeIndia — goat leather', url: 'https://www.tradeindia.com/manufacturers/goat-finished-leather.html', region: 'India', access: 'manual', notes: 'Marketplace directory; request a current supplier quotation.' },
  { id: 'tradeindia-buffalo', supplier: 'TradeIndia — buffalo leather', url: 'https://www.tradeindia.com/manufacturers/buffalo-leather.html', region: 'India', access: 'manual', notes: 'Marketplace directory; request a current supplier quotation.' },
  { id: 'tradeindia-sheep', supplier: 'TradeIndia — sheep leather', url: 'https://www.tradeindia.com/manufacturers/sheep-leather.html', region: 'India', access: 'manual', notes: 'Marketplace directory; request a current supplier quotation.' },
  { id: 'narangi-leather', supplier: 'Narangi Leather', url: 'https://www.narangileather.com/buffalo-leather.html', region: 'India', access: 'manual', notes: 'Listing and stock must be verified with supplier.' },
  { id: 'cratly', supplier: 'Cratly', url: 'https://cratly.com/collections/for-crafts', region: 'India', access: 'manual', notes: 'Retail craft material; keep separate from wholesale hides.' },
  { id: 'cle-directory', supplier: 'Council for Leather Exports directory', url: 'https://cle-member-directory.vercel.app/', region: 'India', access: 'manual', notes: 'Supplier directory, not a price feed.' },
  { id: 'iro-ledermanufaktur', supplier: 'IRO Ledermanufaktur', url: 'https://iro-ledermanufaktur.de/en/collections/walpier-buttero', region: 'International', access: 'manual', notes: 'Imported supplier listing; capture original currency and quote landed costs separately.' },
  { id: 'abbey-england', supplier: 'Abbey England', url: 'https://www.abbeyengland.com/en-gb/italian-bridle-leather-3-3-3-5mm-newmarket-e1v09f', region: 'International', access: 'manual', notes: 'Imported supplier listing; capture original currency and quote landed costs separately.' },
]

export const EMPTY_MARKET_STORE: MarketStore = {
  version: 1,
  observations: [],
  exchangeRates: [],
  freshnessDays: 30,
}

export const STORAGE_KEY = 'atelier-market-store-v1'

export function loadMarketStore(): MarketStore {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return EMPTY_MARKET_STORE
  let parsed: Partial<MarketStore>
  try {
    parsed = JSON.parse(stored) as Partial<MarketStore>
  } catch (error) {
    throw new Error('Saved market data is malformed. Clear or repair the browser-local market store before continuing.', { cause: error })
  }
  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.observations) ||
    !Array.isArray(parsed.exchangeRates) ||
    typeof parsed.freshnessDays !== 'number' ||
    !Number.isFinite(parsed.freshnessDays) ||
    parsed.freshnessDays < 1 ||
    parsed.freshnessDays > 365
  ) {
    throw new Error('Saved market data has an unsupported or invalid schema. No stored prices were loaded.')
  }
  return parsed as MarketStore
}

export function saveMarketStore(store: MarketStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    throw new Error('Could not save market data in this browser. Check available storage and try again.', { cause: error })
  }
}

function rateFor(
  currency: CurrencyCode,
  rates: ExchangeRateObservation[],
  observedAt: string,
  freshnessDays: number,
): number | null {
  if (currency === 'INR') return 1
  const listingTime = Date.parse(observedAt)
  const suitable = rates
    .filter((rate) =>
      rate.currency === currency &&
      Number.isFinite(rate.inrPerUnit) &&
      rate.inrPerUnit > 0 &&
      Date.parse(rate.observedAt) <= listingTime &&
      listingTime - Date.parse(rate.observedAt) <= freshnessDays * 24 * 60 * 60 * 1000,
    )
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]
  return suitable?.inrPerUnit ?? null
}

export function convertSupplierPrice(
  observation: PriceObservation,
  rates: ExchangeRateObservation[],
  freshnessDays = 30,
): ConvertedSupplierPrice | null {
  if (observation.currency === 'INR') {
    return {
      amountInInr: observation.displayedPrice,
      rate: 1,
      sourceUrl: observation.sourceUrl,
      observedAt: observation.observedAt,
    }
  }
  const listingTime = Date.parse(observation.observedAt)
  const rate = rates
    .filter((item) =>
      item.currency === observation.currency &&
      Number.isFinite(item.inrPerUnit) &&
      item.inrPerUnit > 0 &&
      Date.parse(item.observedAt) <= listingTime &&
      listingTime - Date.parse(item.observedAt) <= freshnessDays * 24 * 60 * 60 * 1000,
    )
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]
  if (!rate) return null
  return {
    amountInInr: observation.displayedPrice * rate.inrPerUnit,
    rate: rate.inrPerUnit,
    sourceUrl: rate.sourceUrl,
    observedAt: rate.observedAt,
  }
}

export function normalizeObservation(
  observation: PriceObservation,
  rates: ExchangeRateObservation[],
  now = Date.now(),
  freshnessDays = 30,
): NormalizedObservation {
  if (observation.verification !== 'verified') {
    return { observation, inrPerSqFt: null, excludedReason: 'Not verified' }
  }
  if (observation.expiresAt && Date.parse(observation.expiresAt) <= now) {
    return { observation, inrPerSqFt: null, excludedReason: 'Quotation has expired' }
  }
  if (observation.stock !== 'in-stock') {
    return { observation, inrPerSqFt: null, excludedReason: observation.stock === 'out-of-stock' ? 'Out of stock' : 'Stock not verified' }
  }
  if (
    observation.species === 'unknown' ||
    observation.grade === 'unknown' ||
    observation.grade === 'other' ||
    observation.tanning === 'unknown' ||
    observation.tanning === 'other' ||
    observation.finish === 'unknown' ||
    observation.finish === 'other' ||
    !observation.country.trim() ||
    observation.thicknessMm === null ||
    !Number.isFinite(observation.thicknessMm) ||
    observation.thicknessMm <= 0
  ) {
    return { observation, inrPerSqFt: null, excludedReason: 'Insufficient material classification for a comparable average' }
  }

  const conversion = rateFor(observation.currency, rates, observation.observedAt, freshnessDays)
  if (conversion === null) return { observation, inrPerSqFt: null, excludedReason: `No verified ${observation.currency}/INR rate at listing time` }
  const priceInInr = observation.displayedPrice * conversion
  let areaSqFt: number | null = null
  if (observation.unit === 'sq-ft') areaSqFt = 1
  if (observation.unit === 'sq-m') areaSqFt = 10.7639
  if (['hide', 'side', 'sheet', 'panel', 'piece'].includes(observation.unit) && observation.unitAreaSqFt && observation.unitAreaSqFt > 0) {
    areaSqFt = observation.unitAreaSqFt
  }
  if (observation.unit === 'kg') {
    return { observation, inrPerSqFt: null, excludedReason: 'Weight cannot be reliably converted to area without verified yield data' }
  }
  if (!areaSqFt) return { observation, inrPerSqFt: null, excludedReason: 'Verified area per unit is required' }
  if (!Number.isFinite(priceInInr) || priceInInr <= 0) {
    return { observation, inrPerSqFt: null, excludedReason: 'Invalid price or exchange rate' }
  }
  return { observation, inrPerSqFt: priceInInr / areaSqFt, excludedReason: null }
}

export function materialGroupKey(observation: PriceObservation): string {
  return [
    observation.segment,
    observation.species,
    observation.grade,
    observation.tanning,
    observation.finish,
    observation.country.trim().toLowerCase(),
    observation.thicknessMm === null ? 'thickness-unknown' : `${observation.thicknessMm.toFixed(1)}mm`,
    observation.minimumOrder.trim().toLowerCase() || 'minimum-unknown',
  ].join('|')
}

function isFresh(observation: PriceObservation, freshnessDays: number, now: number): boolean {
  const time = Date.parse(observation.observedAt)
  return Number.isFinite(time) && time <= now && now - time <= freshnessDays * 24 * 60 * 60 * 1000
}

export function calculateMarketAverages(
  observations: PriceObservation[],
  rates: ExchangeRateObservation[],
  freshnessDays: number,
  now = Date.now(),
): MarketAverage[] {
  const latestBySupplierProduct = new Map<string, PriceObservation>()
  for (const observation of observations) {
    const key = `${observation.supplier.trim().toLowerCase()}|${observation.productName.trim().toLowerCase()}`
    const prior = latestBySupplierProduct.get(key)
    if (!prior || Date.parse(observation.observedAt) > Date.parse(prior.observedAt)) {
      latestBySupplierProduct.set(key, observation)
    }
  }

  const groups = new Map<string, NormalizedObservation[]>()
  for (const observation of latestBySupplierProduct.values()) {
    if (!isFresh(observation, freshnessDays, now)) continue
    const normalized = normalizeObservation(observation, rates, now, freshnessDays)
    if (normalized.inrPerSqFt === null) continue
    const key = materialGroupKey(observation)
    const group = groups.get(key) ?? []
    group.push(normalized)
    groups.set(key, group)
  }

  return [...groups.entries()].map(([groupKey, entries]) => {
    const prices = entries.map((entry) => entry.inrPerSqFt!).sort((a, b) => a - b)
    const middle = Math.floor(prices.length / 2)
    const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2
    const latestObservedAt = entries
      .map((entry) => entry.observation.observedAt)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
    const supplierCount = new Set(entries.map((entry) => entry.observation.supplier.toLowerCase())).size
    const confidence: MarketAverage['confidence'] =
      entries.length >= 5 && supplierCount >= 3 ? 'high' : entries.length >= 3 && supplierCount >= 2 ? 'moderate' : 'low'
    return {
      mean: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      median,
      minimum: prices[0],
      maximum: prices[prices.length - 1],
      listingCount: entries.length,
      supplierCount,
      latestObservedAt,
      confidence,
      groupKey,
    }
  }).sort((a, b) => a.groupKey.localeCompare(b.groupKey))
}

export function listingExclusionReasons(
  observations: PriceObservation[],
  rates: ExchangeRateObservation[],
  freshnessDays: number,
  now = Date.now(),
): Map<string, string> {
  const latestBySupplierProduct = new Map<string, PriceObservation>()
  for (const observation of observations) {
    const key = `${observation.supplier.trim().toLowerCase()}|${observation.productName.trim().toLowerCase()}`
    const prior = latestBySupplierProduct.get(key)
    if (!prior || Date.parse(observation.observedAt) > Date.parse(prior.observedAt)) latestBySupplierProduct.set(key, observation)
  }
  const result = new Map<string, string>()
  for (const observation of observations) {
    const key = `${observation.supplier.trim().toLowerCase()}|${observation.productName.trim().toLowerCase()}`
    const latest = latestBySupplierProduct.get(key)
    if (latest?.id !== observation.id) {
      result.set(observation.id, 'Superseded duplicate; retained in history')
    } else if (!isFresh(observation, freshnessDays, now)) {
      result.set(observation.id, 'Stale observation')
    } else {
      const normalized = normalizeObservation(observation, rates, now, freshnessDays)
      if (normalized.excludedReason) result.set(observation.id, normalized.excludedReason)
      else result.set(observation.id, 'Eligible for its exact comparison group')
    }
  }
  return result
}

export function normalizeAreaPrice(price: number, currency: CurrencyCode, unit: PriceUnit, areaSqFt: number | null, rate: number | null): number | null {
  if (!Number.isFinite(price) || price <= 0) return null
  if (currency !== 'INR' && (!rate || rate <= 0)) return null
  if (unit === 'kg') return null
  const area = unit === 'sq-ft' ? 1 : unit === 'sq-m' ? 10.7639 : areaSqFt
  if (!area || !Number.isFinite(area) || area <= 0) return null
  return price * (currency === 'INR' ? 1 : rate!) / area
}
