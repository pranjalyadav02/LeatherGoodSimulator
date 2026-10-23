import type { Configuration, ProductId, LeatherId, HardwareId } from './types'
import {
  getQuotesFromSupabase,
  insertQuoteToSupabase,
  updateQuoteStatusInSupabase,
  getInventoryFromSupabase,
  isSupabaseConfigured,
} from './supabase'

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

export async function updateInventory(id: string, updates: Partial<InventoryItem>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.ok
  } catch {
    return false
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
