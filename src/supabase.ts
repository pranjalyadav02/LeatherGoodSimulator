import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { QuoteRecord, InventoryItem } from './api'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here',
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'customer'
  phone?: string
}

/**
 * Fetch quotes directly from Supabase if configured, otherwise returns null
 */
export async function getQuotesFromSupabase(): Promise<QuoteRecord[] | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('bespoke_quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return null

    return data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
      },
      productId: row.product_id,
      productName: row.product_name,
      leatherId: row.leather_id,
      leatherName: row.leather_name,
      colorName: row.color_name,
      hardware: row.hardware,
      monogram: row.monogram,
      monogramMethod: row.monogram_method,
      dimensions: row.dimensions,
      totalPrice: Number(row.total_price),
      status: row.status,
      craftsman: row.craftsman,
      notes: row.notes,
      workshopSpec: row.workshop_spec,
      configuration: row.configuration,
    }))
  } catch (err) {
    console.warn('[Supabase] Falling back to backend/local storage:', err)
    return null
  }
}

/**
 * Insert a quote into Supabase
 */
export async function insertQuoteToSupabase(quote: QuoteRecord): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase.from('bespoke_quotes').insert([
      {
        id: quote.id,
        customer_name: quote.customer.name,
        customer_email: quote.customer.email,
        customer_phone: quote.customer.phone || null,
        product_id: quote.productId,
        product_name: quote.productName,
        leather_id: quote.leatherId,
        leather_name: quote.leatherName,
        color_name: quote.colorName,
        hardware: quote.hardware,
        monogram: quote.monogram || null,
        monogram_method: quote.monogramMethod || null,
        dimensions: quote.dimensions,
        total_price: quote.totalPrice,
        status: quote.status,
        craftsman: quote.craftsman || 'Unassigned',
        notes: quote.notes || null,
        workshop_spec: quote.workshopSpec || null,
        configuration: quote.configuration || {},
      },
    ])

    return !error
  } catch {
    return false
  }
}

/**
 * Update quote status in Supabase
 */
export async function updateQuoteStatusInSupabase(
  id: string,
  status: QuoteRecord['status'],
  craftsman?: string,
): Promise<boolean> {
  if (!supabase) return false

  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (craftsman) updates.craftsman = craftsman

    const { error } = await supabase.from('bespoke_quotes').update(updates).eq('id', id)

    return !error
  } catch {
    return false
  }
}

/**
 * Fetch inventory from Supabase
 */
export async function getInventoryFromSupabase(): Promise<InventoryItem[] | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase.from('inventory').select('*')
    if (error || !data) return null

    return data.map((row) => ({
      id: row.id,
      category: row.category,
      name: row.name,
      stockSqFt: row.stock_sq_ft != null ? Number(row.stock_sq_ft) : undefined,
      minThresholdSqFt: row.min_threshold_sq_ft != null ? Number(row.min_threshold_sq_ft) : undefined,
      ratePerSqFt: row.rate_per_sq_ft != null ? Number(row.rate_per_sq_ft) : undefined,
      stockUnits: row.stock_units != null ? Number(row.stock_units) : undefined,
      minThresholdUnits: row.min_threshold_units != null ? Number(row.min_threshold_units) : undefined,
      costPerUnit: row.cost_per_unit != null ? Number(row.cost_per_unit) : undefined,
      supplier: row.supplier,
      status: row.status,
      thicknessMm: row.thickness_mm != null ? Number(row.thickness_mm) : undefined,
    }))
  } catch {
    return null
  }
}
