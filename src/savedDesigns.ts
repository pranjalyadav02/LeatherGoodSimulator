import { LEATHERS, PRODUCTS } from './catalog'
import { validateConfiguration } from './engine'
import type { Configuration } from './types'

export const SAVED_DESIGNS_KEY = 'atelier-saved-designs-v1'

export type SavedDesign = {
  id: string
  version: number
  savedAt: string
  configuration: Configuration
}

function isConfiguration(value: unknown): value is Configuration {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<Configuration>
  if (
    !PRODUCTS.some((product) => product.id === config.productId) ||
    !LEATHERS.some((leather) => leather.id === config.leatherId) ||
    typeof config.colorId !== 'string' ||
    !['brass', 'silver', 'black', 'rose', 'gunmetal'].includes(config.hardware ?? '') ||
    !['embossed', 'engraved', 'gold_foil', 'silver_foil', 'rose_foil', 'blind_deboss'].includes(config.monogramMethod ?? '') ||
    !['widthCm', 'heightCm', 'depthCm'].every((key) => typeof config[key as keyof Configuration] === 'number') ||
    typeof config.monogram !== 'string' ||
    typeof config.removableStrap !== 'boolean' ||
    typeof config.paddedLining !== 'boolean' ||
    typeof config.pocketCount !== 'number' ||
    typeof config.customRequest !== 'string'
  ) return false
  return validateConfiguration(config as Configuration).every((issue) => issue.severity !== 'error')
}

export function loadSavedDesigns(): SavedDesign[] {
  const raw = localStorage.getItem(SAVED_DESIGNS_KEY)
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error('Saved designs are unreadable. No design was loaded; clear or repair this browser’s design storage.', { cause: error })
  }
  if (!Array.isArray(parsed)) throw new Error('Saved designs have an unsupported format; no design was loaded.')
  const valid: SavedDesign[] = []
  for (const item of parsed) {
    if (
      item &&
      typeof item.id === 'string' &&
      /^[\w-]{8,80}$/.test(item.id) &&
      Number.isInteger(item.version) &&
      item.version > 0 &&
      typeof item.savedAt === 'string' &&
      Number.isFinite(Date.parse(item.savedAt)) &&
      isConfiguration(item.configuration)
    ) {
      valid.push(item as SavedDesign)
    }
  }
  return valid.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
}

function newDesignId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `design-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function saveDesignVersion(
  existing: SavedDesign[],
  configuration: Configuration,
  designId?: string,
): { designs: SavedDesign[]; saved: SavedDesign } {
  if (!isConfiguration(configuration)) throw new Error('This design has invalid options and cannot be saved as a valid version.')
  const id = designId ?? newDesignId()
  const previous = existing.filter((item) => item.id === id).sort((a, b) => b.version - a.version)[0]
  const saved: SavedDesign = {
    id,
    version: (previous?.version ?? 0) + 1,
    savedAt: new Date().toISOString(),
    configuration: structuredClone(configuration),
  }
  const designs = [saved, ...existing]
  try {
    localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(designs))
  } catch (error) {
    throw new Error('Could not save this design in browser storage. Check available storage and try again.', { cause: error })
  }
  return { designs, saved }
}

export function resolveSavedDesign(designs: SavedDesign[], id: string, version: number): Configuration | null {
  const saved = designs.find((item) => item.id === id && item.version === version)
  if (!saved || !isConfiguration(saved.configuration)) return null
  return structuredClone(saved.configuration)
}

export function isSavedSnapshot(
  designs: SavedDesign[],
  id: string | null,
  version: number,
  configuration: Configuration,
): boolean {
  if (!id || version < 1) return false
  const saved = designs.find((item) => item.id === id && item.version === version)
  return !!saved && JSON.stringify(saved.configuration) === JSON.stringify(configuration)
}

export function newDesignIdentity(): { id: string | null; version: number } {
  return { id: null, version: 0 }
}
