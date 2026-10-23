import type { Configuration, Leather, Product, ProductId } from './types'

export const PRODUCTS: Product[] = [
  {
    id: 'tote',
    name: 'Everyday Tote',
    category: 'Tote bag',
    tagline: 'A considered carryall for everyday rituals.',
    description: 'Roomy silhouette with an easy, open top and hand-finished edges.',
    dimensions: { width: [25, 48], height: [22, 42], depth: [8, 22] },
    maxLeatherThickness: 2.6,
    supportsStrap: true,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.18,
  },
  {
    id: 'sleeve',
    name: 'Laptop Sleeve',
    category: 'Tech accessory',
    tagline: 'A soft-lined home for your daily essentials.',
    description: 'A clean envelope profile with optional protective padding.',
    dimensions: { width: [28, 40], height: [20, 30], depth: [2, 5] },
    maxLeatherThickness: 2,
    supportsStrap: false,
    supportsPadding: true,
    supportsPockets: true,
    leatherAreaFactor: 1.12,
  },
  {
    id: 'cardholder',
    name: 'Essential Cardholder',
    category: 'Small leather good',
    tagline: 'A little piece made to go everywhere.',
    description: 'A slim folded profile with space for the cards you reach for most.',
    dimensions: { width: [7, 13], height: [6, 11], depth: [0.5, 2] },
    maxLeatherThickness: 2,
    supportsStrap: false,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.35,
  },
]

export const LEATHERS: Leather[] = [
  {
    id: 'heritage-calf',
    name: 'Heritage Calf',
    grade: 'Full-grain',
    finish: 'Semi-aniline',
    thickness: 1.6,
    temper: 'Supple with a gentle structure',
    description: 'A smooth, lightly protected grain that develops a soft patina with use.',
    colors: [
      { id: 'saddle', name: 'Saddle', hex: '#a65e35' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Olive', hex: '#5d6048' },
      { id: 'black', name: 'Ink', hex: '#292a29' },
      { id: 'natural', name: 'Natural', hex: '#d8bb91' },
    ],
  },
  {
    id: 'pebble-grain',
    name: 'Pebble Grain',
    grade: 'Top-grain',
    finish: 'Protected pebble emboss',
    thickness: 1.8,
    temper: 'Medium body, resilient surface',
    description: 'A softly textured, practical surface with a little more everyday protection.',
    colors: [
      { id: 'saddle', name: 'Saddle', hex: '#a65e35' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Olive', hex: '#5d6048' },
      { id: 'black', name: 'Ink', hex: '#292a29' },
      { id: 'natural', name: 'Natural', hex: '#d8bb91' },
    ],
  },
  {
    id: 'saddle-hide',
    name: 'Saddle Hide',
    grade: 'Full-grain',
    finish: 'Oil-rich, natural grain',
    thickness: 2.8,
    temper: 'Firm and substantial',
    description: 'A robust, characterful hide intended for structured pieces and heavier details.',
    colors: [
      { id: 'saddle', name: 'Saddle', hex: '#a65e35' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Olive', hex: '#5d6048' },
      { id: 'black', name: 'Ink', hex: '#292a29' },
      { id: 'natural', name: 'Natural', hex: '#d8bb91' },
    ],
  },
]

export const DEFAULT_CONFIGURATION: Configuration = {
  productId: 'tote',
  leatherId: 'heritage-calf',
  colorId: 'saddle',
  hardware: 'brass',
  widthCm: 36,
  heightCm: 30,
  depthCm: 14,
  monogram: '',
  monogramMethod: 'embossed',
  removableStrap: true,
  paddedLining: false,
  pocketCount: 2,
  customRequest: '',
}

export const productById = (id: ProductId) => PRODUCTS.find((product) => product.id === id)!
export const leatherById = (id: string) => LEATHERS.find((leather) => leather.id === id)!

export function configurationForProduct(
  productId: ProductId,
  current: Configuration = DEFAULT_CONFIGURATION,
): Configuration {
  const product = productById(productId)
  const clamp = (value: number, range: [number, number]) =>
    Math.min(range[1], Math.max(range[0], value))

  return {
    ...current,
    productId,
    widthCm: clamp(current.widthCm, product.dimensions.width),
    heightCm: clamp(current.heightCm, product.dimensions.height),
    depthCm: clamp(current.depthCm, product.dimensions.depth),
    removableStrap: product.supportsStrap ? current.removableStrap : false,
    paddedLining: product.supportsPadding ? current.paddedLining : false,
    pocketCount: product.supportsPockets ? current.pocketCount : 0,
  }
}
