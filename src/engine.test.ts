import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './catalog'
import {
  calculatePrice,
  decodeConfiguration,
  decodeDesignSnapshot,
  encodeDesignSnapshot,
  encodeConfiguration,
  parseDesignRequest,
  recommendAlternatives,
  validateConfiguration,
} from './engine'

describe('configuration rules', () => {
  it('accepts the catalog default and flags unsupported dimensions', () => {
    expect(validateConfiguration(DEFAULT_CONFIGURATION)).toEqual([])
    const issues = validateConfiguration({ ...DEFAULT_CONFIGURATION, widthCm: 90 })
    expect(issues.some((issue) => issue.code === 'DIMENSION_WIDTHCM')).toBe(true)
  })

  it('rejects leather that is too thick and long monograms', () => {
    const issues = validateConfiguration({
      ...DEFAULT_CONFIGURATION,
      productId: 'sleeve',
      leatherId: 'saddle-hide',
      depthCm: 3,
      removableStrap: false,
      monogram: 'ABCD',
    })
    expect(issues.map((issue) => issue.code)).toEqual(['LEATHER_THICKNESS', 'MONOGRAM_LENGTH'])
  })

  it('ranks alternatives that pass every hard validation rule', () => {
    const invalid = { ...DEFAULT_CONFIGURATION, leatherId: 'saddle-hide' }
    expect(validateConfiguration(invalid).some((issue) => issue.severity === 'error')).toBe(true)
    const options = recommendAlternatives(invalid)
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((option) => validateConfiguration(option.configuration).every((issue) => issue.severity !== 'error'))).toBe(true)
    expect(options[0].configuration.leatherId).not.toBe('saddle-hide')
  })

  it('extracts known choices without silently applying them', () => {
    const proposal = parseDesignRequest(
      'A dark-brown full-grain tote bag with antique brass hardware and my initials RS embossed',
    )
    expect(proposal.recognized).toContain('Product: Everyday Tote')
    expect(proposal.configuration.colorId).toBe('espresso')
    expect(proposal.configuration.leatherId).toBe('heritage-calf')
    expect(proposal.configuration.hardware).toBe('brass')
    expect(proposal.configuration.monogram).toBe('RS')
    expect(DEFAULT_CONFIGURATION.monogram).toBe('')
  })

  it('treats laptop screen size as a starting point, not an exact bag measurement', () => {
    const proposal = parseDesignRequest('A tan full-grain laptop sleeve for a 15-inch laptop')
    expect(proposal.configuration.productId).toBe('sleeve')
    expect(proposal.configuration.widthCm).toBe(36)
    expect(proposal.questions.join(' ')).toContain('physical dimensions')
    expect(proposal.recognized.join(' ')).toContain('fit not guaranteed')
  })

  it('does not fabricate a supplier price when no material mapping exists', () => {
    const estimate = calculatePrice(DEFAULT_CONFIGURATION)
    expect(estimate.total).toBeNull()
    expect(estimate.status).toBe('unavailable')
    expect(estimate.reason).toContain('No verified supplier price')
  })
})

describe('share links', () => {
  it('round-trips supported non-sensitive options but excludes private text', () => {
    const configuration = {
      ...DEFAULT_CONFIGURATION,
      colorId: 'espresso',
      monogram: 'RS',
      customRequest: 'Please call me at my private number',
    }
    const encoded = encodeConfiguration(configuration)
    const restored = decodeConfiguration(encoded)
    expect(restored).not.toBeNull()
    expect(restored?.colorId).toBe('espresso')
    expect(restored?.monogram).toBe('')
    expect(restored?.customRequest).toBe('')
  })

  it('rejects malformed, outdated, and invalid configuration links', () => {
    expect(decodeConfiguration('not-a-config')).toBeNull()
    expect(decodeConfiguration('v0.eyJ4IjoxfQ')).toBeNull()
    const invalid = encodeConfiguration({ ...DEFAULT_CONFIGURATION, widthCm: 900 })
    expect(decodeConfiguration(invalid)).toBeNull()
  })

  it('shares a specific saved version without exposing monograms or private notes', () => {
    const encoded = encodeDesignSnapshot({
      ...DEFAULT_CONFIGURATION,
      monogram: 'RS',
      customRequest: 'Private workshop details',
    }, 'design-12345678', 4)
    const snapshot = decodeDesignSnapshot(encoded)
    expect(snapshot?.designId).toBe('design-12345678')
    expect(snapshot?.designVersion).toBe(4)
    expect(snapshot?.configuration.monogram).toBe('')
    expect(snapshot?.configuration.customRequest).toBe('')
  })
})
