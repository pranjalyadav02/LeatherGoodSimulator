import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_CONFIGURATION,
  EDGE_LIST,
  FOIL_LIST,
  HARDWARE_LIST,
  LEATHERS,
  LINING_LIST,
  PRODUCTS,
  THREAD_LIST,
  configurationForProduct,
  leatherById,
  productById,
} from './catalog'
import {
  calculateStudioCost,
  configurationSummary,
  decodeConfiguration,
  decodeDesignSnapshot,
  encodeDesignSnapshot,
  findBudgetAlternatives,
  parseDesignRequest,
  recommendAlternatives,
  validateConfiguration,
} from './engine'
import type {
  Configuration,
  HardwareId,
  MonogramFont,
  MonogramMethod,
  MonogramPlacement,
  MonogramSize,
  ParsedDesign,
  ProductId,
} from './types'
import MarketDashboard from './MarketDashboard'
import Product3DViewer from './Product3DViewer'
import { AdminPortal } from './admin/AdminPortal'
import { RecommendationModal } from './RecommendationModal'
import { submitBespokeQuote } from './api'
import { LoginPage } from './auth/LoginPage'
import { LeatherLibraryModal } from './LeatherLibraryModal'
import { getCurrentSession, clearSession, type UserSession } from './auth/authStore'
import {
  loadSavedDesigns,
  isSavedSnapshot,
  resolveSavedDesign,
  saveDesignVersion,
  type SavedDesign,
} from './savedDesigns'
import './App.css'

const TODAY_ISO = new Date().toISOString().slice(0, 10)
type AssistantMessage = { role: 'assistant' | 'customer'; text: string }
type CustomTab = 'leather' | 'hardware' | 'size' | 'monogram' | 'review'

const ARTISAN_PRESETS = [
  {
    id: 'classic',
    name: 'Classic Heritage',
    badge: '★ Best Seller',
    leatherId: 'heritage-calf',
    colorId: 'saddle',
    accentColorId: 'espresso',
    hardware: 'brass' as HardwareId,
    threadColorId: 'cream',
    edgeColorId: 'match',
  },
  {
    id: 'noir',
    name: 'Espresso Noir',
    badge: 'Sleek Minimal',
    leatherId: 'pebble-grain',
    colorId: 'espresso',
    accentColorId: 'black',
    hardware: 'black' as HardwareId,
    threadColorId: 'black',
    edgeColorId: 'black',
  },
  {
    id: 'oxblood',
    name: 'Royal Oxblood',
    badge: 'Luxury Evening',
    leatherId: 'saffiano',
    colorId: 'oxblood',
    accentColorId: 'saddle',
    hardware: 'brass' as HardwareId,
    threadColorId: 'oxblood',
    edgeColorId: 'oxblood',
  },
  {
    id: 'forest',
    name: 'Forest & Nickel',
    badge: 'Artisan Atelier',
    leatherId: 'heritage-calf',
    colorId: 'olive',
    accentColorId: 'natural',
    hardware: 'silver' as HardwareId,
    threadColorId: 'cream',
    edgeColorId: 'natural',
  },
]

const SIZE_PRESETS: Record<
  ProductId,
  {
    compact: { w: number; h: number; d: number; label: string }
    standard: { w: number; h: number; d: number; label: string }
    roomy: { w: number; h: number; d: number; label: string }
  }
> = {
  tote: {
    compact: { w: 30, h: 26, d: 10, label: 'Compact City' },
    standard: { w: 36, h: 30, d: 14, label: 'Daily Carryall' },
    roomy: { w: 44, h: 36, d: 18, label: 'Roomy Weekender' },
  },
  handbag: {
    compact: { w: 22, h: 18, d: 7, label: 'Mini Sling' },
    standard: { w: 26, h: 21, d: 9, label: 'Classic Shoulder' },
    roomy: { w: 32, h: 26, d: 13, label: 'Executive Day' },
  },
  wallet: {
    compact: { w: 10, h: 8.5, d: 1.5, label: 'Slim Pocket' },
    standard: { w: 11.5, h: 9.5, d: 2, label: 'Standard Bifold' },
    roomy: { w: 13, h: 10.5, d: 2.8, label: 'Travel & Cash' },
  },
  cardholder: {
    compact: { w: 8.5, h: 6.5, d: 0.6, label: 'Ultra Minimal' },
    standard: { w: 10, h: 7.5, d: 0.8, label: 'Essential Daily' },
    roomy: { w: 11.5, h: 8.5, d: 1.2, label: 'Expanded 8-Card' },
  },
  sleeve: {
    compact: { w: 28, h: 20, d: 2, label: '11" Tablet / Passport' },
    standard: { w: 34, h: 24, d: 2.5, label: '13"–14" Laptop' },
    roomy: { w: 38, h: 28, d: 3.5, label: '15"–16" Pro Laptop' },
  },
  toiletry: {
    compact: { w: 22, h: 12, d: 10, label: 'Overnight Kit' },
    standard: { w: 25, h: 14, d: 12, label: 'Standard Dopp' },
    roomy: { w: 30, h: 18, d: 15, label: 'Extended Travel' },
  },
  sunglass: {
    compact: { w: 15, h: 7, d: 3.5, label: 'Slim Optical' },
    standard: { w: 17, h: 8, d: 4.5, label: 'Standard Eyewear' },
    roomy: { w: 19, h: 9.5, d: 5.5, label: 'Oversized Shades' },
  },
}

function Product2DPreview({ config }: { config: Configuration }) {
  const product = productById(config.productId)
  const leather = leatherById(config.leatherId)
  const color = leather.colors.find((item) => item.id === config.colorId)?.hex ?? '#a65e35'
  const isTote = config.productId === 'tote'
  const isSleeve = config.productId === 'sleeve'
  const isHandbag = config.productId === 'handbag'
  const isWallet = config.productId === 'wallet'
  const isToiletry = config.productId === 'toiletry'
  const isSunglass = config.productId === 'sunglass'

  const leatherPath = isTote
    ? 'M105 136 Q108 124 124 122 L356 122 Q373 124 378 140 L356 344 Q353 359 337 360 L146 360 Q129 359 126 344 Z'
    : isHandbag
      ? 'M120 148 Q124 136 142 136 L338 136 Q356 136 360 148 L354 326 Q350 348 328 350 L152 350 Q130 348 126 326 Z'
      : isSleeve
        ? 'M110 124 Q110 116 120 116 L362 116 Q372 116 372 126 L360 330 Q359 341 348 341 L124 341 Q113 341 112 330 Z'
        : isWallet
          ? 'M125 142 Q125 134 136 134 L344 134 Q355 134 355 142 L350 318 Q349 328 338 328 L142 328 Q131 328 130 318 Z'
          : isToiletry
            ? 'M116 150 Q120 138 134 138 L346 138 Q360 138 364 150 L360 310 Q356 324 342 324 L138 324 Q124 324 120 310 Z'
            : isSunglass
              ? 'M130 162 Q134 148 152 148 L328 148 Q346 148 350 162 L344 298 Q340 314 324 314 L156 314 Q140 314 136 298 Z'
              : 'M134 155 Q134 143 147 143 L335 143 Q348 143 348 156 L342 309 Q341 320 329 320 L151 320 Q139 320 139 308 Z'

  const hwMatch = HARDWARE_LIST.find((h) => h.id === config.hardware)
  const hardwareColor = hwMatch?.hex ?? '#d4aa4a'

  return (
    <svg className="product-art" viewBox="0 0 480 420" role="img" aria-label={`${product.name} 2D blueprint in ${color}`}>
      <defs>
        <linearGradient id="leather2d" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor="#221711" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id="sideShade2d" x1="0" x2="1">
          <stop offset="0%" stopColor="#1b1713" stopOpacity=".28" />
          <stop offset="50%" stopColor="#fff" stopOpacity=".06" />
          <stop offset="100%" stopColor="#120e0b" stopOpacity=".26" />
        </linearGradient>
        <filter id="softShadow2d" x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <ellipse cx="240" cy="372" rx="145" ry="16" fill="#4a3b30" opacity=".18" filter="url(#softShadow2d)" />

      {isTote && (
        <>
          <path d="M157 141 C147 50 184 41 219 119 M316 141 C326 50 289 41 254 119" fill="none" stroke="#482d1c" strokeWidth="20" strokeLinecap="round" />
          <path d="M157 141 C147 50 184 41 219 119 M316 141 C326 50 289 41 254 119" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" />
        </>
      )}

      {isHandbag && (
        <>
          <path d="M175 140 C175 65 305 65 305 140" fill="none" stroke="#482d1c" strokeWidth="16" strokeLinecap="round" />
          <path d="M175 140 C175 65 305 65 305 140" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        </>
      )}

      <path d={leatherPath} fill="url(#leather2d)" stroke="#2b1f17" strokeWidth="2.2" />
      <path d={leatherPath} fill="url(#sideShade2d)" opacity=".8" />

      {isHandbag && (
        <>
          <path d="M125 152 Q240 215 355 152 L350 220 Q240 258 130 220 Z" fill={color} stroke="#2b1f17" strokeWidth="1.8" />
          <rect x="232" y="222" width="16" height="24" rx="4" fill={hardwareColor} />
          <circle cx="240" cy="234" r="4" fill="#222" />
        </>
      )}

      {isWallet && (
        <>
          <path d="M130 216 L350 216" stroke="#2b1f17" strokeWidth="2" strokeDasharray="3 4" />
          <rect x="330" y="200" width="22" height="32" rx="6" fill={color} stroke="#2b1f17" strokeWidth="1.5" />
          <circle cx="341" cy="216" r="5" fill={hardwareColor} />
        </>
      )}

      {isToiletry && (
        <>
          <path d="M124 148 L356 148" stroke={hardwareColor} strokeWidth="6" strokeLinecap="round" />
          <rect x="340" y="142" width="12" height="18" rx="2" fill={hardwareColor} />
        </>
      )}

      <path d={leatherPath} fill="none" stroke="#f2dbbe" strokeOpacity=".7" strokeWidth="1.4" strokeDasharray="3 5" />

      {config.monogram && (
        <text
          x={config.monogramPlacement === 'corner' ? '310' : '240'}
          y={isTote ? '220' : isHandbag ? '275' : isWallet ? '260' : '230'}
          textAnchor="middle"
          className="preview-monogram"
          style={{
            fontFamily:
              config.monogramFont === 'script'
                ? 'Pinyon Script, cursive'
                : config.monogramFont === 'sans'
                  ? 'Instrument Sans, sans-serif'
                  : 'Newsreader, serif',
            fontSize: config.monogramSize === 'L' ? '28px' : config.monogramSize === 'S' ? '18px' : '22px',
            fill: config.monogramMethod.includes('gold')
              ? '#d4aa4a'
              : config.monogramMethod.includes('silver')
                ? '#c5c8cc'
                : config.monogramMethod.includes('rose')
                  ? '#cb9285'
                  : '#222',
            letterSpacing: '0.12em',
          }}
        >
          {config.monogram}
        </text>
      )}

      <g className="dimension-mark">
        <path d="M94 137 L94 354 M87 137 L101 137 M87 354 L101 354" />
        <text x="72" y="250" transform="rotate(-90 72 250)">
          {config.heightCm} cm
        </text>
        <path d="M130 383 L354 383 M130 377 L130 389 M354 377 L354 389" />
        <text x="242" y="403" textAnchor="middle">
          {config.widthCm} cm wide · {config.depthCm} cm deep
        </text>
      </g>
    </svg>
  )
}

function formatMoney(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN')
}

export function App() {
  const initialHashValue = window.location.hash.startsWith('#config=') ? window.location.hash.slice(8) : ''
  const initialSnapshot = initialHashValue ? decodeDesignSnapshot(initialHashValue) : null

  const [configuration, setConfiguration] = useState<Configuration>(() => {
    return initialSnapshot?.configuration ?? DEFAULT_CONFIGURATION
  })

  const [designIdentity, setDesignIdentity] = useState(() => ({
    id: initialSnapshot?.designId ?? 'SN-CARRY-7491',
    version: initialSnapshot?.designVersion ?? 1,
  }))

  const [activeTab, setActiveTab] = useState<CustomTab>('leather')
  const [history, setHistory] = useState<Configuration[]>([])
  const [altOriginal, setAltOriginal] = useState<Configuration | null>(null)
  const [targetBudget, setTargetBudget] = useState('4500')
  const [previewMode, setPreviewMode] = useState<'3d' | '2d'>('3d')
  const [designCodeInput, setDesignCodeInput] = useState('')

  const [savedDesignState, setSavedDesignState] = useState<{ designs: SavedDesign[]; error: string }>(() => {
    try {
      return { designs: loadSavedDesigns(), error: '' }
    } catch (error) {
      return {
        designs: [],
        error: error instanceof Error ? error.message : 'Could not load saved design history.',
      }
    }
  })
  const savedDesigns = savedDesignState.designs

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      text: 'Welcome to SynnergyNexus & Carry Bespoke Studio. Describe what you’d like to create, adjust, or target by budget!',
    },
  ])
  const [messageInput, setMessageInput] = useState('')
  const [proposal, setProposal] = useState<ParsedDesign | null>(null)
  const [notice, setNotice] = useState(() => {
    const hashValue = window.location.hash.startsWith('#config=') ? window.location.hash.slice(8) : ''
    return hashValue && !decodeConfiguration(hashValue)
      ? 'This shared design link was out of date. A fresh studio model has been loaded.'
      : ''
  })

  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quotePrepared, setQuotePrepared] = useState(false)
  const [referenceImage, setReferenceImage] = useState('')
  const [referenceName, setReferenceName] = useState('')
  const [referenceError, setReferenceError] = useState('')
  const [marketOpen, setMarketOpen] = useState(false)
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false)
  const [userSession, setUserSession] = useState<UserSession | null>(() => getCurrentSession())
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authInitialRole, setAuthInitialRole] = useState<'admin' | 'customer'>('customer')
  const [adminOpen, setAdminOpen] = useState(() => {
    const isHashAdmin = typeof window !== 'undefined' && window.location.hash.includes('admin')
    const session = getCurrentSession()
    return isHashAdmin && session?.role === 'admin'
  })
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const [leatherLibraryOpen, setLeatherLibraryOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.includes('admin')) {
        const session = getCurrentSession()
        if (session && session.role === 'admin') {
          setAdminOpen(true)
          setMarketOpen(false)
        } else {
          setAdminOpen(false)
          window.location.hash = ''
        }
      } else {
        setAdminOpen(false)
      }
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Validation & Costing
  const issues = useMemo(() => validateConfiguration(configuration), [configuration])
  const errors = issues.filter((issue) => issue.severity === 'error')
  const studioCost = useMemo(() => calculateStudioCost(configuration), [configuration])

  const budgetNumber = Number(targetBudget) || 0
  const budgetAlternatives = useMemo(() => {
    if (budgetNumber > 0 && studioCost.total > budgetNumber) {
      return findBudgetAlternatives(configuration, budgetNumber)
    }
    return []
  }, [configuration, budgetNumber, studioCost.total])

  const recommendations = useMemo(
    () => (errors.length ? recommendAlternatives(configuration) : []),
    [configuration, errors.length],
  )

  const product = productById(configuration.productId)
  const leather = leatherById(configuration.leatherId)
  const selectedColor = leather.colors.find((color) => color.id === configuration.colorId) ?? leather.colors[0]
  const isCurrentSavedVersion = isSavedSnapshot(savedDesigns, designIdentity.id, designIdentity.version, configuration)
  const displayedVersion = isCurrentSavedVersion ? designIdentity.version : designIdentity.version

  const pushHistory = (current: Configuration) => {
    setHistory((prev) => [...prev.slice(-25), current])
  }

  const update = <K extends keyof Configuration>(key: K, value: Configuration[K]) => {
    pushHistory(configuration)
    setAltOriginal(null)
    setConfiguration((prev) => ({ ...prev, [key]: value }))
  }

  const switchProduct = (productId: ProductId) => {
    pushHistory(configuration)
    setAltOriginal(null)
    setConfiguration((prev) => configurationForProduct(productId, prev))
    setNotice(`Switched to ${productById(productId).name}. Proportions set to model defaults.`)
  }

  const applyArtisanPreset = (preset: (typeof ARTISAN_PRESETS)[number]) => {
    pushHistory(configuration)
    setConfiguration((prev) => ({
      ...prev,
      leatherId: preset.leatherId,
      colorId: preset.colorId,
      accentColorId: preset.accentColorId,
      hardware: preset.hardware,
      threadColorId: preset.threadColorId,
      edgeColorId: preset.edgeColorId,
    }))
    setNotice(`Applied ${preset.name} artisan look.`)
  }

  const applySizePreset = (presetKey: 'compact' | 'standard' | 'roomy') => {
    const presets = SIZE_PRESETS[configuration.productId]
    if (!presets) return
    const p = presets[presetKey]
    pushHistory(configuration)
    setConfiguration((prev) => ({
      ...prev,
      widthCm: p.w,
      heightCm: p.h,
      depthCm: p.d,
    }))
    setNotice(`Sized to ${p.label} (${p.w} × ${p.h} × ${p.d} cm).`)
  }

  const undo = () => {
    if (history.length === 0) {
      setNotice('No previous action to undo.')
      return
    }
    const previous = history[history.length - 1]
    setHistory((prev) => prev.slice(0, -1))
    setConfiguration(previous)
    setNotice('Previous configuration restored.')
  }

  const resetToDefault = () => {
    pushHistory(configuration)
    setConfiguration(configurationForProduct(configuration.productId, DEFAULT_CONFIGURATION))
    setNotice('Reset to product standard defaults.')
  }

  const shuffleDesign = () => {
    pushHistory(configuration)
    const randomLeather = LEATHERS[Math.floor(Math.random() * LEATHERS.length)]
    const randomColor = randomLeather.colors[Math.floor(Math.random() * randomLeather.colors.length)]
    const randomHw = HARDWARE_LIST[Math.floor(Math.random() * HARDWARE_LIST.length)]
    const randomThread = THREAD_LIST[Math.floor(Math.random() * THREAD_LIST.length)]
    const randomEdge = EDGE_LIST[Math.floor(Math.random() * EDGE_LIST.length)]
    const randomFoil = FOIL_LIST[Math.floor(Math.random() * FOIL_LIST.length)]

    setConfiguration((prev) => ({
      ...prev,
      leatherId: randomLeather.id,
      colorId: randomColor.id,
      hardware: randomHw.id,
      threadColorId: randomThread.id,
      edgeColorId: randomEdge.id,
      monogramMethod: randomFoil.id,
    }))
    setNotice('Generated an artisan palette combination.')
  }

  const previewAlternative = (alt: Configuration) => {
    setAltOriginal(configuration)
    setConfiguration(alt)
    setNotice('Previewing budget alternative. Click “Restore original” to revert anytime.')
  }

  const restoreOriginalDesign = () => {
    if (!altOriginal) return
    setConfiguration(altOriginal)
    setAltOriginal(null)
    setNotice('Original design restored.')
  }

  // Workshop Build Sheet text
  const workshopSpecText = useMemo(() => {
    const hwMatch = HARDWARE_LIST.find((h) => h.id === configuration.hardware)
    const foilMatch = FOIL_LIST.find((f) => f.id === configuration.monogramMethod)
    const threadMatch = THREAD_LIST.find((t) => t.id === configuration.threadColorId)
    const edgeMatch = EDGE_LIST.find((e) => e.id === configuration.edgeColorId)
    const liningMatch = LINING_LIST.find((l) => l.id === configuration.liningColorId)

    const lines = [
      '========================================================================',
      '      SYNERGY-NEXUS × CARRY LEATHER GOODS BESPOKE SPECIFICATION        ',
      '========================================================================',
      `Workshop Status: ${errors.length ? 'NEEDS REVISION' : 'APPROVED FOR BENCH CUTTING'}`,
      `Design Reference: ${designIdentity.id} · Version: v${displayedVersion}`,
      `Date Issued:      ${TODAY_ISO}`,
      `Product Category: ${product.category} (${product.name})`,
      `Collection:       ${product.carryCollection ?? 'Carry Core Bespoke'}`,
      '',
      '--- 1. FINISHED PRODUCT DIMENSIONS ---',
      `Width:            ${configuration.widthCm} cm (tolerance ±0.3 cm)`,
      `Height:           ${configuration.heightCm} cm (tolerance ±0.3 cm)`,
      `Depth / Gusset:   ${configuration.depthCm} cm (tolerance ±0.3 cm)`,
      `Net Leather Area: ${studioCost.leatherAreaSqFt} sq. ft. (including 25% cutting yield)`,
      '',
      '--- 2. MATERIALS & BILL OF COMPONENTS ---',
      `Primary Leather:  ${leather.name}`,
      `Grade & Tanning:  ${leather.grade} · ${leather.finish}`,
      `Thickness:        ${leather.thickness} mm (tolerance ±0.1 mm)`,
      `Color Code:       ${selectedColor.name} (${selectedColor.hex})`,
      `Lining:           ${liningMatch?.name ?? 'Sand Microfiber Canvas'}`,
      `Hardware:         ${hwMatch?.name ?? 'Brushed Gold / Brass'}`,
      `Thread / Stitch:  ${threadMatch?.name ?? 'Contrast Linen Cream'}`,
      `Edge Paint:       ${edgeMatch?.name ?? 'Matched Darker Edge'}`,
      '',
      '--- 3. BESPOKE PERSONALIZATION & MONOGRAM ---',
      configuration.monogram
        ? `Initials:         ${configuration.monogram}\nMethod / Foil:    ${foilMatch?.name ?? configuration.monogramMethod}\nTypography:       ${configuration.monogramFont ?? 'serif'}\nPlacement:        ${configuration.monogramPlacement === 'corner' ? 'Lower right corner' : 'Front centered'}\nScale:            ${configuration.monogramSize ?? 'M'}`
        : 'Initials:         None specified',
      '',
      '--- 4. STRUCTURAL & FUNCTIONAL DETAILS ---',
      `Removable Strap:  ${configuration.removableStrap ? 'Yes (adjustable with snap hooks)' : 'No'}`,
      `Padded Lining:    ${configuration.paddedLining ? 'Yes (high-density protective foam)' : 'Standard'}`,
      `Interior Pockets: ${configuration.pocketCount} pocket(s)`,
      configuration.customRequest ? `Artisan Notes:    "${configuration.customRequest}"` : 'Artisan Notes:    None',
      '',
      '--- 5. COMMERCIAL ESTIMATE & TIMELINE ---',
      `Leather Hide:     ${formatMoney(studioCost.leatherCost)} (@ ₹${studioCost.ratePerSqFtUsed}/sq.ft)`,
      `Hardware Kit:     ${formatMoney(studioCost.hardwareCost)}`,
      `Bench Labor:      ${formatMoney(studioCost.laborCost)}`,
      `Lining & Trim:    ${formatMoney(studioCost.liningCost + studioCost.monogramCost)}`,
      `Estimated Total:  ${formatMoney(studioCost.total)} (indicative manufacturing benchmark)`,
      `Estimated Bench:  ${studioCost.estimatedDays} working days to dispatch`,
      '',
      '--- 6. PRE-PRODUCTION CHECKLIST ---',
      '[ ] Physical color swatch approved by client',
      '[ ] Leather thickness gauged with micrometer',
      '[ ] Hardware fasteners and tensile strength verified',
      '[ ] Monogram brass stamping die aligned and heat tested',
      '========================================================================',
    ]
    return lines.join('\n')
  }, [configuration, product, leather, selectedColor, designIdentity, displayedVersion, studioCost, errors])

  const copyWorkshopSpec = async () => {
    try {
      await navigator.clipboard.writeText(workshopSpecText)
      setNotice('Workshop specification copied to clipboard.')
    } catch {
      setNotice('Could not copy automatically. Select text in the specification box.')
    }
  }

  const downloadSpecFile = () => {
    const blob = new Blob([workshopSpecText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SPEC-${designIdentity.id}-v${displayedVersion}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setNotice('Downloaded workshop specification file.')
  }

  const exportDesignCode = () => {
    const payload = {
      id: designIdentity.id,
      v: displayedVersion,
      config: configuration,
    }
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    setDesignCodeInput(code)
    navigator.clipboard.writeText(code).catch(() => {})
    setNotice('Design code generated and copied! Paste it anytime to reopen this exact 3D design.')
  }

  const importDesignCode = () => {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(designCodeInput.trim()))))
      if (!parsed?.config || !productById(parsed.config.productId)) {
        throw new Error('Invalid code format.')
      }
      pushHistory(configuration)
      setConfiguration(parsed.config)
      if (parsed.id) setDesignIdentity({ id: parsed.id, version: parsed.v ?? 1 })
      setNotice(`Loaded design ${parsed.id ?? ''} version v${parsed.v ?? 1}.`)
    } catch {
      setNotice('That design code isn’t valid. Please paste the full base64 code string.')
    }
  }

  const handleAssistantSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = messageInput.trim()
    if (!text) return
    const result = parseDesignRequest(text, configuration)
    setMessages((prev) => [
      ...prev,
      { role: 'customer', text },
      {
        role: 'assistant',
        text: result.recognized.length
          ? `I mapped your request to: ${result.recognized.join(' · ')}. I’ve prepared an editable proposal for you to review and apply to the 3D model.`
          : 'I couldn’t confidently recognize specific leather or product parameters yet. Tell me what product, color, or detail you would like!',
      },
    ])
    setProposal(result.recognized.length ? result : null)
    setMessageInput('')
  }

  const applyProposal = () => {
    if (!proposal) return
    pushHistory(configuration)
    setConfiguration(configurationForProduct(proposal.configuration.productId, proposal.configuration))
    setProposal(null)
    setNotice('Your reviewed choices have been applied to the 3D studio.')
  }

  const handleReference = (file?: File) => {
    setReferenceError('')
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setReferenceError('Use a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setReferenceError('Please choose an image under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReferenceImage(reader.result)
        setReferenceName(file.name)
      } else {
        setReferenceError('The selected image could not be read.')
      }
    }
    reader.onerror = () => setReferenceError('The selected image could not be read.')
    reader.readAsDataURL(file)
  }

  const shareConfiguration = async () => {
    const value = encodeDesignSnapshot(configuration, designIdentity.id, displayedVersion || null)
    const url = `${window.location.origin}${window.location.pathname}#config=${value}`
    window.history.replaceState(null, '', `#config=${value}`)
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Share link copied to clipboard. Monogram and personal notes are excluded.')
    } catch {
      setNotice('Share link ready in the address bar.')
    }
  }

  const saveCurrentDesign = () => {
    try {
      const result = saveDesignVersion(savedDesigns, configuration, designIdentity.id ?? undefined)
      setSavedDesignState({ designs: result.designs, error: '' })
      setDesignIdentity({ id: result.saved.id, version: result.saved.version })
      setNotice(`Saved ${result.saved.id} · version ${result.saved.version} in this browser.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this design.')
    }
  }

  const restoreDesignVersion = (saved: SavedDesign) => {
    const restored = resolveSavedDesign(savedDesigns, saved.id, saved.version)
    if (!restored) {
      setNotice('This saved design version is invalid or unavailable.')
      return
    }
    pushHistory(configuration)
    setConfiguration(restored)
    setDesignIdentity({ id: saved.id, version: saved.version })
    setSavedDesignsOpen(false)
    setNotice(`Restored ${saved.id} · version ${saved.version}.`)
  }

  const submitQuoteRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const clientName = (formData.get('name') as string) || 'Bespoke Client'
    const clientEmail = (formData.get('email') as string) || 'client@carrytote.in'
    const clientNote = (formData.get('note') as string) || ''

    try {
      await submitBespokeQuote({
        customer: { name: clientName, email: clientEmail },
        productId: configuration.productId,
        productName: product.name,
        leatherId: configuration.leatherId,
        leatherName: leather.name,
        colorName: selectedColor.name,
        hardware: configuration.hardware,
        monogram: configuration.monogram,
        monogramMethod: configuration.monogramMethod,
        dimensions: `${configuration.widthCm} × ${configuration.heightCm} × ${configuration.depthCm} cm`,
        totalPrice: studioCost.total,
        notes: clientNote,
        workshopSpec: workshopSpecText,
        configuration,
      })
      setNotice('Bespoke quote queued in Carry Workshop Bench system.')
    } catch {
      // fallback handled gracefully
    }
    setQuotePrepared(true)
  }

  return (
    <div className="app-shell">
      {/* Top Studio Header */}
      <header className="site-header">
        <a className="brand" href="#" aria-label="Atelier N°07 × SynnergyNexus">
          <span className="brand-mark">SN<span>07</span></span>
          <span className="brand-name">
            SYNERGY<b>NEXUS</b> <small>× CARRY BESPOKE STUDIO</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={!marketOpen && !adminOpen ? 'active' : ''}
            onClick={() => {
              setMarketOpen(false)
              setAdminOpen(false)
              window.location.hash = ''
            }}
          >
            3D Studio &amp; Configurator
          </button>
          <button
            className={marketOpen && !adminOpen ? 'active' : ''}
            onClick={() => {
              setMarketOpen(true)
              setAdminOpen(false)
              window.location.hash = ''
            }}
          >
            Live Market Prices
          </button>
          <button
            type="button"
            onClick={() => setLeatherLibraryOpen(true)}
          >
            📖 Hide &amp; Grain Library
          </button>
          {userSession?.role === 'admin' && (
            <button
              className={adminOpen ? 'active' : ''}
              style={{ fontWeight: 700 }}
              onClick={() => {
                setAdminOpen(true)
                setMarketOpen(false)
                window.location.hash = '#admin'
              }}
            >
              ⚙ Atelier Admin Portal
            </button>
          )}
        </nav>

        <div className="header-actions">
          {userSession ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--cream)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                {userSession.role === 'admin' ? '⚙️' : '👤'} {userSession.fullName}
                <small style={{ marginLeft: '4px', color: userSession.role === 'admin' ? 'var(--brown)' : 'var(--muted)', fontWeight: 700 }}>
                  ({userSession.role.toUpperCase()})
                </small>
              </span>
              <button
                type="button"
                className="text-button"
                style={{ fontSize: '10.5px', color: 'var(--muted)' }}
                onClick={() => {
                  clearSession()
                  setUserSession(null)
                  setAdminOpen(false)
                  window.location.hash = ''
                  setNotice('Signed out of atelier session.')
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              className="action-pill-button"
              onClick={() => {
                setAuthInitialRole('customer')
                setAuthModalOpen(true)
              }}
            >
              🔑 Sign In / Access
            </button>
          )}

          <span className="availability">
            <i /> Handcrafted in India
          </span>
          <button className="saved-designs-button" onClick={() => setSavedDesignsOpen(true)} title="Saved Version History">
            Saved versions {savedDesigns.length > 0 && <span>{savedDesigns.length}</span>}
          </button>
          <button className="action-pill-button" onClick={saveCurrentDesign} title="Save version snapshot">
            ♡ Save v{displayedVersion}
          </button>
        </div>
      </header>

      <main>
        {adminOpen && userSession?.role === 'admin' ? (
          <AdminPortal
            onBackToStudio={() => {
              setAdminOpen(false)
              window.location.hash = ''
            }}
          />
        ) : marketOpen ? (
          <MarketDashboard onBack={() => setMarketOpen(false)} selectedMaterial={leather.name} />
        ) : (
          <>
            {/* Intro Hero Strip */}
            <section className="intro">
              <div className="eyebrow">
                <span>SIMULATION-BASED BESPOKE ATELIER</span>
                <span className="eyebrow-line" />
                Carry Leather Goods · Real-Time 3D Configurator
              </div>
              <div className="intro-copy">
                <div>
                  <h1>
                    Crafted for the<br />
                    <em>way you move.</em>
                  </h1>
                  <p>
                    Select a silhouette, customize natural full-grain hides, hardware, and foil monograms in 3D with live manufacturing costing.
                  </p>
                </div>
                <div className="quick-toolbar">
                  <button className="tb-btn" onClick={() => setRecommendationOpen(true)} title="AI Style & Harmony Recommender">
                    ✦ Smart Recommender
                  </button>
                  <button className="tb-btn" onClick={undo} title="Undo last change">↶ Undo</button>
                  <button className="tb-btn" onClick={shuffleDesign} title="Inspire with random combination">✦ Shuffle</button>
                  <button className="tb-btn" onClick={resetToDefault} title="Reset to defaults">↺ Reset</button>
                  <button className="tb-btn primary" onClick={shareConfiguration} title="Share design link">↗ Share link</button>
                </div>
              </div>
            </section>

            {/* Carry Product Family Selection Strip */}
            <div className="product-families-bar" role="tablist" aria-label="Product Families">
              {PRODUCTS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={configuration.productId === item.id}
                  className={`family-tab ${configuration.productId === item.id ? 'active' : ''}`}
                  onClick={() => switchProduct(item.id)}
                >
                  <span className="family-name">{item.name}</span>
                  <span className="family-category">{item.category}</span>
                  <span className="family-badge">{item.indicativePriceRange ?? `₹${item.basePrice}`}</span>
                </button>
              ))}
            </div>

            {/* Main Balanced 2-Column Studio Layout */}
            <div className="studio-layout" id="design">
              {/* Left Column: Sticky 3D Stage & Quick Action Strip */}
              <section className="preview-column" aria-label="Interactive Product Preview">
                <div className="preview-topline">
                  <div className="mode-toggle-group">
                    <button
                      className={`mode-btn ${previewMode === '3d' ? 'active' : ''}`}
                      onClick={() => setPreviewMode('3d')}
                    >
                      ❖ 3D Studio
                    </button>
                    <button
                      className={`mode-btn ${previewMode === '2d' ? 'active' : ''}`}
                      onClick={() => setPreviewMode('2d')}
                    >
                      ◧ 2D Blueprint
                    </button>
                  </div>
                  <div className="preview-spec-badge">
                    {product.name} · {configuration.widthCm}×{configuration.heightCm}×{configuration.depthCm} cm
                  </div>
                </div>

                <div className="preview-stage-container">
                  {previewMode === '3d' ? (
                    <Product3DViewer config={configuration} />
                  ) : (
                    <div className="art-wrap">
                      <Product2DPreview config={configuration} />
                    </div>
                  )}

                  <button
                    className="assistant-orb"
                    onClick={() => setAssistantOpen(true)}
                    aria-label="Open AI Leather Design Assistant"
                    title="Ask AI Design Assistant"
                  >
                    ✳
                  </button>
                </div>

                {/* Instant Color Switcher directly beneath 3D Stage */}
                <div className="stage-quick-swatches-card">
                  <div className="quick-swatches-head">
                    <span className="small-label">QUICK SHADE SWITCH</span>
                    <span className="quick-shade-name">{selectedColor.name}</span>
                  </div>
                  <div className="swatches" role="radiogroup" aria-label="Quick Leather Shade">
                    {leather.colors.map((color) => (
                      <button
                        key={`quick-${color.id}`}
                        className={`swatch ${configuration.colorId === color.id ? 'selected' : ''}`}
                        style={{ '--swatch': color.hex } as React.CSSProperties}
                        onClick={() => update('colorId', color.id)}
                        aria-label={color.name}
                        title={color.name}
                      >
                        {configuration.colorId === color.id && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Manufacturing Price & Budget Card */}
                <div className="live-pricing-card">
                  <div className="price-primary-row">
                    <div>
                      <span className="small-label">LIVE MANUFACTURING ESTIMATE</span>
                      <div className="price-display">
                        <span className="currency">₹</span>
                        <span className="amount">{studioCost.total.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="leadtime-pill">⏱ ~{studioCost.estimatedDays} working days craft time</span>
                    </div>

                    <div className="budget-input-wrapper">
                      <label htmlFor="target-budget-input">Target Budget (₹)</label>
                      <input
                        id="target-budget-input"
                        type="number"
                        min="500"
                        step="100"
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(e.target.value)}
                        placeholder="e.g. 4000"
                      />
                    </div>
                  </div>

                  {budgetNumber > 0 && (
                    <div className="budget-evaluation">
                      {studioCost.total <= budgetNumber ? (
                        <div className="budget-status-tag ok">
                          <span>✓ Within budget</span> by {formatMoney(budgetNumber - studioCost.total)}
                        </div>
                      ) : (
                        <div className="budget-status-tag over">
                          <span>⚠ Over target budget</span> by {formatMoney(studioCost.total - budgetNumber)}
                        </div>
                      )}

                      {budgetAlternatives.length > 0 && (
                        <div className="budget-alternative-box">
                          <div className="alt-head">
                            <strong>Suggested Alternative: {formatMoney(budgetAlternatives[0].price)}</strong>
                            <span>Saves {formatMoney(studioCost.total - budgetAlternatives[0].price)}</span>
                          </div>
                          <ul className="alt-changes">
                            {budgetAlternatives[0].changes.map((change, idx) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                          <div className="alt-actions">
                            <button
                              type="button"
                              className="alt-apply-btn"
                              onClick={() => previewAlternative(budgetAlternatives[0].configuration)}
                            >
                              Preview Alternative
                            </button>
                            {altOriginal && (
                              <button
                                type="button"
                                className="alt-restore-btn"
                                onClick={restoreOriginalDesign}
                              >
                                Restore Original ({formatMoney(calculateStudioCost(altOriginal).total)})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column: Intuitive Tabbed Customization Studio */}
              <section className="configuration-column" aria-label="Bespoke Controls">
                {/* Curated One-Click Artisan Presets Strip */}
                <div className="artisan-presets-strip">
                  <span className="presets-label">CURATED STYLES:</span>
                  <div className="presets-list">
                    {ARTISAN_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="preset-chip"
                        onClick={() => applyArtisanPreset(p)}
                        title={`Apply ${p.name}`}
                      >
                        <span className="preset-name">{p.name}</span>
                        <span className="preset-badge">{p.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step Tabs Navigation */}
                <div className="step-tabs-bar" role="tablist">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'leather'}
                    className={`step-tab ${activeTab === 'leather' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leather')}
                  >
                    <span className="tab-num">01</span>
                    <span className="tab-title">Hide &amp; Color</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'hardware'}
                    className={`step-tab ${activeTab === 'hardware' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hardware')}
                  >
                    <span className="tab-num">02</span>
                    <span className="tab-title">Hardware &amp; Craft</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'size'}
                    className={`step-tab ${activeTab === 'size' ? 'active' : ''}`}
                    onClick={() => setActiveTab('size')}
                  >
                    <span className="tab-num">03</span>
                    <span className="tab-title">Size &amp; Fit</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'monogram'}
                    className={`step-tab ${activeTab === 'monogram' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monogram')}
                  >
                    <span className="tab-num">04</span>
                    <span className="tab-title">Monogram</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'review'}
                    className={`step-tab ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('review')}
                  >
                    <span className="tab-num">05</span>
                    <span className="tab-title">Spec &amp; Quote</span>
                  </button>
                </div>

                {/* Tab 1: Leather & Color */}
                {activeTab === 'leather' && (
                  <div className="control-section tab-panel">
                    <div className="section-title">
                      <div>
                        <span className="section-index">01</span>
                        <h3>Choose Your Leather</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setLeatherLibraryOpen(true)}
                          style={{ fontSize: '11px', color: 'var(--brown)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          📖 Leather Library &amp; Guide ↗
                        </button>
                        <span className="badge-verified">{leather.status}</span>
                      </div>
                    </div>

                    <div className="leather-picker">
                      {LEATHERS.map((item) => (
                        <button
                          key={item.id}
                          className={`leather-option ${configuration.leatherId === item.id ? 'selected' : ''}`}
                          onClick={() => update('leatherId', item.id)}
                        >
                          <span className={`leather-sample sample-${item.id}`} />
                          <span className="leather-option-copy">
                            <b>{item.name}</b>
                            <small>{item.grade} · {item.thickness} mm · ₹{item.ratePerSqFt}/sq.ft</small>
                          </span>
                          <span className="radio-dot">{configuration.leatherId === item.id && <i />}</span>
                        </button>
                      ))}
                    </div>

                    {leather.availableFinishes && leather.availableFinishes.length > 1 && (
                      <div className="sub-control-row">
                        <span className="field-label">SURFACE TEXTURE FINISH</span>
                        <div className="pills-row">
                          {leather.availableFinishes.map((f) => (
                            <button
                              key={f}
                              className={`pill-btn ${configuration.leatherFinish === f ? 'selected' : ''}`}
                              onClick={() => update('leatherFinish', f)}
                            >
                              {f.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="color-row">
                      <div>
                        <span className="field-label">PRIMARY BODY COLOR</span>
                        <span className="color-name">{selectedColor.name}</span>
                      </div>
                      <div className="swatches" role="radiogroup" aria-label="Body Leather color">
                        {leather.colors.map((color) => (
                          <button
                            key={color.id}
                            className={`swatch ${configuration.colorId === color.id ? 'selected' : ''}`}
                            style={{ '--swatch': color.hex } as React.CSSProperties}
                            onClick={() => update('colorId', color.id)}
                            aria-label={color.name}
                            title={color.name}
                          >
                            {configuration.colorId === color.id && <span className="check">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="color-row">
                      <div>
                        <span className="field-label">{product.accentName?.toUpperCase() ?? 'ACCENT LEATHER TRIM'}</span>
                        <span className="color-name">
                          {leather.colors.find((c) => c.id === configuration.accentColorId)?.name ?? 'Contrast trim'}
                        </span>
                      </div>
                      <div className="swatches" role="radiogroup" aria-label="Accent leather color">
                        {leather.colors.map((color) => (
                          <button
                            key={`accent-${color.id}`}
                            className={`swatch ${configuration.accentColorId === color.id ? 'selected' : ''}`}
                            style={{ '--swatch': color.hex } as React.CSSProperties}
                            onClick={() => update('accentColorId', color.id)}
                            aria-label={color.name}
                            title={`Accent: ${color.name}`}
                          >
                            {configuration.accentColorId === color.id && <span className="check">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="step-nav-footer">
                      <button className="nav-next-btn" onClick={() => setActiveTab('hardware')}>
                        Continue to Hardware &amp; Craft →
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Hardware & Craft */}
                {activeTab === 'hardware' && (
                  <div className="control-section tab-panel">
                    <div className="section-title">
                      <div>
                        <span className="section-index">02</span>
                        <h3>Hardware &amp; Craft Details</h3>
                      </div>
                    </div>

                    <label className="select-row">
                      <span>
                        <b>Hardware Finish</b>
                        <small>Solid fittings in polished, brushed, or matte finishes</small>
                      </span>
                      <select
                        value={configuration.hardware}
                        onChange={(e) => update('hardware', e.target.value as HardwareId)}
                      >
                        {HARDWARE_LIST.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} (+₹{h.surcharge})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="select-row">
                      <span>
                        <b>Saddler Linen Thread</b>
                        <small>Waxed French saddler stitching</small>
                      </span>
                      <select
                        value={configuration.threadColorId ?? 'cream'}
                        onChange={(e) => update('threadColorId', e.target.value)}
                      >
                        {THREAD_LIST.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="select-row">
                      <span>
                        <b>Hand-Finished Edge Paint</b>
                        <small>Burnished Italian edge lacquer</small>
                      </span>
                      <select
                        value={configuration.edgeColorId ?? 'match'}
                        onChange={(e) => update('edgeColorId', e.target.value)}
                      >
                        {EDGE_LIST.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="select-row">
                      <span>
                        <b>Interior Lining Material</b>
                        <small>Protective luxury lining</small>
                      </span>
                      <select
                        value={configuration.liningColorId ?? 'sand'}
                        onChange={(e) => update('liningColorId', e.target.value)}
                      >
                        {LINING_LIST.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {product.supportsStrap && (
                      <label className="toggle-row">
                        <span>
                          <b>Removable Shoulder Strap</b>
                          <small>Detachable strap with matching brass clips</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={configuration.removableStrap}
                          onChange={(e) => update('removableStrap', e.target.checked)}
                        />
                      </label>
                    )}

                    {product.supportsPadding && (
                      <label className="toggle-row">
                        <span>
                          <b>Protective Padded Lining</b>
                          <small>Dense shock-absorbing interior cushioning</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={configuration.paddedLining}
                          onChange={(e) => update('paddedLining', e.target.checked)}
                        />
                      </label>
                    )}

                    {product.supportsPockets && (
                      <label className="select-row pocket-row">
                        <span>
                          <b>Interior Pockets</b>
                          <small>Card slots, drop-pockets, and compartments</small>
                        </span>
                        <select
                          value={configuration.pocketCount}
                          onChange={(e) => update('pocketCount', Number(e.target.value))}
                        >
                          <option value={0}>None</option>
                          <option value={1}>1 interior pocket</option>
                          <option value={2}>2 interior pockets</option>
                          <option value={3}>3 interior pockets</option>
                          <option value={4}>4 interior pockets</option>
                          <option value={5}>5 interior pockets</option>
                        </select>
                      </label>
                    )}

                    <div className="step-nav-footer">
                      <button className="nav-prev-btn" onClick={() => setActiveTab('leather')}>
                        ← Back to Leather
                      </button>
                      <button className="nav-next-btn" onClick={() => setActiveTab('size')}>
                        Continue to Size &amp; Fit →
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Size & Proportions */}
                {activeTab === 'size' && (
                  <div className="control-section tab-panel">
                    <div className="section-title">
                      <div>
                        <span className="section-index">03</span>
                        <h3>Size &amp; Proportions</h3>
                      </div>
                      <span className="unit-note">CENTIMETRES</span>
                    </div>

                    {/* Quick Size Preset Cards */}
                    <div className="size-presets-grid">
                      {(['compact', 'standard', 'roomy'] as const).map((key) => {
                        const p = SIZE_PRESETS[configuration.productId]?.[key]
                        if (!p) return null
                        const isMatch =
                          configuration.widthCm === p.w &&
                          configuration.heightCm === p.h &&
                          configuration.depthCm === p.d
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`size-preset-card ${isMatch ? 'active' : ''}`}
                            onClick={() => applySizePreset(key)}
                          >
                            <span className="preset-size-name">{p.label}</span>
                            <span className="preset-size-dim">
                              {p.w} × {p.h} × {p.d} cm
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="fine-tuning-heading">Fine-Tune Dimensions:</div>

                    <div className="dimension-fields">
                      {([
                        ['widthCm', 'Width', product.dimensions.width],
                        ['heightCm', 'Height', product.dimensions.height],
                        ['depthCm', 'Depth / Gusset', product.dimensions.depth],
                      ] as const).map(([key, label, range]) => (
                        <label className="dimension-field" key={key}>
                          <span>{label}</span>
                          <div>
                            <input
                              type="range"
                              min={range[0]}
                              max={range[1]}
                              step={0.5}
                              value={configuration[key]}
                              onChange={(e) => update(key, Number(e.target.value))}
                            />
                            <span className="range-num">{configuration[key]} cm</span>
                          </div>
                          <small>{range[0]}–{range[1]} cm allowable workshop limit</small>
                        </label>
                      ))}
                    </div>

                    <div className="step-nav-footer">
                      <button className="nav-prev-btn" onClick={() => setActiveTab('hardware')}>
                        ← Back to Hardware
                      </button>
                      <button className="nav-next-btn" onClick={() => setActiveTab('monogram')}>
                        Continue to Monogram →
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 4: Monogram & Personalization */}
                {activeTab === 'monogram' && (
                  <div className="control-section tab-panel">
                    <div className="section-title">
                      <div>
                        <span className="section-index">04</span>
                        <h3>Bespoke Monogram</h3>
                      </div>
                      <span className="badge-foil">Hot Foil Stamping</span>
                    </div>

                    <div className="monogram-grid">
                      <label className="monogram-text-field">
                        <span className="field-label">INITIALS (UP TO 3 CHARACTERS)</span>
                        <input
                          type="text"
                          maxLength={3}
                          value={configuration.monogram}
                          onChange={(e) =>
                            update('monogram', e.target.value.toUpperCase().replace(/[^A-Z0-9 .&-]/g, ''))
                          }
                          placeholder="AB"
                        />
                      </label>

                      {/* Live Typography Preview Pill */}
                      {configuration.monogram && (
                        <div className="monogram-live-preview-box">
                          <span className="field-label">LIVE 3D FOIL PREVIEW:</span>
                          <div
                            className="preview-monogram-sample"
                            style={{
                              fontFamily:
                                configuration.monogramFont === 'script'
                                  ? 'Pinyon Script, cursive'
                                  : configuration.monogramFont === 'sans'
                                    ? 'Instrument Sans, sans-serif'
                                    : 'Newsreader, serif',
                              color: configuration.monogramMethod.includes('gold')
                                ? '#d4aa4a'
                                : configuration.monogramMethod.includes('silver')
                                  ? '#c5c8cc'
                                  : configuration.monogramMethod.includes('rose')
                                    ? '#cb9285'
                                    : '#222',
                            }}
                          >
                            {configuration.monogram}
                          </div>
                        </div>
                      )}

                      <label className="select-row">
                        <span><b>Stamping Finish</b></span>
                        <select
                          value={configuration.monogramMethod}
                          onChange={(e) => update('monogramMethod', e.target.value as MonogramMethod)}
                        >
                          {FOIL_LIST.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} (+₹{f.surcharge})
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="two-cols">
                        <label className="select-row">
                          <span><b>Typography Style</b></span>
                          <select
                            value={configuration.monogramFont ?? 'serif'}
                            onChange={(e) => update('monogramFont', e.target.value as MonogramFont)}
                          >
                            <option value="serif">Timeless Serif</option>
                            <option value="script">Calligraphy Script</option>
                            <option value="sans">Modern Sans</option>
                          </select>
                        </label>

                        <label className="select-row">
                          <span><b>Placement Position</b></span>
                          <select
                            value={configuration.monogramPlacement ?? 'center'}
                            onChange={(e) => update('monogramPlacement', e.target.value as MonogramPlacement)}
                          >
                            <option value="center">Front Center</option>
                            <option value="corner">Lower Right Corner</option>
                          </select>
                        </label>
                      </div>

                      <label className="select-row">
                        <span><b>Size Scale</b></span>
                        <div className="pills-row">
                          {(['S', 'M', 'L'] as MonogramSize[]).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              className={`pill-btn ${configuration.monogramSize === sz ? 'selected' : ''}`}
                              onClick={() => update('monogramSize', sz)}
                            >
                              {sz === 'S' ? 'Small (Subtle)' : sz === 'M' ? 'Medium (Standard)' : 'Large (Bold)'}
                            </button>
                          ))}
                        </div>
                      </label>
                    </div>

                    <label className="custom-request-field">
                      <span className="field-label">SPECIAL ARTISAN INSTRUCTIONS <span>OPTIONAL</span></span>
                      <textarea
                        rows={2}
                        maxLength={240}
                        value={configuration.customRequest}
                        onChange={(e) => update('customRequest', e.target.value)}
                        placeholder="e.g. Please use contrast edge paint or double stitching on shoulder strap..."
                      />
                    </label>

                    <div className="step-nav-footer">
                      <button className="nav-prev-btn" onClick={() => setActiveTab('size')}>
                        ← Back to Size
                      </button>
                      <button className="nav-next-btn" onClick={() => setActiveTab('review')}>
                        Review Specification &amp; Cost →
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 5: Workshop Specification & Review */}
                {activeTab === 'review' && (
                  <div className="control-section tab-panel">
                    <div className="section-title">
                      <div>
                        <span className="section-index">05</span>
                        <h3>Artisan Build Sheet &amp; Quote</h3>
                      </div>
                      <span className={`status-indicator ${errors.length ? 'invalid' : 'ready'}`}>
                        {errors.length ? '⚠ Adjustments Required' : '✓ Ready for Bench'}
                      </span>
                    </div>

                    {errors.length > 0 && (
                      <div className="issue-list" role="alert">
                        {errors.map((issue) => (
                          <p key={issue.code}>{issue.message}</p>
                        ))}
                        {recommendations.map((item, index) => (
                          <button
                            className="recommendation"
                            key={`${item.title}-${index}`}
                            onClick={() => setConfiguration(item.configuration)}
                          >
                            <span>TRY THIS INSTEAD</span>
                            <b>{item.title}</b>
                            <small>{item.changes.join(' · ')}</small>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Cost Breakdown Table */}
                    <div className="breakdown-grid" style={{ marginBottom: '16px' }}>
                      <div className="b-row">
                        <span>Leather hide ({studioCost.leatherAreaSqFt} sq.ft @ ₹{studioCost.ratePerSqFtUsed})</span>
                        <b>{formatMoney(studioCost.leatherCost)}</b>
                      </div>
                      <div className="b-row">
                        <span>Hardware kit ({configuration.hardware})</span>
                        <b>{formatMoney(studioCost.hardwareCost)}</b>
                      </div>
                      <div className="b-row">
                        <span>Artisan bench craft &amp; edge burnish</span>
                        <b>{formatMoney(studioCost.laborCost)}</b>
                      </div>
                      <div className="b-row">
                        <span>Reinforced lining &amp; pocket construction</span>
                        <b>{formatMoney(studioCost.liningCost)}</b>
                      </div>
                      {studioCost.monogramCost > 0 && (
                        <div className="b-row">
                          <span>Custom monogram &amp; foil stamp</span>
                          <b>{formatMoney(studioCost.monogramCost)}</b>
                        </div>
                      )}
                      <div className="b-row total">
                        <span>Total Indicative Price</span>
                        <b>{formatMoney(studioCost.total)}</b>
                      </div>
                    </div>

                    <pre className="workshop-spec-sheet" id="workshop-spec" tabIndex={0}>
                      {workshopSpecText}
                    </pre>

                    <div className="spec-action-buttons">
                      <button className="primary-button" onClick={copyWorkshopSpec}>
                        📋 Copy Workshop Spec
                      </button>
                      <button className="secondary-button" onClick={downloadSpecFile}>
                        ⤓ Download Spec (.txt)
                      </button>
                    </div>

                    <div className="design-code-box">
                      <label htmlFor="design-code-field">
                        <span>Portable Design Code (Share or Reopen)</span>
                        <div className="code-input-row">
                          <input
                            id="design-code-field"
                            type="text"
                            value={designCodeInput}
                            onChange={(e) => setDesignCodeInput(e.target.value)}
                            placeholder="Paste design code here..."
                          />
                          <button type="button" onClick={importDesignCode}>Open</button>
                        </div>
                      </label>
                      <button type="button" className="text-link" onClick={exportDesignCode}>
                        Generate current design code ↗
                      </button>
                    </div>

                    <div className="commercial-actions" style={{ marginTop: '16px' }}>
                      <button
                        className="quote-request-button"
                        disabled={errors.length > 0}
                        onClick={() => {
                          setShowQuoteForm(true)
                          setQuotePrepared(false)
                        }}
                      >
                        Request Consultation &amp; Artisan Quote <span>↗</span>
                      </button>
                      <button className="print-btn" onClick={() => window.print()}>
                        Print Design Brief ⌁
                      </button>
                    </div>

                    <div className="step-nav-footer">
                      <button className="nav-prev-btn" onClick={() => setActiveTab('monogram')}>
                        ← Back to Monogram
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Materials Knowledge Library Section */}
            <section className="materials-section" id="materials">
              <div className="section-kicker">
                THE HIDE &amp; GRAIN LIBRARY <span>02 — 03</span>
              </div>
              <div className="materials-heading">
                <div>
                  <h2>
                    Living materials<br />
                    <em>that mature with grace.</em>
                  </h2>
                  <p>
                    Learn how each hide grade, tanning method, and grain finish behaves over years of daily carry.
                  </p>
                </div>
                <button
                  type="button"
                  className="tb-btn primary"
                  onClick={() => setLeatherLibraryOpen(true)}
                  style={{ whiteSpace: 'nowrap', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  📖 Open Complete Leather Encyclopedia ↗
                </button>
              </div>

              <div className="material-cards">
                {LEATHERS.map((item, index) => (
                  <article
                    className={`material-card ${configuration.leatherId === item.id ? 'chosen' : ''}`}
                    key={item.id}
                  >
                    <div className={`material-image texture-${index}`}>
                      <span>{item.grade.toUpperCase()}</span>
                      <button
                        onClick={() => {
                          update('leatherId', item.id)
                          setActiveTab('leather')
                          document.getElementById('design')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        aria-label={`Choose ${item.name}`}
                      >
                        Select ↗
                      </button>
                    </div>
                    <div className="material-card-body">
                      <div>
                        <h3>{item.name}</h3>
                        <span>{item.finish}</span>
                      </div>
                      <p>{item.description}</p>
                      <div className="material-meta">
                        <span>{item.temper}</span>
                        <span>{item.thickness.toFixed(1)} mm</span>
                        <span>₹{item.ratePerSqFt}/sq.ft</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <a className="brand" href="#">
          <span className="brand-mark">SN<span>07</span></span>
          <span className="brand-name">SYNERGY<b>NEXUS</b> × CARRY</span>
        </a>
        <span>SIMULATION-BASED BESPOKE LEATHER GOODS CONFIGURATOR</span>
        <span>ATELIER 2026</span>
      </footer>

      {/* Floating AI Assistant Modal */}
      {assistantOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAssistantOpen(false)
          }}
        >
          <section className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
            <div className="assistant-head">
              <div>
                <span className="assistant-spark">✳</span>
                <div>
                  <span className="small-label">SYNERGYNEXUS AI ASSISTANT</span>
                  <h2 id="assistant-title">Artisan Co-Designer</h2>
                </div>
              </div>
              <button
                className="close-button"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
            <p className="assistant-disclaimer">
              Describe your dream bag, budget, or preferred colors in natural language. The assistant maps recognized terms directly to 3D configurable choices.
            </p>

            <div className="chat-messages" aria-live="polite">
              {messages.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  <span>{message.role === 'assistant' ? 'ATELIER AI' : 'YOU'}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            {proposal && (
              <div className="proposal-card">
                <span className="small-label">PROPOSED CONFIGURATION</span>
                <ul>
                  {configurationSummary(proposal.configuration).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {proposal.questions.map((question) => (
                  <p className="proposal-question" key={question}>
                    ? {question}
                  </p>
                ))}
                <button className="primary-button" onClick={applyProposal}>
                  Apply to 3D Studio <span>→</span>
                </button>
              </div>
            )}

            <form className="chat-form" onSubmit={handleAssistantSubmit}>
              <input
                id="assistant-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="e.g. Cognac veg-tan handbag with brass hardware and gold foil PY..."
              />
              <button type="submit" aria-label="Send message">
                ↑
              </button>
            </form>

            <div className="reference-box">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleReference(e.target.files?.[0])}
              />
              <button className="upload-button" onClick={() => fileRef.current?.click()}>
                ＋ <span>{referenceName ? 'Change reference photo' : 'Attach reference photo'}</span>
              </button>
              {referenceError && <p className="upload-error">{referenceError}</p>}
              {referenceImage && (
                <div className="reference-preview">
                  <img src={referenceImage} alt="Customer reference photo" />
                  <span>{referenceName}</span>
                  <button onClick={() => { setReferenceImage(''); setReferenceName('') }}>Remove</button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Quote / Consultation Dialog */}
      {showQuoteForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowQuoteForm(false)
          }}
        >
          <section className="quote-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <button className="close-button" onClick={() => setShowQuoteForm(false)} aria-label="Close quote form">
              ×
            </button>
            {quotePrepared ? (
              <>
                <span className="quote-icon">✓</span>
                <h2 id="quote-title">Specification Brief Prepared.</h2>
                <p>
                  Your bespoke specification {designIdentity.id} v{displayedVersion} is ready for consultation with Carry master artisans.
                </p>
                <button className="primary-button" onClick={() => { setShowQuoteForm(false); window.print() }}>
                  Print Artisan Brief <span>↗</span>
                </button>
              </>
            ) : (
              <>
                <span className="small-label">BESPOKE WORKSHOP CONSULTATION</span>
                <h2 id="quote-title">Book Artisan Review</h2>
                <p>
                  Review your {product.name} specification with an artisan before production begins.
                </p>
                <form onSubmit={submitQuoteRequest}>
                  <label>
                    Full Name
                    <input required name="name" autoComplete="name" placeholder="Your name" />
                  </label>
                  <label>
                    Email Address
                    <input required name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                  </label>
                  <label>
                    Custom Consultation Notes
                    <textarea name="note" rows={3} placeholder="Any specific requirements regarding fitting, delivery dates or hardware..." />
                  </label>
                  <button className="primary-button" type="submit">
                    Generate Production Order Brief <span>→</span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {/* Saved Versions Drawer */}
      {savedDesignsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSavedDesignsOpen(false)
          }}
        >
          <section className="saved-designs-dialog" role="dialog" aria-modal="true" aria-labelledby="saved-title">
            <div className="saved-dialog-head">
              <div>
                <span className="small-label">IMMUTABLE SNAPSHOT HISTORY</span>
                <h2 id="saved-title">Saved Versions</h2>
              </div>
              <button className="close-button" onClick={() => setSavedDesignsOpen(false)} aria-label="Close saved designs">
                ×
              </button>
            </div>
            {savedDesigns.length === 0 ? (
              <div className="saved-empty">No saved design versions in this browser yet.</div>
            ) : (
              <div className="saved-list">
                {savedDesigns.map((saved) => (
                  <article key={`${saved.id}-${saved.version}`}>
                    <div>
                      <b>{productById(saved.configuration.productId).name} · v{saved.version}</b>
                      <small>{saved.id} · {new Date(saved.savedAt).toLocaleDateString()}</small>
                      <span>{configurationSummary(saved.configuration).slice(1, 4).join(' · ')}</span>
                    </div>
                    <button onClick={() => restoreDesignVersion(saved)}>Restore v{saved.version}</button>
                  </article>
                ))}
              </div>
            )}
            <button className="primary-button" onClick={() => { setSavedDesignsOpen(false); saveCurrentDesign() }}>
              Save current configuration as new version <span>♡</span>
            </button>
          </section>
        </div>
      )}

      {/* Authentication & Role Differentiation Portal */}
      {authModalOpen && (
        <LoginPage
          initialRole={authInitialRole}
          onSuccess={(session) => {
            setUserSession(session)
            setAuthModalOpen(false)
            setNotice(`Welcome back, ${session.fullName} (${session.role === 'admin' ? 'Master Artisan' : 'Bespoke Patron'}).`)
            if (session.role === 'admin') {
              setAdminOpen(true)
              setMarketOpen(false)
              window.location.hash = '#admin'
            } else {
              setAdminOpen(false)
              if (window.location.hash.includes('admin')) {
                window.location.hash = ''
              }
            }
          }}
          onCancel={() => {
            setAuthModalOpen(false)
            if (window.location.hash.includes('admin')) {
              window.location.hash = ''
            }
          }}
        />
      )}

      {/* Smart Style & Harmony Recommendation Modal */}
      <RecommendationModal
        isOpen={recommendationOpen}
        onClose={() => setRecommendationOpen(false)}
        currentConfig={configuration}
        onApplyRecommendation={(rec) => {
          pushHistory(configuration)
          setConfiguration((prev) => ({ ...prev, ...rec }))
          setNotice('Applied recommended artisan styling.')
        }}
        targetBudget={budgetNumber > 0 ? budgetNumber : undefined}
      />

      {/* Bespoke Leather & Grain Library Encyclopedia Modal */}
      <LeatherLibraryModal
        isOpen={leatherLibraryOpen}
        onClose={() => setLeatherLibraryOpen(false)}
        currentLeatherId={configuration.leatherId}
        onSelectLeather={(leatherId) => {
          update('leatherId', leatherId)
          setActiveTab('leather')
          setNotice('Selected leather updated in 3D Studio.')
        }}
      />

      {/* Notification Toast */}
      {notice && (
        <div className="toast" role="status">
          <span>✳</span>
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
export default App
