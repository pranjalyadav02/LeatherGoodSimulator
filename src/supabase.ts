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

export interface PriceHistoryRecord {
  id: string
  itemId: string
  itemName: string
  category: string
  oldPrice: number
  newPrice: number
  changePercentage: number
  changedBy: string
  reason?: string
  createdAt: string
}

/**
 * Fetch price history from Supabase
 */
export async function getPriceHistoryFromSupabase(): Promise<PriceHistoryRecord[] | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return null

    return data.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      category: row.category,
      oldPrice: Number(row.old_price),
      newPrice: Number(row.new_price),
      changePercentage: Number(row.change_percentage),
      changedBy: row.changed_by,
      reason: row.reason,
      createdAt: row.created_at,
    }))
  } catch {
    return null
  }
}

/**
 * Record a price adjustment into Supabase
 */
export async function recordPriceHistoryInSupabase(
  record: Omit<PriceHistoryRecord, 'id' | 'createdAt'>,
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase.from('price_history').insert([
      {
        id: `ph-${Date.now().toString(36)}`,
        item_id: record.itemId,
        item_name: record.itemName,
        category: record.category,
        old_price: record.oldPrice,
        new_price: record.newPrice,
        change_percentage: record.changePercentage,
        changed_by: record.changedBy,
        reason: record.reason || 'Artisan hide rate adjustment',
      },
    ])
    return !error
  } catch {
    return false
  }
}

/**
 * Update inventory item in Supabase
 */
export async function updateInventoryInSupabase(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<boolean> {
  if (!supabase) return false

  try {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.ratePerSqFt !== undefined) dbUpdates.rate_per_sq_ft = updates.ratePerSqFt
    if (updates.stockSqFt !== undefined) dbUpdates.stock_sq_ft = updates.stockSqFt
    if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit
    if (updates.stockUnits !== undefined) dbUpdates.stock_units = updates.stockUnits
    if (updates.status !== undefined) dbUpdates.status = updates.status

    const { error } = await supabase.from('inventory').update(dbUpdates).eq('id', id)
    return !error
  } catch {
    return false
  }
}

/**
 * Subscribe to real-time price & inventory updates from Supabase
 */
export function subscribeToRealtimePriceUpdates(
  onRateChange: (itemId: string, newRate: number, itemName: string) => void,
  onHistoryAdded?: (record: PriceHistoryRecord) => void,
): (() => void) | null {
  if (!supabase) return null

  try {
    const channel = supabase
      .channel('atelier-realtime-prices')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inventory' },
        (payload) => {
          const row = payload.new as { id?: string; rate_per_sq_ft?: number; name?: string }
          if (row?.id && row?.rate_per_sq_ft != null) {
            onRateChange(row.id, Number(row.rate_per_sq_ft), row.name || row.id)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_history' },
        (payload) => {
          const row = payload.new as {
            id: string
            item_id: string
            item_name: string
            category: string
            old_price: number
            new_price: number
            change_percentage: number
            changed_by: string
            reason?: string
            created_at: string
          }
          if (row?.id && onHistoryAdded) {
            onHistoryAdded({
              id: row.id,
              itemId: row.item_id,
              itemName: row.item_name,
              category: row.category,
              oldPrice: Number(row.old_price),
              newPrice: Number(row.new_price),
              changePercentage: Number(row.change_percentage),
              changedBy: row.changed_by,
              reason: row.reason,
              createdAt: row.created_at,
            })
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn('[Supabase Realtime] Could not subscribe:', err)
    return null
  }
}

