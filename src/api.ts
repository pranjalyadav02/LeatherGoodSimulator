import type { Configuration, ProductId, LeatherId, HardwareId } from './types'
import {
  getQuotesFromSupabase,
  insertQuoteToSupabase,
  updateQuoteStatusInSupabase,
  getInventoryFromSupabase,
  getPriceHistoryFromSupabase,
  recordPriceHistoryInSupabase,
  updateInventoryInSupabase,
  subscribeToRealtimePriceUpdates,
  isSupabaseConfigured,
  type PriceHistoryRecord,
} from './supabase'

export type { PriceHistoryRecord }

export interface CustomerInfo {
  name: string
  email: string
  phone?: string
  location?: string
}

export interface QuoteRecord {
  id: string
  createdAt: string
  customer: CustomerInfo
  productId: ProductId
  productName: string
  leatherId: LeatherId
  leatherName: string
  colorName: string
  hardware: HardwareId
  monogram?: string
  monogramMethod?: string
  dimensions: string
  totalPrice: number
  status:
    | 'New Quote Request'
    | 'Bench Approved'
    | 'In Cutting Bench'
    | 'In Stitching'
    | 'Quality Inspection Passed'
    | 'Ready for Dispatch'
    | 'Archived'
  craftsman?: string
  notes?: string
  workshopSpec?: string
  configuration?: Configuration
}

export interface InventoryItem {
  id: string
  category: 'Leather Hides' | 'Hardware Kits' | 'Craft Supplies'
  name: string
  stockSqFt?: number
  minThresholdSqFt?: number
  ratePerSqFt?: number
  stockUnits?: number
  minThresholdUnits?: number
  costPerUnit?: number
  supplier: string
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reorder Placed'
  thicknessMm?: number
}

export interface RecommendationProposal {
  id: string
  title: string
  subtitle: string
  score: number
  suitability: string
  targetPrice: number
  highlights: string[]
  config: Partial<Configuration>
  harmonyScore: number
  rationale: string
}

const API_BASE = '/api'

export async function fetchHealth(): Promise<{ status: string; uptimeSeconds: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchQuotes(): Promise<QuoteRecord[]> {
  if (isSupabaseConfigured) {
    const sbQuotes = await getQuotesFromSupabase()
    if (sbQuotes && sbQuotes.length > 0) return sbQuotes
  }

  try {
    const res = await fetch(`${API_BASE}/quotes`)
    if (!res.ok) throw new Error('Network error')
    const data = await res.json()
    return data.quotes
  } catch {
    const local = localStorage.getItem('atelier_local_quotes')
    if (local) {
      try {
        return JSON.parse(local)
      } catch {
        // fallback
      }
    }
    return []
  }
}

export async function submitBespokeQuote(quote: Partial<QuoteRecord>): Promise<QuoteRecord> {
  let createdQuote: QuoteRecord | null = null

  try {
    const res = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote),
    })
    if (!res.ok) throw new Error('Failed to submit quote')
    const data = await res.json()
    createdQuote = data.quote
  } catch {
    const fallback: QuoteRecord = {
      id: `Q-LOCAL-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      customer: quote.customer ?? { name: 'Anonymous Client', email: 'guest@carrytote.in' },
      productId: quote.productId ?? 'tote',
      productName: quote.productName ?? 'Everyday Tote Bag',
      leatherId: quote.leatherId ?? 'heritage-calf',
      leatherName: quote.leatherName ?? 'Heritage Calf',
      colorName: quote.colorName ?? 'Cognac Tan',
      hardware: quote.hardware ?? 'brass',
      monogram: quote.monogram ?? '',
      monogramMethod: quote.monogramMethod ?? 'gold_foil',
      dimensions: quote.dimensions ?? 'Standard Proportions',
      totalPrice: quote.totalPrice ?? 4500,
      status: 'New Quote Request',
      craftsman: 'Bench Intake',
      notes: quote.notes ?? '',
      workshopSpec: quote.workshopSpec ?? '',
      configuration: quote.configuration,
    }
    const existing = await fetchQuotes()
    existing.unshift(fallback)
    localStorage.setItem('atelier_local_quotes', JSON.stringify(existing))
    createdQuote = fallback
  }

  if (isSupabaseConfigured && createdQuote) {
    void insertQuoteToSupabase(createdQuote)
  }

  return createdQuote!
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteRecord['status'],
  craftsman?: string,
  notes?: string,
): Promise<boolean> {
  if (isSupabaseConfigured) {
    void updateQuoteStatusInSupabase(id, status, craftsman)
  }

  try {
    const res = await fetch(`${API_BASE}/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, craftsman, notes }),
    })
    return res.ok
  } catch {
    const quotes = await fetchQuotes()
    const index = quotes.findIndex((q) => q.id === id)
    if (index !== -1) {
      quotes[index].status = status
      if (craftsman) quotes[index].craftsman = craftsman
      if (notes) quotes[index].notes = notes
      localStorage.setItem('atelier_local_quotes', JSON.stringify(quotes))
      return true
    }
    return false
  }
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  if (isSupabaseConfigured) {
    const sbInv = await getInventoryFromSupabase()
    if (sbInv && sbInv.length > 0) return sbInv
  }

  try {
    const res = await fetch(`${API_BASE}/inventory`)
    if (!res.ok) throw new Error('Inventory network error')
    const data = await res.json()
    return data.inventory
  } catch {
    return []
  }
}

export async function updateInventory(
  id: string,
  updates: Partial<InventoryItem>,
  options?: { oldPrice?: number; reason?: string; changedBy?: string; itemName?: string },
): Promise<boolean> {
  // 1. If connected to Supabase, update database
  if (isSupabaseConfigured) {
    void updateInventoryInSupabase(id, updates)
  }

  // 2. If rate changed, record to price history
  if (updates.ratePerSqFt !== undefined && options?.oldPrice !== undefined && updates.ratePerSqFt !== options.oldPrice) {
    const changePct = Number(
      (((updates.ratePerSqFt - options.oldPrice) / (options.oldPrice || 1)) * 100).toFixed(2),
    )
    void recordPriceChange({
      itemId: id,
      itemName: options.itemName || updates.name || id,
      category: 'Leather Hides',
      oldPrice: options.oldPrice,
      newPrice: updates.ratePerSqFt,
      changePercentage: changePct,
      changedBy: options.changedBy || 'Master Craftsman Rajesh K.',
      reason: options.reason || 'Atelier procurement hide rate adjustment',
    })
  }

  // 3. Broadcast real-time change across tabs immediately
  if (priceSyncChannel && updates.ratePerSqFt !== undefined) {
    try {
      priceSyncChannel.postMessage({
        type: 'PRICE_UPDATE',
        itemId: id,
        newRate: updates.ratePerSqFt,
        itemName: options?.itemName || updates.name || id,
      })
    } catch {
      // broadcast fallback
    }
  }

  try {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.ok
  } catch {
    return true
  }
}

const INITIAL_PRICE_HISTORY: PriceHistoryRecord[] = [
  {
    id: 'ph-001',
    itemId: 'heritage-calf',
    itemName: 'Heritage Full-Grain Calf',
    category: 'Leather Hides',
    oldPrice: 240,
    newPrice: 260,
    changePercentage: 8.33,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Q1 Alpine tanners raw hide cost normalization',
    createdAt: '2026-01-15T10:30:00.000Z',
  },
  {
    id: 'ph-002',
    itemId: 'saddle-hide',
    itemName: 'Saddle Hide (Heavy Veg-Tan)',
    category: 'Leather Hides',
    oldPrice: 260,
    newPrice: 280,
    changePercentage: 7.69,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Tree-bark vegetable extract tariff adjustment',
    createdAt: '2026-02-01T14:15:00.000Z',
  },
  {
    id: 'ph-003',
    itemId: 'pebble-grain',
    itemName: 'Pebble Grain Calf',
    category: 'Leather Hides',
    oldPrice: 225,
    newPrice: 210,
    changePercentage: -6.67,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Bulk procurement rebate from Ranipet Tannery',
    createdAt: '2026-02-20T09:45:00.000Z',
  },
  {
    id: 'ph-004',
    itemId: 'saffiano',
    itemName: 'Saffiano Cross-Grain',
    category: 'Leather Hides',
    oldPrice: 220,
    newPrice: 235,
    changePercentage: 6.82,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Import air freight surcharge update',
    createdAt: '2026-03-05T11:20:00.000Z',
  },
]

const priceSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('atelier_price_sync') : null

/**
 * Fetch price history audit logs from Supabase, backend or local storage
 */
export async function fetchPriceHistory(): Promise<PriceHistoryRecord[]> {
  if (isSupabaseConfigured) {
    const sbHistory = await getPriceHistoryFromSupabase()
    if (sbHistory && sbHistory.length > 0) return sbHistory
  }

  try {
    const res = await fetch(`${API_BASE}/price-history`)
    if (res.ok) {
      const data = await res.json()
      if (data.history && data.history.length > 0) return data.history
    }
  } catch {
    // fallback
  }

  const raw = localStorage.getItem('atelier_price_history')
  if (raw) {
    try {
      return JSON.parse(raw) as PriceHistoryRecord[]
    } catch {
      // fallback
    }
  }

  return INITIAL_PRICE_HISTORY
}

/**
 * Record a price adjustment
 */
export async function recordPriceChange(
  record: Omit<PriceHistoryRecord, 'id' | 'createdAt'>,
): Promise<PriceHistoryRecord> {
  const newRecord: PriceHistoryRecord = {
    ...record,
    id: `ph-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }

  if (isSupabaseConfigured) {
    void recordPriceHistoryInSupabase(record)
  }

  try {
    await fetch(`${API_BASE}/price-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    })
  } catch {
    // fallback
  }

  // Update local storage
  try {
    const history = await fetchPriceHistory()
    const updated = [newRecord, ...history]
    localStorage.setItem('atelier_price_history', JSON.stringify(updated))
  } catch {
    // fallback
  }

  return newRecord
}

/**
 * Subscribe to real-time price updates (Supabase Realtime + cross-tab BroadcastChannel)
 */
export function subscribeToRealtimePrices(
  onRateChange: (itemId: string, newRate: number, itemName: string) => void,
  onHistoryAdded?: (record: PriceHistoryRecord) => void,
): () => void {
  // 1. Supabase Realtime
  const unsubscribeSupabase = subscribeToRealtimePriceUpdates(onRateChange, onHistoryAdded)

  // 2. Cross-tab BroadcastChannel
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'PRICE_UPDATE' && event.data?.itemId && event.data?.newRate != null) {
      onRateChange(event.data.itemId, Number(event.data.newRate), event.data.itemName || event.data.itemId)
    }
  }

  if (priceSyncChannel) {
    priceSyncChannel.addEventListener('message', handleBroadcast)
  }

  return () => {
    if (unsubscribeSupabase) unsubscribeSupabase()
    if (priceSyncChannel) {
      priceSyncChannel.removeEventListener('message', handleBroadcast)
    }
  }
}

export async function fetchRecommendations(
  productId: ProductId,
  useCase: 'daily_office' | 'travel_commute' | 'formal_luxury' | 'minimalist_edc' | 'weather_rugged',
  targetBudget?: number,
  currentConfig?: Partial<Configuration>,
): Promise<RecommendationProposal[]> {
  try {
    const res = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, useCase, targetBudget, currentConfig }),
    })
    if (!res.ok) throw new Error('Recommendation network error')
    const data = await res.json()
    return data.recommendations
  } catch {
    return []
  }
}
