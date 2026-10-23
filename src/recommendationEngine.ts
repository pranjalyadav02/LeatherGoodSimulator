import type { Configuration, ProductId } from './types'
import { LEATHERS } from './catalog'
import { fetchRecommendations, type RecommendationProposal } from './api'

export interface ColorHarmonyResult {
  score: number // 0-100%
  paletteType: 'Complementary' | 'Analogous' | 'Tone-on-Tone (Monochrome)' | 'Triadic Heirloom'
  verdict: 'Exceptional Harmony' | 'Balanced Pairing' | 'Contrasting Accent' | 'Clashing Tones'
  advice: string
  suggestedThreadId: string
  suggestedHardwareId: string
  suggestedEdgeId: string
}

// Color temperature & undertone registry
const UNDERTONES: Record<string, { temp: 'warm' | 'cool' | 'neutral'; baseHue: number }> = {
  saddle: { temp: 'warm', baseHue: 30 },
  cognac: { temp: 'warm', baseHue: 25 },
  espresso: { temp: 'warm', baseHue: 20 },
  oxblood: { temp: 'cool', baseHue: 350 },
  olive: { temp: 'warm', baseHue: 85 },
  black: { temp: 'neutral', baseHue: 0 },
  navy: { temp: 'cool', baseHue: 220 },
  natural: { temp: 'warm', baseHue: 40 },
}

/**
 * Calculates real-time color and aesthetic harmony of a bespoke leather configuration
 */
export function evaluateColorHarmony(config: Configuration): ColorHarmonyResult {
  const primaryLeather = LEATHERS.find((l) => l.id === config.leatherId)
  const colorId = config.colorId
  const hardware = config.hardware
  const threadId = config.threadColorId ?? 'cream'
  const edgeId = config.edgeColorId ?? 'match'

  const tone = UNDERTONES[colorId] ?? { temp: 'warm', baseHue: 30 }
  let score = 85

  // Hardware pairing logic
  if (tone.temp === 'warm' && (hardware === 'brass' || hardware === 'rose')) {
    score += 8 // Warm brass on warm tan/cognac
  } else if (tone.temp === 'cool' && (hardware === 'silver' || hardware === 'gunmetal')) {
    score += 8 // Cool silver on cool oxblood/navy
  } else if (colorId === 'black' && hardware === 'black') {
    score += 10 // Monochromatic stealth
  } else if (hardware === 'brass' && colorId === 'black') {
    score += 5 // Classic contrast
  }

  // Stitch thread pairing logic
  if (threadId === 'cream' && ['cognac', 'saddle', 'espresso'].includes(colorId)) {
    score += 5 // Classic Hermès style saddler stitch
  } else if (threadId === colorId) {
    score += 4 // Clean tone-on-tone
  }

  // Edge lacquer
  if (edgeId === 'match' || edgeId === 'black' || edgeId === 'espresso') {
    score += 2
  }

  score = Math.min(99, Math.max(70, score))

  let paletteType: ColorHarmonyResult['paletteType'] = 'Tone-on-Tone (Monochrome)'
  if (hardware === 'brass' && (colorId === 'navy' || colorId === 'oxblood')) {
    paletteType = 'Complementary'
  } else if (tone.temp === 'warm' && hardware === 'brass') {
    paletteType = 'Analogous'
  } else if (colorId === 'cognac' || colorId === 'saddle') {
    paletteType = 'Triadic Heirloom'
  }

  let verdict: ColorHarmonyResult['verdict'] = 'Exceptional Harmony'
  if (score < 80) verdict = 'Contrasting Accent'
  else if (score < 90) verdict = 'Balanced Pairing'

  // Advise artisan pairings
  let suggestedThreadId = 'cream'
  let suggestedHardwareId = 'brass'
  let suggestedEdgeId = 'espresso'

  if (colorId === 'black') {
    suggestedThreadId = 'black'
    suggestedHardwareId = 'black'
    suggestedEdgeId = 'black'
  } else if (colorId === 'oxblood') {
    suggestedThreadId = 'match'
    suggestedHardwareId = 'silver'
    suggestedEdgeId = 'black'
  } else if (colorId === 'navy') {
    suggestedThreadId = 'cream'
    suggestedHardwareId = 'silver'
    suggestedEdgeId = 'black'
  } else if (colorId === 'olive') {
    suggestedThreadId = 'cream'
    suggestedHardwareId = 'brass'
    suggestedEdgeId = 'espresso'
  }

  const advice =
    score >= 92
      ? `Superb color balance. The ${primaryLeather?.name ?? 'leather'} in ${colorId} has natural affinity with ${hardware} fittings.`
      : `Artisan note: For the most harmonious heirloom look in ${colorId}, consider ${suggestedHardwareId} fittings with ${suggestedThreadId} thread.`

  return {
    score,
    paletteType,
    verdict,
    advice,
    suggestedThreadId,
    suggestedHardwareId,
    suggestedEdgeId,
  }
}

/**
 * Intelligent recommendation finder combining local rules and backend ML API
 */
export async function getSmartRecommendations(
  productId: ProductId,
  useCase: 'daily_office' | 'travel_commute' | 'formal_luxury' | 'minimalist_edc' | 'weather_rugged',
  targetBudget?: number,
  currentConfig?: Partial<Configuration>,
): Promise<RecommendationProposal[]> {
  try {
    const apiResults = await fetchRecommendations(productId, useCase, targetBudget, currentConfig)
    if (apiResults && apiResults.length > 0) {
      return apiResults
    }
  } catch {
    // fallback to local generation
  }

  // High quality local fallback proposals
  return [
    {
      id: 'local-heritage',
      title: 'Artisan Heritage Edition',
      subtitle: 'Cognac Full-Grain Calf with Solid Brass',
      score: 97,
      suitability: 'Signature Carry heirloom construction for everyday use',
      targetPrice: targetBudget ? Math.round(targetBudget * 0.95) : 4650,
      highlights: [
        'Semi-aniline vegetable-tanned Heritage Calf',
        'Solid Brushed Brass hardware kit',
        'Hand-burnished Italian edge lacquer',
      ],
      config: {
        productId,
        leatherId: 'heritage-calf',
        colorId: 'cognac',
        hardware: 'brass',
        threadColorId: 'cream',
        edgeColorId: 'espresso',
        liningColorId: 'sand',
        monogramMethod: 'gold_foil',
      },
      harmonyScore: 98,
      rationale:
        'Cognac Calf with Solid Brass creates our most requested studio pairing, aging gracefully with natural amber undertones.',
    },
    {
      id: 'local-modern',
      title: 'Urban All-Weather Noir',
      subtitle: 'Scratch-Proof Saffiano in Matte Black',
      score: 94,
      suitability: 'High-durability build designed for laptop protection and commutes',
      targetPrice: targetBudget ? Math.round(targetBudget * 0.9) : 4200,
      highlights: [
        'Wax-pressed cross-hatch Saffiano leather',
        'Matte Black PVD hardware fittings',
        'Weather-resistant and scratch-proof surface',
      ],
      config: {
        productId,
        leatherId: 'saffiano',
        colorId: 'black',
        hardware: 'black',
        threadColorId: 'black',
        edgeColorId: 'black',
        liningColorId: 'charcoal',
        monogramMethod: 'blind_deboss',
      },
      harmonyScore: 96,
      rationale:
        'Clean monochromatic aesthetic with exceptional resistance to daily urban wear and moisture.',
    },
    {
      id: 'local-classic',
      title: 'Forest & Nickel Field Kit',
      subtitle: 'Pebble Grain Calf with Polished Nickel',
      score: 91,
      suitability: 'Tactile cobblestone grain with supple hand-feel',
      targetPrice: targetBudget ? Math.round(targetBudget * 0.88) : 4100,
      highlights: [
        'Supple Pebble Grain textured hide',
        'Antique Silver / Nickel fittings',
        'High scratch concealment grain',
      ],
      config: {
        productId,
        leatherId: 'pebble-grain',
        colorId: 'olive',
        hardware: 'silver',
        threadColorId: 'cream',
        edgeColorId: 'espresso',
        liningColorId: 'olive',
        monogramMethod: 'silver_foil',
      },
      harmonyScore: 93,
      rationale:
        'Rich earthy tones paired with cool silver metals create a distinguished, outdoor-inspired leather good.',
    },
  ]
}
