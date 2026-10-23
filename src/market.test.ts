import { describe, expect, it } from 'vitest'
import {
  calculateMarketAverages,
  convertSupplierPrice,
  normalizeAreaPrice,
  normalizeObservation,
  type ExchangeRateObservation,
  type PriceObservation,
} from './market'

const timestamp = '2026-10-22T12:00:00.000Z'

function listing(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    id: 'one',
    sourceId: 'source',
    supplier: 'Supplier A',
    productName: 'Vegetable-tanned cow hide',
    sourceUrl: 'https://supplier.example/product',
    species: 'cow',
    grade: 'full-grain',
    tanning: 'vegetable',
    finish: 'smooth',
    thicknessMm: 1.8,
    country: 'India',
    displayedPrice: 100,
    currency: 'INR',
    unit: 'sq-ft',
    unitAreaSqFt: null,
    minimumOrder: '',
    segment: 'retail',
    stock: 'in-stock',
    taxesShipping: '',
    observedAt: timestamp,
    expiresAt: null,
    verification: 'verified',
    verifiedBy: 'Reviewer',
    correctionReason: 'Supplier product page checked',
    ...overrides,
  }
}

const rates: ExchangeRateObservation[] = [{
  id: 'usd-rate',
  currency: 'USD',
  inrPerUnit: 80,
  sourceUrl: 'https://rates.example/usd',
  observedAt: '2026-10-21T12:00:00.000Z',
  verifiedBy: 'Reviewer',
}]

describe('market price normalization', () => {
  it('converts square metres to square feet with the stated factor', () => {
    expect(normalizeAreaPrice(107.639, 'INR', 'sq-m', null, null)).toBeCloseTo(10, 5)
  })

  it('normalizes imported price only with a previously observed rate', () => {
    const normalized = normalizeObservation(listing({
      displayedPrice: 10,
      currency: 'USD',
      unit: 'sq-ft',
    }), rates)
    expect(normalized.inrPerSqFt).toBe(800)
    expect(normalizeObservation(listing({
      displayedPrice: 10,
      currency: 'EUR',
      unit: 'sq-ft',
    }), rates).excludedReason).toContain('No verified EUR/INR rate')
    const converted = convertSupplierPrice(listing({
      displayedPrice: 10,
      currency: 'USD',
      unit: 'sq-ft',
    }), rates)
    expect(converted?.amountInInr).toBe(800)
    expect(converted?.sourceUrl).toBe('https://rates.example/usd')
  })

  it('does not use an exchange rate older than the configured freshness window', () => {
    const normalized = normalizeObservation(listing({
      displayedPrice: 10,
      currency: 'USD',
      unit: 'sq-ft',
      observedAt: '2026-10-23T12:00:00.000Z',
    }), rates, Date.parse('2026-10-23T12:00:00.000Z'), 1)
    expect(normalized.excludedReason).toContain('No verified USD/INR rate')
  })

  it('does not guess hide area or convert kilograms to area', () => {
    const hide = normalizeObservation(listing({ unit: 'hide', unitAreaSqFt: null }), [])
    const kg = normalizeObservation(listing({ unit: 'kg', unitAreaSqFt: 10 }), [])
    expect(hide.excludedReason).toContain('area per unit')
    expect(kg.excludedReason).toContain('Weight cannot')
    expect(normalizeAreaPrice(100, 'INR', 'hide', null, null)).toBeNull()
  })

  it('calculates mean, median and ranges from fresh eligible listings only', () => {
    const observations = [
      listing({ id: 'a', supplier: 'A', displayedPrice: 100 }),
      listing({ id: 'b', supplier: 'B', displayedPrice: 200 }),
      listing({ id: 'c', supplier: 'C', displayedPrice: 900 }),
      listing({ id: 'oos', supplier: 'D', displayedPrice: 1, stock: 'out-of-stock' }),
      listing({ id: 'stale', supplier: 'E', displayedPrice: 1, observedAt: '2020-01-01T00:00:00.000Z' }),
    ]
    const result = calculateMarketAverages(observations, [], 30, Date.parse('2026-10-23T12:00:00.000Z'))
    expect(result).toHaveLength(1)
    expect(result[0].mean).toBe(400)
    expect(result[0].median).toBe(200)
    expect(result[0].minimum).toBe(100)
    expect(result[0].maximum).toBe(900)
    expect(result[0].listingCount).toBe(3)
    expect(result[0].supplierCount).toBe(3)
    expect(result[0].confidence).toBe('moderate')
  })

  it('uses the latest supplier-product snapshot without double counting', () => {
    const observations = [
      listing({ id: 'old', supplier: 'Same', observedAt: '2026-10-20T12:00:00.000Z', displayedPrice: 100 }),
      listing({ id: 'new', supplier: 'Same', observedAt: timestamp, displayedPrice: 150 }),
      listing({ id: 'other', supplier: 'Other', productName: 'Another hide', displayedPrice: 200 }),
    ]
    const result = calculateMarketAverages(observations, [], 30, Date.parse('2026-10-23T12:00:00.000Z'))
    expect(result).toHaveLength(1)
    expect(result[0].mean).toBe(175)
    expect(result[0].listingCount).toBe(2)
  })

  it('keeps different segments, origins, thicknesses and species in separate groups', () => {
    const result = calculateMarketAverages([
      listing({ id: 'retail', supplier: 'A', displayedPrice: 100 }),
      listing({ id: 'wholesale', supplier: 'B', segment: 'wholesale', displayedPrice: 50 }),
      listing({ id: 'buffalo', supplier: 'C', species: 'buffalo', displayedPrice: 30 }),
      listing({ id: 'thicker', supplier: 'D', thicknessMm: 2.4, displayedPrice: 80 }),
    ], [], 30, Date.parse('2026-10-23T12:00:00.000Z'))
    expect(result).toHaveLength(4)
  })

  it('does not combine listings with different purchase minimums', () => {
    const result = calculateMarketAverages([
      listing({ id: 'minimum-one', supplier: 'A', minimumOrder: '1 sq ft' }),
      listing({ id: 'minimum-hide', supplier: 'B', minimumOrder: '1 hide' }),
    ], [], 30, Date.parse('2026-10-23T12:00:00.000Z'))
    expect(result).toHaveLength(2)
  })

  it('excludes unverified and poorly classified listings', () => {
    expect(normalizeObservation(listing({ verification: 'pending' }), []).excludedReason).toBe('Not verified')
    expect(normalizeObservation(listing({ grade: 'unknown' }), []).excludedReason).toContain('Insufficient material classification')
  })

  it('excludes expired quotations from current averages', () => {
    expect(normalizeObservation(listing({ expiresAt: '2026-10-22T00:00:00.000Z' }), []).excludedReason).toBe('Quotation has expired')
  })
})
