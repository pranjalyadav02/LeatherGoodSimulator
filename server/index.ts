import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json')
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json')
const MARKET_FILE = path.join(DATA_DIR, 'market.json')
const DESIGNS_FILE = path.join(DATA_DIR, 'designs.json')
const PRICE_HISTORY_FILE = path.join(DATA_DIR, 'price_history.json')

// Helper for file reading/writing with fallbacks
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8')
      return fallback
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err)
    return fallback
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err)
  }
}

// Initial Seed Data
const INITIAL_QUOTES = [
  {
    id: 'Q-2026-0841',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    customer: {
      name: 'Ananya Sharma',
      email: 'ananya.sharma@example.com',
      phone: '+91 98201 44512',
      location: 'Mumbai, Maharashtra',
    },
    productId: 'tote',
    productName: 'Everyday Tote Bag',
    leatherId: 'heritage-calf',
    leatherName: 'Heritage Full-Grain Calf',
    colorName: 'Cognac Tan',
    hardware: 'brass',
    monogram: 'AS',
    monogramMethod: 'gold_foil',
    dimensions: '36 × 30 × 14 cm',
    totalPrice: 4707,
    status: 'In Cutting Bench',
    craftsman: 'Master Craftsman Rajesh K.',
    notes: 'Please ensure double edge wax burnishing on handle straps. Client requested high-shine brass fittings.',
    workshopSpec: `========================================================================
    SYNERGY-NEXUS × CARRY LEATHER GOODS BESPOKE SPECIFICATION
========================================================================
Workshop Status: APPROVED FOR BENCH CUTTING
Design Reference: SN-CARRY-7491 · Version: v1
Customer: Ananya Sharma <ananya.sharma@example.com>
Product Category: Tote bags (Everyday Tote)
Collection: Barsati & Carry Core

--- 1. FINISHED PRODUCT DIMENSIONS ---
Width:           36 cm (tolerance ±0.3 cm)
Height:          30 cm (tolerance ±0.3 cm)
Depth / Gusset:  14 cm (tolerance ±0.3 cm)
Net Leather Area: 8.42 sq. ft. (including 25% cutting yield)

--- 2. MATERIALS & BILL OF COMPONENTS ---
Primary Leather:  Heritage Full-Grain Calf (Semi-aniline veg-tan)
Color:            Cognac Tan (#9b5b2f)
Hardware Finish:  Solid Brushed Brass (Surcharge +₹350)
Stitching Thread: French Waxed Saddler Linen (Cream)
Edge Finish:      Hand-Burnished Italian Edge Lacquer (Dark Brown)
Lining:           Sand Microfiber Canvas
Monogram:         Hot Gold Foil Stamping "AS" (Front Center)

Total Indicative Production Estimate: ₹4,707`,
  },
  {
    id: 'Q-2026-0839',
    createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    customer: {
      name: 'Vikram Malhotra',
      email: 'vikram.m@zenithcapital.in',
      phone: '+91 98112 89043',
      location: 'New Delhi, NCR',
    },
    productId: 'wallet',
    productName: 'Bifold & Snap Wallet',
    leatherId: 'saffiano',
    leatherName: 'Saffiano Cross-Grain',
    colorName: 'Obsidian Black',
    hardware: 'black',
    monogram: 'VM',
    monogramMethod: 'blind_deboss',
    dimensions: '11.5 × 9.5 × 2 cm',
    totalPrice: 2260,
    status: 'Ready for Dispatch',
    craftsman: 'Artisan Suresh M.',
    notes: 'Packaging in luxury gift box with certificate of authenticity.',
    workshopSpec: `========================================================================
    SYNERGY-NEXUS × CARRY LEATHER GOODS BESPOKE SPECIFICATION
========================================================================
Workshop Status: QUALITY INSPECTION PASSED
Design Reference: SN-CARRY-6102 · Version: v2
Customer: Vikram Malhotra <vikram.m@zenithcapital.in>
Product Category: Small Leather Goods (Bifold & Snap Wallet)

--- 1. FINISHED PRODUCT DIMENSIONS ---
Width:           11.5 cm
Height:          9.5 cm
Depth / Gusset:  2.0 cm
Net Leather Area: 1.85 sq. ft.

--- 2. MATERIALS & BILL OF COMPONENTS ---
Primary Leather:  Saffiano Cross-Grain
Color:            Obsidian Black (#1c1b18)
Hardware:         Matte Black PVD Snap Clasp
Stitching Thread: Tone-on-tone Waxed Linen (Black)
Monogram:         Deep Blind Deboss "VM"

Total Indicative Production Estimate: ₹2,260`,
  },
  {
    id: 'Q-2026-0835',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    customer: {
      name: 'Priyanka Sen',
      email: 'priyanka.sen@designcollective.org',
      phone: '+91 97480 33219',
      location: 'Kolkata, West Bengal',
    },
    productId: 'handbag',
    productName: 'Sculptor Handbag',
    leatherId: 'smooth-nappa',
    leatherName: 'Smooth Italian Nappa',
    colorName: 'Oxblood Burgundy',
    hardware: 'silver',
    monogram: 'PS',
    monogramMethod: 'silver_foil',
    dimensions: '26 × 21 × 9 cm',
    totalPrice: 4890,
    status: 'In Stitching',
    craftsman: 'Master Craftsman Rajesh K.',
    notes: 'Contrast stitching requested along flap contour.',
    workshopSpec: `Product: Sculptor Handbag | Nappa Leather (Oxblood) | Antique Silver Clasp`,
  },
]

const INITIAL_INVENTORY = [
  {
    id: 'heritage-calf',
    category: 'Leather Hides',
    name: 'Heritage Full-Grain Calf',
    stockSqFt: 480,
    minThresholdSqFt: 200,
    ratePerSqFt: 260,
    supplier: 'Bavaria Hide Co. / Chennai Tanneries',
    status: 'In Stock',
    thicknessMm: 1.6,
  },
  {
    id: 'pebble-grain',
    category: 'Leather Hides',
    name: 'Pebble Grain Calf',
    stockSqFt: 310,
    minThresholdSqFt: 150,
    ratePerSqFt: 210,
    supplier: 'Ranipet Leather Works',
    status: 'In Stock',
    thicknessMm: 1.8,
  },
  {
    id: 'saddle-hide',
    category: 'Leather Hides',
    name: 'Saddle Hide (Heavy Veg-Tan)',
    stockSqFt: 140,
    minThresholdSqFt: 180,
    ratePerSqFt: 280,
    supplier: 'Kanpur Saddlery Tannery',
    status: 'Low Stock',
    thicknessMm: 2.8,
  },
  {
    id: 'saffiano',
    category: 'Leather Hides',
    name: 'Saffiano Cross-Grain',
    stockSqFt: 520,
    minThresholdSqFt: 200,
    ratePerSqFt: 235,
    supplier: 'Arzignano Finishing Mills',
    status: 'In Stock',
    thicknessMm: 1.5,
  },
  {
    id: 'smooth-nappa',
    category: 'Leather Hides',
    name: 'Smooth Italian Nappa',
    stockSqFt: 95,
    minThresholdSqFt: 120,
    ratePerSqFt: 250,
    supplier: 'Tuscany Leather Consortium',
    status: 'Low Stock',
    thicknessMm: 1.4,
  },
  {
    id: 'hw-brass',
    category: 'Hardware Kits',
    name: 'Solid Brushed Brass Fittings Kit',
    stockUnits: 145,
    minThresholdUnits: 50,
    costPerUnit: 350,
    supplier: 'Aligarh Metal Guild',
    status: 'In Stock',
  },
  {
    id: 'hw-silver',
    category: 'Hardware Kits',
    name: 'Antique Silver Finish Kit',
    stockUnits: 88,
    minThresholdUnits: 40,
    costPerUnit: 280,
    supplier: 'Moradabad Foundry',
    status: 'In Stock',
  },
  {
    id: 'hw-black',
    category: 'Hardware Kits',
    name: 'Matte Black PVD Hardware Kit',
    stockUnits: 110,
    minThresholdUnits: 40,
    costPerUnit: 320,
    supplier: 'Apex Electroplating',
    status: 'In Stock',
  },
  {
    id: 'thread-linen',
    category: 'Craft Supplies',
    name: 'Waxed French Saddler Linen Thread (Spools)',
    stockUnits: 42,
    minThresholdUnits: 15,
    costPerUnit: 180,
    supplier: 'Fil Au Chinois / Local Guild',
    status: 'In Stock',
  },
  {
    id: 'edge-lacquer',
    category: 'Craft Supplies',
    name: 'Italian Edge Burnishing Lacquer (Liters)',
    stockUnits: 18,
    minThresholdUnits: 10,
    costPerUnit: 420,
    supplier: 'Fenice Edge Chemicals',
    status: 'In Stock',
  },
]

const INITIAL_PRICE_HISTORY = [
  {
    id: 'ph-001',
    itemId: 'heritage-calf',
    itemName: 'Heritage Full-Grain Calf',
    category: 'Leather Hides',
    oldPrice: 240,
    newPrice: 260,
    changePercentage: 8.33,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Q1 Alpine tanners raw hide cost normalization',
    createdAt: '2026-01-15T10:30:00.000Z',
  },
  {
    id: 'ph-002',
    itemId: 'saddle-hide',
    itemName: 'Saddle Hide (Heavy Veg-Tan)',
    category: 'Leather Hides',
    oldPrice: 260,
    newPrice: 280,
    changePercentage: 7.69,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Tree-bark vegetable extract tariff adjustment',
    createdAt: '2026-02-01T14:15:00.000Z',
  },
  {
    id: 'ph-003',
    itemId: 'pebble-grain',
    itemName: 'Pebble Grain Calf',
    category: 'Leather Hides',
    oldPrice: 225,
    newPrice: 210,
    changePercentage: -6.67,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Bulk procurement rebate from Ranipet Tannery',
    createdAt: '2026-02-20T09:45:00.000Z',
  },
  {
    id: 'ph-004',
    itemId: 'saffiano',
    itemName: 'Saffiano Cross-Grain',
    category: 'Leather Hides',
    oldPrice: 220,
    newPrice: 235,
    changePercentage: 6.82,
    changedBy: 'Master Craftsman Rajesh K.',
    reason: 'Import air freight surcharge update',
    createdAt: '2026-03-05T11:20:00.000Z',
  },
]

// Initialize files if not existing
readJsonFile(QUOTES_FILE, INITIAL_QUOTES)
readJsonFile(INVENTORY_FILE, INITIAL_INVENTORY)
readJsonFile(MARKET_FILE, { observations: [] })
readJsonFile(DESIGNS_FILE, {})
readJsonFile(PRICE_HISTORY_FILE, INITIAL_PRICE_HISTORY)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'Atelier N°07 × Carry Bespoke Studio Backend',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
  })
})

// --- QUOTES & ORDERS API ---
app.get('/api/quotes', (_req, res) => {
  const quotes = readJsonFile(QUOTES_FILE, INITIAL_QUOTES)
  res.json({ quotes, count: quotes.length })
})

app.post('/api/quotes', (req, res) => {
  const body = req.body
  const quotes = readJsonFile(QUOTES_FILE, INITIAL_QUOTES)
  const newQuote = {
    id: `Q-${new Date().getFullYear()}-${String(quotes.length + 842).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    customer: body.customer ?? { name: 'Anonymous Client', email: 'guest@carrytote.in' },
    productId: body.productId ?? 'tote',
    productName: body.productName ?? 'Everyday Tote Bag',
    leatherId: body.leatherId ?? 'heritage-calf',
    leatherName: body.leatherName ?? 'Heritage Calf',
    colorName: body.colorName ?? 'Natural Brown',
    hardware: body.hardware ?? 'brass',
    monogram: body.monogram ?? '',
    monogramMethod: body.monogramMethod ?? 'gold_foil',
    dimensions: body.dimensions ?? 'Standard Proportions',
    totalPrice: body.totalPrice ?? 4500,
    status: 'New Quote Request',
    craftsman: 'Unassigned',
    notes: body.notes ?? '',
    workshopSpec: body.workshopSpec ?? '',
    configuration: body.configuration ?? null,
  }

  quotes.unshift(newQuote)
  writeJsonFile(QUOTES_FILE, quotes)
  res.status(201).json({ success: true, quote: newQuote })
})

app.patch('/api/quotes/:id', (req, res) => {
  const { id } = req.params
  const updates = req.body
  const quotes = readJsonFile(QUOTES_FILE, INITIAL_QUOTES)
  const index = quotes.findIndex((q: { id: string }) => q.id === id)

  if (index === -1) {
    return res.status(404).json({ error: `Quote with ID ${id} not found` })
  }

  quotes[index] = { ...quotes[index], ...updates, updatedAt: new Date().toISOString() }
  writeJsonFile(QUOTES_FILE, quotes)
  res.json({ success: true, quote: quotes[index] })
})

// --- INVENTORY API ---
app.get('/api/inventory', (_req, res) => {
  const inventory = readJsonFile(INVENTORY_FILE, INITIAL_INVENTORY)
  res.json({ inventory, count: inventory.length })
})

app.patch('/api/inventory/:id', (req, res) => {
  const { id } = req.params
  const updates = req.body
  const inventory = readJsonFile(INVENTORY_FILE, INITIAL_INVENTORY)
  const index = inventory.findIndex((item: { id: string }) => item.id === id)

  if (index === -1) {
    return res.status(404).json({ error: `Item ${id} not found in inventory` })
  }

  inventory[index] = { ...inventory[index], ...updates }
  writeJsonFile(INVENTORY_FILE, inventory)
  res.json({ success: true, item: inventory[index] })
})

// --- PRICE HISTORY API ---
app.get('/api/price-history', (_req, res) => {
  const history = readJsonFile(PRICE_HISTORY_FILE, INITIAL_PRICE_HISTORY)
  res.json({ history, count: history.length })
})

app.post('/api/price-history', (req, res) => {
  const record = req.body
  if (!record || !record.itemId || record.newPrice == null) {
    return res.status(400).json({ error: 'Missing price history record fields' })
  }
  const history = readJsonFile(PRICE_HISTORY_FILE, INITIAL_PRICE_HISTORY)
  const newEntry = {
    ...record,
    id: record.id || `ph-${Date.now().toString(36)}`,
    createdAt: record.createdAt || new Date().toISOString(),
  }
  const updated = [newEntry, ...history]
  writeJsonFile(PRICE_HISTORY_FILE, updated)
  res.status(201).json({ success: true, record: newEntry })
})

// --- DESIGNS API ---
app.get('/api/designs/:id', (req, res) => {
  const { id } = req.params
  const designs = readJsonFile<Record<string, unknown>>(DESIGNS_FILE, {})
  if (!designs[id]) {
    return res.status(404).json({ error: 'Design not found' })
  }
  res.json({ success: true, design: designs[id] })
})

app.post('/api/designs', (req, res) => {
  const { id, design } = req.body
  if (!id || !design) {
    return res.status(400).json({ error: 'Missing id or design payload' })
  }
  const designs = readJsonFile<Record<string, unknown>>(DESIGNS_FILE, {})
  designs[id] = { ...design, savedAt: new Date().toISOString() }
  writeJsonFile(DESIGNS_FILE, designs)
  res.status(201).json({ success: true, id })
})

// --- MULTI-CRITERIA RECOMMENDATION ENGINE API ---
interface RecRequest {
  productId?: string
  useCase?: 'daily_office' | 'travel_commute' | 'formal_luxury' | 'minimalist_edc' | 'weather_rugged'
  targetBudget?: number
  currentConfig?: {
    productId?: string
    leatherId?: string
    colorId?: string
    hardware?: string
    widthCm?: number
    heightCm?: number
    depthCm?: number
  }
}

app.post('/api/recommendations', (req, res) => {
  const query = (req.body ?? {}) as RecRequest
  const budget = query.targetBudget && query.targetBudget > 0 ? query.targetBudget : 4500
  const useCase = query.useCase ?? 'daily_office'
  const productId = query.productId ?? query.currentConfig?.productId ?? 'tote'

  // Curated rule heuristics
  const recommendations = []

  // 1. The Heritage Artisan Choice
  recommendations.push({
    id: 'rec-heritage',
    title: 'The Heritage Purist',
    subtitle: 'Full-Grain Vegetable-Tanned Patina Build',
    score: 96,
    suitability: 'Best for lifetime durability & warm aging',
    targetPrice: Math.round(budget * 0.95),
    highlights: [
      'Semi-aniline Heritage Calf develops a rich personal patina over time',
      'Solid Brushed Brass hardware resistant to corrosion and tarnishing',
      'French saddler linen thread in cream provides authentic hand-stitch contrast',
    ],
    config: {
      productId,
      leatherId: 'heritage-calf',
      colorId: 'cognac',
      accentColorId: 'espresso',
      hardware: 'brass',
      threadColorId: 'cream',
      edgeColorId: 'espresso',
      liningColorId: 'sand',
      monogramMethod: 'gold_foil',
      removableStrap: true,
      paddedLining: useCase === 'daily_office' || useCase === 'travel_commute',
      pocketCount: 3,
    },
    harmonyScore: 98,
    rationale:
      'Warm Cognac calf leather harmonizes with solid brass hardware (shared yellow undertones) and is anchored by hand-burnished dark edge lacquer.',
  })

  // 2. The Modern Executive Minimalist
  recommendations.push({
    id: 'rec-modern',
    title: 'Executive Noir',
    subtitle: 'Scratch-Proof Waxed Cross-Grain Silhouette',
    score: 93,
    suitability: 'Best for frequent business travel, rain, & sleek modern attire',
    targetPrice: Math.round(budget * 0.9),
    highlights: [
      'Saffiano pressed cross-hatch leather is water-repellent and scuff-resistant',
      'PVD Matte Black hardware gives an architectural, understated finish',
      'Tone-on-tone French black thread and edge seal for seamless silhouette',
    ],
    config: {
      productId,
      leatherId: 'saffiano',
      colorId: 'black',
      accentColorId: 'black',
      hardware: 'black',
      threadColorId: 'black',
      edgeColorId: 'black',
      liningColorId: 'charcoal',
      monogramMethod: 'blind_deboss',
      removableStrap: true,
      paddedLining: true,
      pocketCount: 4,
    },
    harmonyScore: 95,
    rationale:
      'Monochromatic architectural palette. High durability index against everyday scratches from laptop corners and city transit.',
  })

  // 3. The Evening & Gala Luxury
  recommendations.push({
    id: 'rec-luxury',
    title: 'Oxblood Velvet Touch',
    subtitle: 'Smooth Italian Nappa with Antique Silver',
    score: 91,
    suitability: 'Best for evening elegance, lightweight softness, and bespoke occasions',
    targetPrice: Math.round(budget * 1.05),
    highlights: [
      'Glove-soft aniline Nappa leather with exceptionally fine grain texture',
      'Antique silver hardware lends a cool, understated vintage luster',
      'Debossed rose or silver foil monogram adds jewelry-like refinement',
    ],
    config: {
      productId,
      leatherId: 'smooth-nappa',
      colorId: 'oxblood',
      accentColorId: 'espresso',
      hardware: 'silver',
      threadColorId: 'match',
      edgeColorId: 'black',
      liningColorId: 'bordeaux',
      monogramMethod: 'silver_foil',
      removableStrap: false,
      paddedLining: false,
      pocketCount: 2,
    },
    harmonyScore: 94,
    rationale:
      'Deep wine-red undertones pair coolly with antique silver fittings, creating an heirloom look ideal for formal and social outings.',
  })

  res.json({
    success: true,
    query: { productId, useCase, budget },
    recommendations,
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[Atelier N°07 Backend] REST API Server listening on port ${PORT}`)
  console.log(`[Atelier N°07 Backend] Quotes, Inventory, and Recommendation Engine active.`)
})
