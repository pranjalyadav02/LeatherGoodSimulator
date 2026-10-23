import type { Configuration, HardwareId, Leather, Product, ProductId } from './types'

export const PRODUCTS: Product[] = [
  {
    id: 'tote',
    name: 'Everyday Tote',
    category: 'Tote bags',
    tagline: 'A considered carryall for everyday rituals.',
    description: 'Roomy silhouette with an easy, open top, dual curved shoulder handles, and hand-burnished edges.',
    dimensions: { width: [25, 48], height: [22, 42], depth: [8, 22] },
    defaultDimensions: { width: 36, height: 30, depth: 14 },
    maxLeatherThickness: 2.6,
    supportsStrap: true,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.18,
    basePrice: 3800,
    accentName: 'Handles & patches',
    carryCollection: 'Barsati & Carry Core',
    indicativePriceRange: '₹3,500 – ₹5,500',
  },
  {
    id: 'handbag',
    name: 'Sculptor Handbag',
    category: 'Handbags & Slings',
    tagline: 'Architectural structured silhouette with elegant front lock.',
    description: 'Curved bottom gusset, turn-lock front flap, and detachable adjustable crossbody strap.',
    dimensions: { width: [20, 36], height: [16, 30], depth: [6, 16] },
    defaultDimensions: { width: 26, height: 21, depth: 9 },
    maxLeatherThickness: 2.4,
    supportsStrap: true,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.28,
    basePrice: 4600,
    accentName: 'Front flap & strap',
    carryCollection: 'Handbag Collection (Sculptor / Taurus)',
    indicativePriceRange: '₹4,000 – ₹5,200',
  },
  {
    id: 'wallet',
    name: 'Bifold & Snap Wallet',
    category: 'Wallets',
    tagline: 'Refined dual-fold architecture with snap fastener tab.',
    description: 'Precision folded edge construction with contrast banknote pocket and metallic snap closure.',
    dimensions: { width: [9, 14], height: [7, 12], depth: [1, 3.5] },
    defaultDimensions: { width: 11.5, height: 9.5, depth: 2 },
    maxLeatherThickness: 2.0,
    supportsStrap: false,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.45,
    basePrice: 1950,
    accentName: 'Snap tab & interior divider',
    carryCollection: 'Scorpio & Indus DIY Series',
    indicativePriceRange: '₹1,800 – ₹2,500',
  },
  {
    id: 'cardholder',
    name: 'Essential Cardholder',
    category: 'Small leather goods',
    tagline: 'A little piece made to go everywhere.',
    description: 'A slim folded profile with stepped card slots and hand-painted edges.',
    dimensions: { width: [7, 13], height: [6, 11], depth: [0.5, 2] },
    defaultDimensions: { width: 10, height: 7.5, depth: 0.8 },
    maxLeatherThickness: 2.0,
    supportsStrap: false,
    supportsPadding: false,
    supportsPockets: true,
    leatherAreaFactor: 1.35,
    basePrice: 1250,
    accentName: 'Front card pocket',
    carryCollection: 'SLG Atelier',
    indicativePriceRange: '₹950 – ₹1,850',
  },
  {
    id: 'sleeve',
    name: 'Tech & Passport Sleeve',
    category: 'Travel & Tech',
    tagline: 'A soft-lined home for your daily essentials.',
    description: 'A clean envelope profile with protective padding and brass collar closure stud.',
    dimensions: { width: [24, 40], height: [18, 30], depth: [2, 5] },
    defaultDimensions: { width: 34, height: 24, depth: 2.5 },
    maxLeatherThickness: 2.0,
    supportsStrap: false,
    supportsPadding: true,
    supportsPockets: true,
    leatherAreaFactor: 1.15,
    basePrice: 2450,
    accentName: 'Closure tab & edge',
    carryCollection: 'Travel & Tech Sleeves',
    indicativePriceRange: '₹2,200 – ₹3,500',
  },
  {
    id: 'toiletry',
    name: 'Nomad Toiletry Kit',
    category: 'Travel goods',
    tagline: 'Roomy dopp kit with water-resistant interior lining.',
    description: 'Solid boxy construction with heavy-gauge brass top zipper and side grab strap.',
    dimensions: { width: [20, 32], height: [11, 20], depth: [9, 18] },
    defaultDimensions: { width: 25, height: 14, depth: 12 },
    maxLeatherThickness: 2.4,
    supportsStrap: false,
    supportsPadding: true,
    supportsPockets: true,
    leatherAreaFactor: 1.25,
    basePrice: 2950,
    accentName: 'Zipper tabs & side handle',
    carryCollection: 'Eagle, Bull & Nomad Series',
    indicativePriceRange: '₹2,800 – ₹3,800',
  },
  {
    id: 'sunglass',
    name: 'Origami Sunglass Cover',
    category: 'Accessories & Gifts',
    tagline: 'Sculpted protective wrap for eyewear with microfiber lining.',
    description: 'Folded geometric origami wrap with gentle bridge support and snap closure.',
    dimensions: { width: [14, 20], height: [6, 11], depth: [3, 7] },
    defaultDimensions: { width: 17, height: 8, depth: 4.5 },
    maxLeatherThickness: 2.2,
    supportsStrap: false,
    supportsPadding: true,
    supportsPockets: false,
    leatherAreaFactor: 1.4,
    basePrice: 1450,
    accentName: 'Fastener tab',
    carryCollection: 'Sagitta & Origami Collection',
    indicativePriceRange: '₹1,200 – ₹2,550',
  },
]

export const LEATHERS: Leather[] = [
  {
    id: 'heritage-calf',
    name: 'Heritage Full-Grain Calf',
    grade: 'Full-grain',
    finish: 'Semi-aniline vegetable-tanned',
    thickness: 1.6,
    temper: 'Supple with a gentle structure',
    description: 'Smooth, lightly protected natural grain that develops a rich, luminous patina over time.',
    ratePerSqFt: 260,
    status: 'Verified',
    availableFinishes: ['smooth', 'pullup'],
    colors: [
      { id: 'saddle', name: 'Saddle Tan', hex: '#a65e35' },
      { id: 'cognac', name: 'Cognac', hex: '#8a4823' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Forest Olive', hex: '#344b3b' },
      { id: 'black', name: 'Midnight Ink', hex: '#232323' },
      { id: 'oxblood', name: 'Oxblood Burgundy', hex: '#63212b' },
      { id: 'navy', name: 'Regal Navy', hex: '#212d42' },
      { id: 'natural', name: 'Natural Sand', hex: '#d8bb91' },
    ],
  },
  {
    id: 'pebble-grain',
    name: 'Pebble Grain Calf',
    grade: 'Top-grain',
    finish: 'Protected pebble emboss',
    thickness: 1.8,
    temper: 'Medium body, resilient surface',
    description: 'A softly textured, cobblestone embossed surface that conceals scuffs and resists moisture.',
    ratePerSqFt: 210,
    status: 'Verified',
    availableFinishes: ['pebble', 'smooth'],
    colors: [
      { id: 'saddle', name: 'Saddle Tan', hex: '#a65e35' },
      { id: 'cognac', name: 'Cognac', hex: '#8a4823' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Forest Olive', hex: '#344b3b' },
      { id: 'black', name: 'Midnight Ink', hex: '#232323' },
      { id: 'oxblood', name: 'Oxblood Burgundy', hex: '#63212b' },
      { id: 'navy', name: 'Regal Navy', hex: '#212d42' },
      { id: 'natural', name: 'Natural Sand', hex: '#d8bb91' },
    ],
  },
  {
    id: 'saddle-hide',
    name: 'Saddle Hide (Heavy Veg-Tan)',
    grade: 'Full-grain',
    finish: 'Oil-rich vegetable-tanned',
    thickness: 2.8,
    temper: 'Firm, heavy, and substantial',
    description: 'A robust, characterful hide intended for structured pieces, heavy handles, and lifelong longevity.',
    ratePerSqFt: 280,
    status: 'Verified',
    availableFinishes: ['smooth', 'pullup'],
    colors: [
      { id: 'saddle', name: 'Saddle Tan', hex: '#a65e35' },
      { id: 'cognac', name: 'Cognac', hex: '#8a4823' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'olive', name: 'Forest Olive', hex: '#344b3b' },
      { id: 'black', name: 'Midnight Ink', hex: '#232323' },
      { id: 'oxblood', name: 'Oxblood Burgundy', hex: '#63212b' },
      { id: 'navy', name: 'Regal Navy', hex: '#212d42' },
      { id: 'natural', name: 'Natural Sand', hex: '#d8bb91' },
    ],
  },
  {
    id: 'saffiano',
    name: 'Saffiano Cross-Grain',
    grade: 'Top-grain',
    finish: 'Cross-hatch pressed wax finish',
    thickness: 1.5,
    temper: 'Stiff and scratch-proof',
    description: 'Diagonal cross-hatch pressed leather with a protective wax coating that wipes clean easily.',
    ratePerSqFt: 235,
    status: 'Verified',
    availableFinishes: ['saffiano'],
    colors: [
      { id: 'black', name: 'Midnight Ink', hex: '#232323' },
      { id: 'navy', name: 'Regal Navy', hex: '#212d42' },
      { id: 'oxblood', name: 'Oxblood Burgundy', hex: '#63212b' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'saddle', name: 'Saddle Tan', hex: '#a65e35' },
      { id: 'natural', name: 'Natural Sand', hex: '#d8bb91' },
    ],
  },
  {
    id: 'nappa',
    name: 'Smooth Italian Nappa',
    grade: 'Full-grain',
    finish: 'Aniline smooth touch',
    thickness: 1.4,
    temper: 'Buttery soft and ultra supple',
    description: 'Exceptionally fine grain with a soft, glove-like hand and silky luster.',
    ratePerSqFt: 250,
    status: 'Awaiting sample approval',
    availableFinishes: ['smooth'],
    colors: [
      { id: 'black', name: 'Midnight Ink', hex: '#232323' },
      { id: 'saddle', name: 'Saddle Tan', hex: '#a65e35' },
      { id: 'cognac', name: 'Cognac', hex: '#8a4823' },
      { id: 'espresso', name: 'Espresso', hex: '#49342b' },
      { id: 'natural', name: 'Natural Sand', hex: '#d8bb91' },
      { id: 'olive', name: 'Forest Olive', hex: '#344b3b' },
    ],
  },
]

export const HARDWARE_LIST: { id: HardwareId; name: string; hex: string; surcharge: number }[] = [
  { id: 'brass', name: 'Brushed Brass / Gold', hex: '#d4aa4a', surcharge: 250 },
  { id: 'silver', name: 'Polished Nickel / Silver', hex: '#c5c8cc', surcharge: 180 },
  { id: 'rose', name: 'Rose Gold', hex: '#cb9285', surcharge: 320 },
  { id: 'gunmetal', name: 'Gunmetal Smoke', hex: '#585c63', surcharge: 240 },
  { id: 'black', name: 'Matte Black PVD', hex: '#262626', surcharge: 220 },
]

export const THREAD_LIST: { id: string; name: string; hex?: string }[] = [
  { id: 'match', name: 'Tone on Tone (Matched)' },
  { id: 'cream', name: 'Contrast Linen Cream', hex: '#efe4cb' },
  { id: 'saddle', name: 'Artisan Tan', hex: '#c59560' },
  { id: 'black', name: 'Pitch Black', hex: '#1c1c1c' },
  { id: 'oxblood', name: 'Oxblood Stitch', hex: '#8a2e3b' },
  { id: 'olive', name: 'Sage Olive', hex: '#485e4c' },
]

export const EDGE_LIST: { id: string; name: string; hex?: string }[] = [
  { id: 'match', name: 'Matched Darker Edge' },
  { id: 'black', name: 'Piano Black Lacquer', hex: '#141414' },
  { id: 'brown', name: 'Dark Roast Brown', hex: '#382519' },
  { id: 'oxblood', name: 'Oxblood Glaze', hex: '#5b1c24' },
  { id: 'natural', name: 'Raw Burnished & Beeswax', hex: '#cca777' },
]

export const LINING_LIST: { id: string; name: string; hex: string }[] = [
  { id: 'sand', name: 'Sand Microfiber Canvas', hex: '#e8dcbe' },
  { id: 'espresso', name: 'Espresso Cotton Twill', hex: '#3a2b23' },
  { id: 'forest', name: 'Forest Green Suede', hex: '#27382d' },
  { id: 'navy', name: 'Midnight Navy Suede', hex: '#1f2a3e' },
  { id: 'bordeaux', name: 'Bordeaux Velour', hex: '#521d28' },
]

export const FOIL_LIST: {
  id: Configuration['monogramMethod']
  name: string
  surcharge: number
  stops?: string[]
}[] = [
  {
    id: 'gold_foil',
    name: '24K Gold Foil',
    surcharge: 300,
    stops: ['#f4dc9a', '#b98a2e', '#f0d17e', '#8f6a1f', '#e9c66e'],
  },
  {
    id: 'silver_foil',
    name: 'Silver Foil',
    surcharge: 280,
    stops: ['#f7f8fa', '#a9afb8', '#eceef2', '#8a909a', '#dfe2e7'],
  },
  {
    id: 'rose_foil',
    name: 'Rose Gold Foil',
    surcharge: 320,
    stops: ['#f3c9bd', '#b97a6c', '#efc0b2', '#94584d', '#e8b4a6'],
  },
  { id: 'blind_deboss', name: 'Blind Heat Deboss', surcharge: 200 },
  { id: 'embossed', name: 'Raised Emboss', surcharge: 220 },
  { id: 'engraved', name: 'Laser Engraved', surcharge: 250 },
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
  accentColorId: 'espresso',
  threadColorId: 'cream',
  edgeColorId: 'match',
  liningColorId: 'sand',
  leatherFinish: 'smooth',
  monogramFont: 'serif',
  monogramPlacement: 'center',
  monogramSize: 'M',
}

export const productById = (id: ProductId) =>
  PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0]

export const leatherById = (id: string) =>
  LEATHERS.find((leather) => leather.id === id) ?? LEATHERS[0]

export function configurationForProduct(
  productId: ProductId,
  current: Configuration = DEFAULT_CONFIGURATION,
): Configuration {
  const product = productById(productId)
  const clamp = (value: number, range: [number, number]) =>
    Math.min(range[1], Math.max(range[0], value))

  const defaults = product.defaultDimensions ?? {
    width: Math.round((product.dimensions.width[0] + product.dimensions.width[1]) / 2),
    height: Math.round((product.dimensions.height[0] + product.dimensions.height[1]) / 2),
    depth: Math.round((product.dimensions.depth[0] + product.dimensions.depth[1]) / 2),
  }

  // Adjust leather if current leather is too thick
  let leatherId = current.leatherId
  const currentLeather = leatherById(leatherId)
  if (currentLeather.thickness > product.maxLeatherThickness) {
    const validLeather = LEATHERS.find((l) => l.thickness <= product.maxLeatherThickness)
    if (validLeather) leatherId = validLeather.id
  }

  return {
    ...current,
    productId,
    leatherId,
    widthCm: current.productId === productId ? clamp(current.widthCm, product.dimensions.width) : defaults.width,
    heightCm: current.productId === productId ? clamp(current.heightCm, product.dimensions.height) : defaults.height,
    depthCm: current.productId === productId ? clamp(current.depthCm, product.dimensions.depth) : defaults.depth,
    removableStrap: product.supportsStrap ? current.removableStrap : false,
    paddedLining: product.supportsPadding ? current.paddedLining : false,
    pocketCount: product.supportsPockets ? Math.min(product.id === 'cardholder' ? 3 : 5, current.pocketCount) : 0,
  }
}
