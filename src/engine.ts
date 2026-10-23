import { DEFAULT_CONFIGURATION, LEATHERS, PRODUCTS, leatherById, productById } from './catalog'
import type {
  Configuration,
  ParsedDesign,
  PriceEstimate,
  Recommendation,
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

export function calculatePrice(_config: Configuration): PriceEstimate {
  return {
    total: null,
    status: 'unavailable',
    reason: 'No verified supplier price is mapped to this selected material and product configuration.',
  }
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
  ['espresso', 'dark brown', 'brown'],
  ['olive', 'olive', 'green'],
  ['black', 'black', 'ink'],
  ['natural', 'natural', 'cream'],
]
const materials = [
  ['heritage-calf', 'full grain', 'full-grain', 'calf'],
  ['pebble-grain', 'pebble grain', 'top grain', 'top-grain'],
  ['saddle-hide', 'saddle hide', 'thick leather', 'heavy leather'],
]

export function parseDesignRequest(text: string, current: Configuration = DEFAULT_CONFIGURATION): ParsedDesign {
  const normalized = text.toLowerCase().replace(/[-_]/g, ' ')
  const configuration: Configuration = { ...current }
  const recognized: string[] = []
  const questions: string[] = []

  const productMatch = normalized.match(/\b(tote|tote bag|shopper|laptop sleeve|laptop|sleeve|cardholder|card holder|wallet)\b/)
  if (productMatch) {
    const word = productMatch[0]
    configuration.productId = word.includes('sleeve') || word === 'laptop' ? 'sleeve' : word.includes('card') || word === 'wallet' ? 'cardholder' : 'tote'
    recognized.push(`Product: ${productById(configuration.productId).name}`)
  }

  for (const [id, ...terms] of materials) {
    if (terms.some((term) => normalized.includes(term))) {
      configuration.leatherId = id
      recognized.push(`Leather: ${leatherById(id).name}`)
      break
    }
  }
  for (const [id, ...terms] of colors) {
    if (terms.some((term) => normalized.includes(term))) {
      configuration.colorId = id
      recognized.push(`Color: ${terms[0]}`)
      break
    }
  }

  if (/\b(brass|gold)\b/.test(normalized)) {
    configuration.hardware = 'brass'
    recognized.push('Hardware: brass')
  } else if (/\b(silver|nickel)\b/.test(normalized)) {
    configuration.hardware = 'silver'
    recognized.push('Hardware: silver')
  } else if (/\bmatte black hardware|black hardware\b/.test(normalized)) {
    configuration.hardware = 'black'
    recognized.push('Hardware: matte black')
  }

  const initials = text.match(/\b(?:initials?|monogram)\s*(?:of|:)?\s*([A-Za-z]{1,8})\b/i)
  if (initials) {
    configuration.monogram = initials[1].slice(0, 3).toUpperCase()
    recognized.push(`Monogram: ${configuration.monogram}`)
  }
  if (/\bengraved\b|\bengraving\b/.test(normalized)) {
    configuration.monogramMethod = 'engraved'
    if (!recognized.some((item) => item.startsWith('Monogram:'))) recognized.push('Personalization: engraving')
  } else if (/\bembossed\b|\bembossing\b/.test(normalized)) {
    configuration.monogramMethod = 'embossed'
    if (!recognized.some((item) => item.startsWith('Monogram:'))) recognized.push('Personalization: embossing')
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
      !['brass', 'silver', 'black'].includes(parsed.hardware ?? '') ||
      ![parsed.widthCm, parsed.heightCm, parsed.depthCm].every(
        (dimension) => typeof dimension === 'number' && Number.isFinite(dimension),
      ) ||
      typeof parsed.pocketCount !== 'number' ||
      !Number.isInteger(parsed.pocketCount) ||
      parsed.pocketCount < 0 ||
      parsed.pocketCount > 5 ||
      typeof parsed.removableStrap !== 'boolean' ||
      typeof parsed.paddedLining !== 'boolean' ||
      !['embossed', 'engraved'].includes(parsed.monogramMethod ?? '')
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
