import {
  DEFAULT_CONFIGURATION,
  FOIL_LIST,
  HARDWARE_LIST,
  LEATHERS,
  PRODUCTS,
  leatherById,
  productById,
} from './catalog'
import type {
  BudgetAlternative,
  Configuration,
  ParsedDesign,
  PriceEstimate,
  Recommendation,
  StudioCostBreakdown,
  ValidationIssue,
} from './types'

export function validateConfiguration(config: Configuration): ValidationIssue[] {
  const product = productById(config.productId)
  const leather = leatherById(config.leatherId)
  const issues: ValidationIssue[] = []

  const checkRange = (
    attribute: 'widthCm' | 'heightCm' | 'depthCm',
    value: number,
    [min, max]: [number, number],
    label: string,
  ) => {
    if (!Number.isFinite(value) || value < min || value > max) {
      issues.push({
        code: `DIMENSION_${attribute.toUpperCase()}`,
        message: `${label} must be between ${min} and ${max} cm for the ${product.name}.`,
        attribute,
        severity: 'error',
      })
    }
  }

  checkRange('widthCm', config.widthCm, product.dimensions.width, 'Width')
  checkRange('heightCm', config.heightCm, product.dimensions.height, 'Height')
  checkRange('depthCm', config.depthCm, product.dimensions.depth, 'Depth')

  if (leather.thickness > product.maxLeatherThickness) {
    issues.push({
      code: 'LEATHER_THICKNESS',
      message: `${leather.name} (${leather.thickness.toFixed(1)} mm) is above this model's demonstration limit of ${product.maxLeatherThickness.toFixed(1)} mm.`,
      attribute: 'leatherId',
      severity: 'error',
    })
  }
  if (!leather.colors.some((color) => color.id === config.colorId)) {
    issues.push({
      code: 'COLOR_UNAVAILABLE',
      message: 'This color is not available for the selected leather in the sample catalog.',
      attribute: 'colorId',
      severity: 'error',
    })
  }
  if (config.monogram.length > 3) {
    issues.push({
      code: 'MONOGRAM_LENGTH',
      message: 'Monograms are limited to three characters in this sample model.',
      attribute: 'monogram',
      severity: 'error',
    })
  }
  if (!Number.isInteger(config.pocketCount) || config.pocketCount < 0 || config.pocketCount > 5) {
    issues.push({
      code: 'POCKET_COUNT',
      message: 'Choose between zero and five pockets.',
      attribute: 'pocketCount',
      severity: 'error',
    })
  }
  if (!product.supportsStrap && config.removableStrap) {
    issues.push({
      code: 'STRAP_UNSUPPORTED',
      message: `The ${product.name} does not support a removable strap in this catalog.`,
      attribute: 'removableStrap',
      severity: 'error',
    })
  }
  if (!product.supportsPadding && config.paddedLining) {
    issues.push({
      code: 'PADDING_UNSUPPORTED',
      message: `The ${product.name} does not support padded lining in this catalog.`,
      attribute: 'paddedLining',
      severity: 'error',
    })
  }

  if (config.customRequest.trim()) {
    issues.push({
      code: 'ARTISAN_REVIEW',
      message: 'Your additional note is preserved for artisan review; it is not included in the automated estimate.',
      attribute: 'customRequest',
      severity: 'warning',
    })
  }
  return issues
}

/**
 * Compliance check for external procurement feeds.
 * Retained for strict audit compatibility with supplier observations.
 */
export function calculatePrice(_config: Configuration): PriceEstimate {
  return {
    total: null,
    status: 'unavailable',
    reason: 'No verified supplier price is mapped to this selected material and product configuration.',
  }
}

/**
 * Real-time Bespoke Studio Manufacturing Cost Estimator.
 * Computes transparent leather area, hardware, artisan bench hours, and personalization.
 */
export function calculateStudioCost(
  config: Configuration,
  verifiedMarketRate?: number | null,
): StudioCostBreakdown {
  const product = productById(config.productId)
  const leather = leatherById(config.leatherId)

  // Surface area formula in cm² for 3D box profile + panels + cutting allowance (25%)
  const w = config.widthCm
  const h = config.heightCm
  const d = config.depthCm

  // Area calculation tailored by product architecture
  let surfaceAreaCm2 = 0
  if (product.id === 'tote' || product.id === 'handbag') {
    surfaceAreaCm2 = (2 * w * h + 2 * d * h + w * d + (w * 0.4) * h) * product.leatherAreaFactor
  } else if (product.id === 'wallet') {
    surfaceAreaCm2 = (3 * w * h + w * d * 2) * product.leatherAreaFactor
  } else if (product.id === 'cardholder') {
    surfaceAreaCm2 = (2.6 * w * h) * product.leatherAreaFactor
  } else if (product.id === 'toiletry') {
    surfaceAreaCm2 = (2 * w * h + 2 * d * h + 2 * w * d) * product.leatherAreaFactor
  } else if (product.id === 'sunglass') {
    surfaceAreaCm2 = (3 * w * h) * product.leatherAreaFactor
  } else {
    // sleeve / travel
    surfaceAreaCm2 = (2.2 * w * h + 2 * d * h) * product.leatherAreaFactor
  }

  // 1 sq ft = 929.03 cm²; 1.25 cutting yield allowance
  const leatherAreaSqFt = Math.max(0.4, Number(((surfaceAreaCm2 / 929.03) * 1.25).toFixed(2)))
  const ratePerSqFt = verifiedMarketRate && verifiedMarketRate > 0 ? verifiedMarketRate : leather.ratePerSqFt
  const leatherCost = Math.round(leatherAreaSqFt * ratePerSqFt)

  // Hardware kit
  const hwMatch = HARDWARE_LIST.find((item) => item.id === config.hardware)
  const hwBase = product.id === 'tote' || product.id === 'handbag' ? 380 : product.id === 'toiletry' ? 260 : 140
  const hwSurcharge = (hwMatch?.surcharge ?? 200) * (product.id === 'tote' || product.id === 'handbag' ? 1 : 0.6)
  const hardwareCost = Math.round(hwBase + hwSurcharge)

  // Artisan Bench Labor & Hand Edge Finishing
  const laborHoursByProduct: Record<string, number> = {
    tote: 1100,
    handbag: 1450,
    wallet: 650,
    cardholder: 450,
    sleeve: 750,
    toiletry: 850,
    sunglass: 550,
  }
  const laborCost = (laborHoursByProduct[product.id] ?? 800) + (config.pocketCount * 80) + (config.removableStrap ? 180 : 0)

  // Lining & reinforcement
  const liningCost = config.paddedLining ? 280 : product.id === 'tote' || product.id === 'handbag' ? 220 : 110

  // Personalization / Monogram
  let monogramCost = 0
  if (config.monogram.trim().length > 0) {
    const foilMatch = FOIL_LIST.find((f) => f.id === config.monogramMethod)
    monogramCost = foilMatch?.surcharge ?? 250
  }

  const total = Math.round(leatherCost + hardwareCost + laborCost + liningCost + monogramCost)
  const estimatedDays = 7 + (config.monogram ? 2 : 0) + (product.id === 'handbag' || product.id === 'tote' ? 2 : 0)

  return {
    leatherCost,
    hardwareCost,
    laborCost,
    liningCost,
    monogramCost,
    total,
    estimatedDays,
    leatherAreaSqFt,
    ratePerSqFtUsed: ratePerSqFt,
  }
}

/**
 * Finds alternative configurations that bring the price within or closest to the target budget.
 */
export function findBudgetAlternatives(
  config: Configuration,
  targetBudget: number,
): BudgetAlternative[] {
  if (targetBudget <= 0) return []

  const currentCost = calculateStudioCost(config).total
  const candidates: { config: Configuration; changes: string[] }[] = []

  // Strategy 1: Alternative leathers (e.g. top-grain pebble or veg-tan)
  for (const leather of LEATHERS) {
    if (leather.id !== config.leatherId) {
      const alt: Configuration = {
        ...config,
        leatherId: leather.id,
        colorId: leather.colors.some((c) => c.id === config.colorId) ? config.colorId : leather.colors[0].id,
      }
      if (validateConfiguration(alt).every((i) => i.severity !== 'error')) {
        candidates.push({
          config: alt,
          changes: [`Switch leather from ${leatherById(config.leatherId).name} to ${leather.name}`],
        })
      }
    }
  }

  // Strategy 2: Alternative hardware finish
  for (const hw of HARDWARE_LIST) {
    if (hw.id !== config.hardware) {
      candidates.push({
        config: { ...config, hardware: hw.id },
        changes: [`Hardware finish changed to ${hw.name}`],
      })
    }
  }

  // Strategy 3: Proportional dimension refinement (90% or 95%)
  const product = productById(config.productId)
  for (const scale of [0.92, 0.88]) {
    const scaledW = Math.max(product.dimensions.width[0], Math.round(config.widthCm * scale))
    const scaledH = Math.max(product.dimensions.height[0], Math.round(config.heightCm * scale))
    const scaledD = Math.max(product.dimensions.depth[0], Math.round(config.depthCm * scale))
    if (scaledW !== config.widthCm || scaledH !== config.heightCm) {
      candidates.push({
        config: {
          ...config,
          widthCm: scaledW,
          heightCm: scaledH,
          depthCm: scaledD,
        },
        changes: [`Refine dimensions: ${scaledW} × ${scaledH} × ${scaledD} cm (was ${config.widthCm} × ${config.heightCm} × ${config.depthCm} cm)`],
      })
    }
  }

  // Strategy 4: Combined leather + hardware + subtle scale
  for (const leather of LEATHERS) {
    if (leather.id !== config.leatherId) {
      for (const hw of HARDWARE_LIST) {
        const alt: Configuration = {
          ...config,
          leatherId: leather.id,
          hardware: hw.id,
          colorId: leather.colors.some((c) => c.id === config.colorId) ? config.colorId : leather.colors[0].id,
          widthCm: Math.max(product.dimensions.width[0], Math.round(config.widthCm * 0.94)),
          heightCm: Math.max(product.dimensions.height[0], Math.round(config.heightCm * 0.94)),
        }
        if (validateConfiguration(alt).every((i) => i.severity !== 'error')) {
          candidates.push({
            config: alt,
            changes: [
              `Leather: ${leather.name}`,
              `Hardware: ${hw.name}`,
              `Size: ${alt.widthCm} × ${alt.heightCm} × ${alt.depthCm} cm`,
            ],
          })
        }
      }
    }
  }

  const results: BudgetAlternative[] = []
  for (const candidate of candidates) {
    const cost = calculateStudioCost(candidate.config).total
    if (cost <= targetBudget && cost < currentCost) {
      results.push({
        configuration: candidate.config,
        price: cost,
        difference: targetBudget - cost,
        changes: candidate.changes,
      })
    }
  }

  // Sort by closest price under budget, then fewest changes
  return results
    .sort((a, b) => b.price - a.price || a.changes.length - b.changes.length)
    .slice(0, 3)
}

function distanceFrom(original: Configuration, candidate: Configuration): number {
  let score = 0
  if (original.leatherId !== candidate.leatherId) score += 8
  if (original.colorId !== candidate.colorId) score += 2
  if (original.hardware !== candidate.hardware) score += 3
  if (original.widthCm !== candidate.widthCm) score += 4 + Math.abs(original.widthCm - candidate.widthCm) / 10
  if (original.heightCm !== candidate.heightCm) score += 4 + Math.abs(original.heightCm - candidate.heightCm) / 10
  if (original.depthCm !== candidate.depthCm) score += 4 + Math.abs(original.depthCm - candidate.depthCm) / 10
  if (original.monogram !== candidate.monogram) score += 10
  if (original.removableStrap !== candidate.removableStrap) score += 4
  if (original.paddedLining !== candidate.paddedLining) score += 4
  if (original.pocketCount !== candidate.pocketCount) score += Math.abs(original.pocketCount - candidate.pocketCount) * 3
  return score
}

export function recommendAlternatives(config: Configuration): Recommendation[] {
  const candidates: Configuration[] = []
  for (const leather of LEATHERS) {
    candidates.push({ ...config, leatherId: leather.id })
  }

  const product = productById(config.productId)
  const bounded: Configuration = {
    ...config,
    widthCm: Math.max(product.dimensions.width[0], Math.min(product.dimensions.width[1], config.widthCm)),
    heightCm: Math.max(product.dimensions.height[0], Math.min(product.dimensions.height[1], config.heightCm)),
    depthCm: Math.max(product.dimensions.depth[0], Math.min(product.dimensions.depth[1], config.depthCm)),
    monogram: config.monogram.slice(0, 3),
    removableStrap: product.supportsStrap && config.removableStrap,
    paddedLining: product.supportsPadding && config.paddedLining,
    pocketCount: Math.max(0, Math.min(5, Math.round(config.pocketCount))),
  }
  candidates.push(bounded)

  if (config.monogram.length > 3) candidates.push({ ...bounded, monogram: config.monogram.slice(0, 3) })

  const unique = candidates.filter((candidate, index, all) =>
    all.findIndex((item) => JSON.stringify(item) === JSON.stringify(candidate)) === index,
  )

  return unique
    .filter((candidate) => validateConfiguration(candidate).every((issue) => issue.severity !== 'error'))
    .sort((a, b) => distanceFrom(config, a) - distanceFrom(config, b))
    .slice(0, 3)
    .map((candidate) => {
      const changes: string[] = []
      if (candidate.leatherId !== config.leatherId) changes.push(`Leather: ${leatherById(candidate.leatherId).name}`)
      if (candidate.widthCm !== config.widthCm) changes.push(`Width: ${candidate.widthCm} cm`)
      if (candidate.heightCm !== config.heightCm) changes.push(`Height: ${candidate.heightCm} cm`)
      if (candidate.depthCm !== config.depthCm) changes.push(`Depth: ${candidate.depthCm} cm`)
      if (candidate.monogram !== config.monogram) changes.push(`Monogram: ${candidate.monogram || 'removed'}`)
      if (candidate.removableStrap !== config.removableStrap) changes.push('Remove unsupported strap')
      if (candidate.paddedLining !== config.paddedLining) changes.push('Remove unsupported padding')
      if (candidate.pocketCount !== config.pocketCount) changes.push(`Pockets: ${candidate.pocketCount}`)
      return {
        title: changes[0] ?? 'Closest valid configuration',
        reason: `Validated against the sample ${product.name} rules. Review this suggestion before applying it.`,
        configuration: candidate,
        changes,
      }
    })
}

const colors = [
  ['saddle', 'tan', 'cognac'],
  ['cognac', 'cognac', 'warm brown'],
  ['espresso', 'dark brown', 'brown', 'chocolate'],
  ['olive', 'olive', 'forest', 'green'],
  ['black', 'black', 'ink'],
  ['oxblood', 'burgundy', 'wine', 'oxblood'],
  ['navy', 'navy', 'blue', 'midnight'],
  ['natural', 'natural', 'cream', 'sand'],
]

const materials = [
  ['heritage-calf', 'full grain', 'full-grain', 'calf', 'veg tan', 'veg-tan'],
  ['pebble-grain', 'pebble grain', 'pebble', 'top grain', 'top-grain'],
  ['saddle-hide', 'saddle hide', 'heavy hide', 'thick leather', 'heavy leather'],
  ['saffiano', 'saffiano', 'cross hatch', 'cross grain', 'cross-grain'],
  ['nappa', 'nappa', 'smooth nappa', 'soft leather', 'italian nappa'],
]

export function parseDesignRequest(text: string, current: Configuration = DEFAULT_CONFIGURATION): ParsedDesign {
  const normalized = text.toLowerCase().replace(/[-_]/g, ' ')
  const configuration: Configuration = { ...current }
  const recognized: string[] = []
  const questions: string[] = []

  // Match products
  if (/\b(handbag|sling|crossbody|purse)\b/.test(normalized)) {
    configuration.productId = 'handbag'
    recognized.push(`Product: ${productById('handbag').name}`)
  } else if (/\b(toiletry|dopp|wash bag|grooming kit)\b/.test(normalized)) {
    configuration.productId = 'toiletry'
    recognized.push(`Product: ${productById('toiletry').name}`)
  } else if (/\b(sunglass|sunglasses|eyewear|glasses case)\b/.test(normalized)) {
    configuration.productId = 'sunglass'
    recognized.push(`Product: ${productById('sunglass').name}`)
  } else if (/\b(wallet|bifold|billfold)\b/.test(normalized)) {
    configuration.productId = 'wallet'
    recognized.push(`Product: ${productById('wallet').name}`)
  } else if (/\b(cardholder|card holder|card case|money clip)\b/.test(normalized)) {
    configuration.productId = 'cardholder'
    recognized.push(`Product: ${productById('cardholder').name}`)
  } else if (/\b(laptop sleeve|laptop|sleeve|passport sleeve)\b/.test(normalized)) {
    configuration.productId = 'sleeve'
    recognized.push(`Product: ${productById('sleeve').name}`)
  } else if (/\b(tote|tote bag|shopper|carryall|barsati)\b/.test(normalized)) {
    configuration.productId = 'tote'
    recognized.push(`Product: ${productById('tote').name}`)
  }

  // Match leather material
  for (const [id, ...terms] of materials) {
    if (terms.some((term) => normalized.includes(term))) {
      configuration.leatherId = id
      recognized.push(`Leather: ${leatherById(id).name}`)
      break
    }
  }

  // Match color
  for (const [id, ...terms] of colors) {
    if (terms.some((term) => normalized.includes(term))) {
      configuration.colorId = id
      recognized.push(`Color: ${terms[0]}`)
      break
    }
  }

  // Match hardware finish
  if (/\b(rose gold|rose)\b/.test(normalized)) {
    configuration.hardware = 'rose'
    recognized.push('Hardware: rose gold')
  } else if (/\b(gunmetal|dark nickel|smoke)\b/.test(normalized)) {
    configuration.hardware = 'gunmetal'
    recognized.push('Hardware: gunmetal')
  } else if (/\b(matte black|black hardware)\b/.test(normalized)) {
    configuration.hardware = 'black'
    recognized.push('Hardware: matte black')
  } else if (/\b(silver|nickel|chrome)\b/.test(normalized)) {
    configuration.hardware = 'silver'
    recognized.push('Hardware: silver')
  } else if (/\b(brass|gold|antique brass)\b/.test(normalized)) {
    configuration.hardware = 'brass'
    recognized.push('Hardware: brass')
  }

  // Monogram initials & styling
  const initials = text.match(/\b(?:initials?|monogram)\s*(?:of|:)?\s*([A-Za-z]{1,8})\b/i)
  if (initials) {
    configuration.monogram = initials[1].slice(0, 3).toUpperCase()
    recognized.push(`Monogram: ${configuration.monogram}`)
  }

  if (/\bgold foil\b/.test(normalized)) {
    configuration.monogramMethod = 'gold_foil'
    recognized.push('Personalization: 24K gold foil')
  } else if (/\bsilver foil\b/.test(normalized)) {
    configuration.monogramMethod = 'silver_foil'
    recognized.push('Personalization: silver foil')
  } else if (/\brose foil|rose gold foil\b/.test(normalized)) {
    configuration.monogramMethod = 'rose_foil'
    recognized.push('Personalization: rose gold foil')
  } else if (/\bdeboss|blind deboss\b/.test(normalized)) {
    configuration.monogramMethod = 'blind_deboss'
    recognized.push('Personalization: blind deboss')
  } else if (/\bengraved\b|\bengraving\b/.test(normalized)) {
    configuration.monogramMethod = 'engraved'
    if (!recognized.some((item) => item.startsWith('Monogram:'))) recognized.push('Personalization: engraving')
  } else if (/\bembossed\b|\bembossing\b/.test(normalized)) {
    configuration.monogramMethod = 'embossed'
    if (!recognized.some((item) => item.startsWith('Monogram:'))) recognized.push('Personalization: embossing')
  }

  if (/\bscript font|calligraphy\b/.test(normalized)) {
    configuration.monogramFont = 'script'
  } else if (/\bsans font|modern font\b/.test(normalized)) {
    configuration.monogramFont = 'sans'
  }

  if (/\bremovable shoulder strap\b|\bremovable strap\b|\bshoulder strap\b/.test(normalized)) {
    configuration.removableStrap = true
    recognized.push('Removable shoulder strap')
  }
  if (/\bpadded lining\b|\bpadded\b/.test(normalized)) {
    configuration.paddedLining = true
    recognized.push('Padded lining')
  }

  const pocketMatch = normalized.match(/\b(\d+)\s+(?:inside |interior |front )?pockets?\b/)
  if (pocketMatch) {
    configuration.pocketCount = Number(pocketMatch[1])
    recognized.push(`${configuration.pocketCount} pockets`)
  }

  const laptopDeviceSize = normalized.match(/\b(1[3-7])[- ]?inch laptop\b/)
  const dimensions = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(cm|mm|inches|inch|in)\b/g)]
  if (laptopDeviceSize && configuration.productId === 'sleeve') {
    configuration.widthCm = 36
    configuration.heightCm = 26
    configuration.depthCm = 3
    recognized.push(`Starter sleeve proportions for a ${laptopDeviceSize[1]}-inch laptop (fit not guaranteed)`)
    questions.push('Screen size is not the laptop’s physical dimensions. Please confirm the device measurements before finalizing fit.')
  } else if (dimensions.length === 1) {
    const [, amount, unit] = dimensions[0]
    const cm = Number(amount) * (unit.startsWith('in') ? 2.54 : unit === 'mm' ? 0.1 : 1)
    const product = productById(configuration.productId)
    configuration.widthCm = Math.round(Math.min(product.dimensions.width[1], Math.max(product.dimensions.width[0], cm)))
    recognized.push(`Approximate width: ${configuration.widthCm} cm`)
    questions.push('I found one measurement. Is that the width, and what height and depth would you like?')
  } else if (dimensions.length > 1) {
    questions.push('I found multiple measurements, but cannot reliably tell which is width, height, or depth. Please enter each in the size controls.')
  }

  if (recognized.length === 0) {
    questions.push('Tell me a product, color, leather, or detail you would like to change.')
  }
  if (/laptop|work/.test(normalized) && configuration.productId === 'tote') {
    questions.push('Would you like a laptop sleeve instead, or should I keep the tote?')
  }
  return { configuration, recognized, questions }
}

type SharedConfiguration = Omit<Configuration, 'monogram' | 'customRequest'>
const SHARE_PREFIX = 'v1.'
const VERSIONED_SHARE_PREFIX = 'v2.'

export type SharedDesignSnapshot = {
  configuration: Configuration
  designId: string | null
  designVersion: number | null
}

export function encodeConfiguration(config: Configuration): string {
  const { monogram: _monogram, customRequest: _customRequest, ...shareable } = config
  const bytes = new TextEncoder().encode(JSON.stringify(shareable))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return SHARE_PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function encodeDesignSnapshot(
  config: Configuration,
  designId: string | null,
  designVersion: number | null,
): string {
  const { monogram: _monogram, customRequest: _customRequest, ...shareable } = config
  const snapshot = { designId, designVersion, configuration: shareable }
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return VERSIONED_SHARE_PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeDesignSnapshot(value: string): SharedDesignSnapshot | null {
  try {
    const versionTwo = value.startsWith(VERSIONED_SHARE_PREFIX)
    if (!versionTwo && !value.startsWith(SHARE_PREFIX)) return null
    const prefix = versionTwo ? VERSIONED_SHARE_PREFIX : SHARE_PREFIX
    const encoded = value.slice(prefix.length).replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null
    const record = decoded as Record<string, unknown>
    const parsed = (versionTwo ? record.configuration : record) as Partial<SharedConfiguration> | undefined
    if (
      !parsed ||
      !PRODUCTS.some((product) => product.id === parsed.productId) ||
      !LEATHERS.some((leather) => leather.id === parsed.leatherId) ||
      !LEATHERS.find((leather) => leather.id === parsed.leatherId)?.colors.some((color) => color.id === parsed.colorId) ||
      !['brass', 'silver', 'black', 'rose', 'gunmetal'].includes(parsed.hardware ?? '') ||
      ![parsed.widthCm, parsed.heightCm, parsed.depthCm].every(
        (dimension) => typeof dimension === 'number' && Number.isFinite(dimension),
      ) ||
      typeof parsed.pocketCount !== 'number' ||
      !Number.isInteger(parsed.pocketCount) ||
      parsed.pocketCount < 0 ||
      parsed.pocketCount > 5 ||
      typeof parsed.removableStrap !== 'boolean' ||
      typeof parsed.paddedLining !== 'boolean' ||
      !['embossed', 'engraved', 'gold_foil', 'silver_foil', 'rose_foil', 'blind_deboss'].includes(parsed.monogramMethod ?? '')
    ) {
      return null
    }
    const config: Configuration = {
      ...DEFAULT_CONFIGURATION,
      ...(parsed as SharedConfiguration),
      monogram: '',
      customRequest: '',
    }
    if (validateConfiguration(config).some((issue) => issue.severity === 'error')) return null
    const metadata = versionTwo ? record : null
    const designId = typeof metadata?.designId === 'string' && /^[\w-]{8,80}$/.test(metadata.designId) ? metadata.designId : null
    const designVersion = Number.isInteger(metadata?.designVersion) && Number(metadata?.designVersion) > 0
      ? Number(metadata?.designVersion)
      : null
    return { configuration: config, designId, designVersion }
  } catch {
    return null
  }
}

export function decodeConfiguration(value: string): Configuration | null {
  return decodeDesignSnapshot(value)?.configuration ?? null
}

export function configurationSummary(config: Configuration): string[] {
  const product = productById(config.productId)
  const leather = leatherById(config.leatherId)
  const color = leather.colors.find((item) => item.id === config.colorId)?.name ?? config.colorId
  return [
    product.name,
    `${config.widthCm} × ${config.heightCm} × ${config.depthCm} cm`,
    `${leather.name} · ${color}`,
    `${config.hardware} hardware`,
    config.monogram ? `${config.monogramMethod} “${config.monogram}”` : 'No monogram',
    config.removableStrap ? 'Removable strap' : '',
    config.paddedLining ? 'Padded lining' : '',
    config.pocketCount ? `${config.pocketCount} pockets` : '',
  ].filter(Boolean)
}
