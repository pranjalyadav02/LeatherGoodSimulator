import { useMemo, useRef, useState } from 'react'
import { DEFAULT_CONFIGURATION, LEATHERS, PRODUCTS, configurationForProduct, leatherById, productById } from './catalog'
import {
  calculatePrice,
  configurationSummary,
  decodeConfiguration,
  decodeDesignSnapshot,
  encodeDesignSnapshot,
  parseDesignRequest,
  recommendAlternatives,
  validateConfiguration,
} from './engine'
import type { Configuration, ParsedDesign, ProductId } from './types'
import MarketDashboard from './MarketDashboard'
import {
  loadSavedDesigns,
  isSavedSnapshot,
  resolveSavedDesign,
  saveDesignVersion,
  type SavedDesign,
} from './savedDesigns'
import './App.css'

type AssistantMessage = { role: 'assistant' | 'customer'; text: string }

function ProductPreview({ config }: { config: Configuration }) {
  const product = productById(config.productId)
  const leather = leatherById(config.leatherId)
  const color = leather.colors.find((item) => item.id === config.colorId)?.hex ?? '#a65e35'
  const isTote = config.productId === 'tote'
  const isSleeve = config.productId === 'sleeve'
  const leatherPath = isTote
    ? 'M105 136 Q108 124 124 122 L356 122 Q373 124 378 140 L356 344 Q353 359 337 360 L146 360 Q129 359 126 344 Z'
    : isSleeve
      ? 'M110 124 Q110 116 120 116 L362 116 Q372 116 372 126 L360 330 Q359 341 348 341 L124 341 Q113 341 112 330 Z'
      : 'M134 155 Q134 143 147 143 L335 143 Q348 143 348 156 L342 309 Q341 320 329 320 L151 320 Q139 320 139 308 Z'
  const hardwareColor = config.hardware === 'brass' ? '#c59a55' : config.hardware === 'silver' ? '#c3c4c0' : '#373b3a'

  return (
    <svg className="product-art" viewBox="0 0 480 420" role="img" aria-label={`${product.name} preview in ${color}`}>
      <defs>
        <linearGradient id="leather" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor="#221711" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="sideShade" x1="0" x2="1">
          <stop offset="0%" stopColor="#1b1713" stopOpacity=".27" />
          <stop offset="45%" stopColor="#fff" stopOpacity=".05" />
          <stop offset="100%" stopColor="#120e0b" stopOpacity=".24" />
        </linearGradient>
        <pattern id="leatherGrain" patternUnits="userSpaceOnUse" width="170" height="170">
          <image href="/textures/brown_leather_albedo_1k.jpg" width="170" height="170" preserveAspectRatio="xMidYMid slice" />
        </pattern>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      <ellipse cx="244" cy="371" rx="146" ry="17" fill="#56443a" opacity=".16" filter="url(#softShadow)" />
      {isTote && (
        <>
          <path d="M157 141 C147 50 184 41 219 119 M316 141 C326 50 289 41 254 119" fill="none" stroke="#553622" strokeWidth="20" strokeLinecap="round" />
          <path d="M157 141 C147 50 184 41 219 119 M316 141 C326 50 289 41 254 119" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" />
        </>
      )}
      <path d={leatherPath} fill="url(#leather)" stroke="#34251c" strokeWidth="2" />
      <path d={leatherPath} fill="url(#sideShade)" opacity=".8" />
      <path d={leatherPath} fill="url(#leatherGrain)" opacity=".3" style={{ mixBlendMode: 'multiply' }} />
      {isTote && <path d="M121 143 Q239 164 361 143" fill="none" stroke="#38271d" strokeWidth="4" />}
      {config.paddedLining && isSleeve && <path d="M130 139 L351 139 L345 317 L128 317 Z" fill="none" stroke="#e6d8c1" strokeWidth="7" opacity=".76" />}
      {config.pocketCount > 0 && (
        <>
          <path d={isTote ? 'M174 237 Q174 230 183 230 L321 230 Q329 230 329 238 L325 314 L177 314 Z' : 'M164 226 L317 226 L314 290 L161 290 Z'} fill={color} opacity=".62" stroke="#38271d" strokeWidth="1.4" />
          <path d={isTote ? 'M174 237 Q251 245 329 238' : 'M164 226 Q241 233 317 226'} fill="none" stroke="#dcc09a" strokeOpacity=".62" />
          {config.pocketCount > 1 && <path d={isTote ? 'M252 239 L250 314' : 'M241 229 L239 290'} stroke="#39291e" strokeOpacity=".46" />}
        </>
      )}
      <path d={leatherPath} fill="none" stroke="#efd1a6" strokeOpacity=".65" strokeWidth="1.4" strokeDasharray="2 5" />
      {!isTote && (
        <path d={isSleeve ? 'M110 163 Q240 178 369 163' : 'M136 203 Q240 214 346 203'} fill="none" stroke="#3b291c" strokeWidth="3" />
      )}
      {isTote && config.removableStrap && (
        <>
          <path d="M121 171 C49 229 62 342 132 348 M362 171 C429 229 417 342 352 348" fill="none" stroke="#5a4030" strokeWidth="9" strokeLinecap="round" />
          <circle cx="125" cy="171" r="8" fill={hardwareColor} />
          <circle cx="359" cy="171" r="8" fill={hardwareColor} />
        </>
      )}
      {isTote && <><circle cx="153" cy="151" r="7" fill={hardwareColor} /><circle cx="329" cy="151" r="7" fill={hardwareColor} /></>}
      {isSleeve && <rect x="342" y="148" width="13" height="16" rx="4" fill={hardwareColor} />}
      {isTote && config.monogram && <text x="251" y="210" textAnchor="middle" className="preview-monogram">{config.monogram}</text>}
      {isSleeve && config.monogram && <text x="241" y="196" textAnchor="middle" className="preview-monogram">{config.monogram}</text>}
      {!isTote && !isSleeve && (
        <>
          <path d="M149 225 L332 225 M149 258 L332 258 M196 225 L196 258 M284 225 L284 258" fill="none" stroke="#e9ceaa" strokeOpacity=".48" strokeWidth="2" />
          <text x="241" y="195" textAnchor="middle" className="preview-monogram">{config.monogram || '✦'}</text>
        </>
      )}
      <g className="dimension-mark">
        <path d="M94 137 L94 354 M87 137 L101 137 M87 354 L101 354" />
        <text x="72" y="250" transform="rotate(-90 72 250)">{config.heightCm} cm</text>
        <path d="M130 383 L354 383 M130 377 L130 389 M354 377 L354 389" />
        <text x="242" y="403" textAnchor="middle">{config.widthCm} cm wide</text>
      </g>
    </svg>
  )
}

function App() {
  const initialHashValue = window.location.hash.startsWith('#config=') ? window.location.hash.slice(8) : ''
  const initialSnapshot = initialHashValue ? decodeDesignSnapshot(initialHashValue) : null
  const [configuration, setConfiguration] = useState<Configuration>(() => {
    return initialSnapshot?.configuration ?? DEFAULT_CONFIGURATION
  })
  const [designIdentity, setDesignIdentity] = useState({
    id: initialSnapshot?.designId ?? null,
    version: initialSnapshot?.designVersion ?? 0,
  })
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
    { role: 'assistant', text: 'Welcome to the studio. Tell me what you have in mind and I’ll turn the details I recognize into an editable starting point.' },
  ])
  const [messageInput, setMessageInput] = useState('')
  const [proposal, setProposal] = useState<ParsedDesign | null>(null)
  const [notice, setNotice] = useState(() => {
    const hashValue = window.location.hash.startsWith('#config=') ? window.location.hash.slice(8) : ''
    return hashValue && !decodeConfiguration(hashValue)
      ? 'This shared design link is invalid or out of date. A fresh sample design has been loaded.'
      : ''
  })
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quotePrepared, setQuotePrepared] = useState(false)
  const [referenceImage, setReferenceImage] = useState('')
  const [referenceName, setReferenceName] = useState('')
  const [referenceError, setReferenceError] = useState('')
  const [activeSection, setActiveSection] = useState<'design' | 'materials' | 'details'>('design')
  const [marketOpen, setMarketOpen] = useState(false)
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false)
  const [targetBudget, setTargetBudget] = useState('')
  const [budgetPriority, setBudgetPriority] = useState('best-balance')
  const fileRef = useRef<HTMLInputElement>(null)

  const issues = useMemo(() => validateConfiguration(configuration), [configuration])
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const price = useMemo(() => calculatePrice(configuration), [configuration])
  const recommendations = useMemo(
    () => errors.length ? recommendAlternatives(configuration) : [],
    [configuration, errors.length],
  )
  const product = productById(configuration.productId)
  const leather = leatherById(configuration.leatherId)
  const selectedColor = leather.colors.find((color) => color.id === configuration.colorId) ?? leather.colors[0]
  const isCurrentSavedVersion = isSavedSnapshot(savedDesigns, designIdentity.id, designIdentity.version, configuration)
  const displayedVersion = isCurrentSavedVersion ? designIdentity.version : 0

  const update = <K extends keyof Configuration>(key: K, value: Configuration[K]) =>
    setConfiguration((previous) => ({ ...previous, [key]: value }))

  const switchProduct = (productId: ProductId) =>
    setConfiguration((previous) => configurationForProduct(productId, previous))

  const handleAssistantSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = messageInput.trim()
    if (!text) return
    const result = parseDesignRequest(text, configuration)
    setMessages((previous) => [
      ...previous,
      { role: 'customer', text },
      {
        role: 'assistant',
        text: result.recognized.length
          ? `Here’s what I could map to the sample catalog: ${result.recognized.join(' · ')}. I’ve kept this as a proposal so you can review it before anything changes.`
          : 'I couldn’t confidently map that to the sample catalog yet. I’ve left your design unchanged.',
      },
    ])
    setProposal(result.recognized.length ? result : null)
    setMessageInput('')
  }

  const applyProposal = () => {
    if (!proposal) return
    setConfiguration(configurationForProduct(proposal.configuration.productId, proposal.configuration))
    setProposal(null)
    setNotice('Your reviewed choices are now in the configurator.')
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
      setNotice('Share link copied. Monogram text and custom notes are intentionally excluded.')
    } catch {
      setNotice(`Share link ready (copy it from the address bar). Personal details are excluded.`)
    }
  }

  const saveCurrentDesign = () => {
    try {
      const result = saveDesignVersion(savedDesigns, configuration, designIdentity.id ?? undefined)
      setSavedDesignState({ designs: result.designs, error: '' })
      setDesignIdentity({ id: result.saved.id, version: result.saved.version })
      setNotice(`Saved ${result.saved.id} · version ${result.saved.version} in this browser. Use Share design for a portable versioned link.`)
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
    setConfiguration(restored)
    setDesignIdentity({ id: saved.id, version: saved.version })
    setSavedDesignsOpen(false)
    setNotice(`Restored ${saved.id} · version ${saved.version}.`)
  }

  const submitQuoteRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuotePrepared(true)
  }

  const goTo = (section: typeof activeSection) => {
    setActiveSection(section)
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const fieldValue = (key: 'widthCm' | 'heightCm' | 'depthCm') => configuration[key]

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Atelier N°07 home">
          <span className="brand-mark">A<span>07</span></span>
          <span className="brand-name">ATELIER <b>N°07</b></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={!marketOpen && activeSection === 'design' ? 'active' : ''} onClick={() => { setMarketOpen(false); goTo('design') }}>The studio</button>
          <button className={!marketOpen && activeSection === 'materials' ? 'active' : ''} onClick={() => { setMarketOpen(false); goTo('materials') }}>Materials</button>
          <button className={marketOpen ? 'active' : ''} onClick={() => setMarketOpen(true)}>Market prices</button>
        </nav>
        <div className="header-actions">
          <span className="availability"><i /> Made to order</span>
          <button className="icon-button bag-button" onClick={saveCurrentDesign} aria-label="Save current design">♡</button>
          <button className="saved-designs-button" onClick={() => setSavedDesignsOpen(true)}>Saved designs{savedDesigns.length > 0 && <span>{savedDesigns.length}</span>}</button>
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="eyebrow"><span>THE BESPOKE STUDIO</span><span className="eyebrow-line" /> No. 01 — made yours</div>
          <div className="intro-copy">
            <div>
              <h1>Made for the<br /><em>way you move.</em></h1>
              <p>Choose your silhouette, feel your materials, and make a piece that’s unmistakably yours.</p>
            </div>
            <div className="intro-side-note"><span>01 / 03</span><span>DESIGN YOUR PIECE<br />IN YOUR OWN TIME</span></div>
          </div>
        </section>

        {marketOpen ? (
          <MarketDashboard
            onBack={() => setMarketOpen(false)}
            selectedMaterial={leather.name}
          />
        ) : (
        <>
        <div className="studio-layout" id="design">
          <section className="preview-column" aria-label="Product preview">
            <div className="preview-topline">
              <div><span className="live-dot" /> LIVE PREVIEW</div>
              <div className="preview-controls"><button aria-label="Zoom out" onClick={() => setNotice('Use the dimensions controls to refine your design.')}>−</button><span>1:1</span><button aria-label="Zoom in" onClick={() => setNotice('Preview is illustrative, not dimensionally exact.')}>+</button></div>
            </div>
            <div className="preview-stage">
              <span className="stage-label">YOUR PIECE, IN PROGRESS</span>
              <div className="art-wrap"><ProductPreview config={configuration} /></div>
              <span className="stage-caption">A DIGITAL STUDY · HANDCRAFTED TO ORDER</span>
              <button className="assistant-orb" onClick={() => setAssistantOpen(true)} aria-label="Open design assistant">✳</button>
            </div>
            <div className="preview-footer">
              <div><span className="small-label">CURRENT DESIGN</span><strong>{product.name}</strong></div>
              <button className="text-button" onClick={shareConfiguration}>↗ &nbsp;Share design</button>
            </div>
            <div className="preview-note"><span>ⓘ</span> Preview is an illustrative SVG study; final construction is confirmed by an artisan.</div>
          </section>

          <section className="configuration-column" aria-label="Product configuration">
            <div className="step-heading">
              <div className="step-number">01</div>
              <div><span className="small-label">LET’S BEGIN</span><h2>Make it yours</h2></div>
              <button className="assistant-link" onClick={() => setAssistantOpen(true)}>✳ <span>Ask the studio</span></button>
            </div>

            <div className="product-choices">
              {PRODUCTS.map((item) => (
                <button key={item.id} className={`product-choice ${configuration.productId === item.id ? 'selected' : ''}`} onClick={() => switchProduct(item.id)}>
                  <span className={`product-thumb ${item.id}`} aria-hidden="true"><i /></span>
                  <span><b>{item.name}</b><small>{item.category}</small></span>
                  <span className="choice-check">{configuration.productId === item.id ? '✓' : ''}</span>
                </button>
              ))}
            </div>

            <div className="control-section">
              <div className="section-title"><div><span className="section-index">01</span><h3>Choose your leather</h3></div><button className="text-link" onClick={() => goTo('materials')}>Learn about leather ↗</button></div>
              <div className="leather-picker">
                {LEATHERS.map((item) => (
                  <button key={item.id} className={`leather-option ${configuration.leatherId === item.id ? 'selected' : ''}`} onClick={() => update('leatherId', item.id)}>
                    <span className={`leather-sample sample-${item.id}`} />
                    <span className="leather-option-copy"><b>{item.name}</b><small>{item.grade} · {item.thickness.toFixed(1)} mm</small></span>
                    <span className="radio-dot">{configuration.leatherId === item.id && <i />}</span>
                  </button>
                ))}
              </div>
              <div className="color-row">
                <div><span className="field-label">SHADE</span><span className="color-name">{selectedColor.name}</span></div>
                <div className="swatches" role="radiogroup" aria-label="Leather color">
                  {leather.colors.map((color) => (
                    <button key={color.id} className={`swatch ${configuration.colorId === color.id ? 'selected' : ''}`} style={{ '--swatch': color.hex } as React.CSSProperties} onClick={() => update('colorId', color.id)} aria-label={color.name} aria-pressed={configuration.colorId === color.id} />
                  ))}
                </div>
              </div>
            </div>

            <div className="control-section dimensions-section">
              <div className="section-title"><div><span className="section-index">02</span><h3>Find your fit</h3></div><span className="unit-note">CENTIMETRES</span></div>
              <div className="dimension-fields">
                {([
                  ['widthCm', 'Width', product.dimensions.width],
                  ['heightCm', 'Height', product.dimensions.height],
                  ['depthCm', 'Depth', product.dimensions.depth],
                ] as const).map(([key, label, range]) => (
                  <label className="dimension-field" key={key}>
                    <span>{label}</span>
                    <div><input type="number" min={range[0]} max={range[1]} value={fieldValue(key)} onChange={(event) => update(key, Number(event.target.value))} /><span>cm</span></div>
                    <small>{range[0]}–{range[1]} cm</small>
                  </label>
                ))}
              </div>
              <p className="helper-text">The range shown is a sample workshop limit and should be confirmed for your order.</p>
            </div>

            <div className="control-section">
              <div className="section-title"><div><span className="section-index">03</span><h3>The finishing touches</h3></div></div>
              <label className="select-row"><span><b>Hardware finish</b><small>Solid, considered details</small></span>
                <select value={configuration.hardware} onChange={(event) => update('hardware', event.target.value as Configuration['hardware'])}>
                  <option value="brass">Antique brass</option><option value="silver">Brushed silver</option><option value="black">Matte black</option>
                </select>
              </label>
              <label className="select-row"><span><b>Monogram</b><small>Up to 3 characters · {configuration.monogramMethod}</small></span>
                <div className="monogram-controls"><input className="monogram-input" maxLength={8} value={configuration.monogram} onChange={(event) => update('monogram', event.target.value.toUpperCase())} placeholder="ADD INITIALS" aria-label="Monogram text" /><select aria-label="Monogram method" value={configuration.monogramMethod} onChange={(event) => update('monogramMethod', event.target.value as Configuration['monogramMethod'])}><option value="embossed">Embossed</option><option value="engraved">Engraved</option></select></div>
              </label>
              {product.supportsStrap && <label className="toggle-row"><span><b>Removable shoulder strap</b><small>Adjustable, detachable carry</small></span><input type="checkbox" checked={configuration.removableStrap} onChange={(event) => update('removableStrap', event.target.checked)} /></label>}
              {product.supportsPadding && <label className="toggle-row"><span><b>Padded lining</b><small>A soft layer of everyday protection</small></span><input type="checkbox" checked={configuration.paddedLining} onChange={(event) => update('paddedLining', event.target.checked)} /></label>}
              <label className="select-row pocket-row"><span><b>Interior pockets</b><small>Useful little places for the small things</small></span><select value={configuration.pocketCount} onChange={(event) => update('pocketCount', Number(event.target.value))}><option value={0}>None</option><option value={1}>1 pocket</option><option value={2}>2 pockets</option><option value={3}>3 pockets</option><option value={4}>4 pockets</option><option value={5}>5 pockets</option></select></label>
              <label className="custom-request-field"><span className="field-label">A NOTE FOR THE ARTISAN <span>OPTIONAL</span></span><textarea rows={2} maxLength={240} value={configuration.customRequest} onChange={(event) => update('customRequest', event.target.value)} placeholder="A detail you’d like us to consider..." /></label>
            </div>
          </section>

          <aside className="summary-column" aria-label="Design summary">
            <div className="summary-card">
              <span className="small-label">YOUR ATELIER EDIT</span>
              <h2>A piece of<br /><em>your own.</em></h2>
              <p className="summary-intro">Made thoughtfully, one at a time. Your choices come together in a considered piece, built around you.</p>
              <div className="summary-rule" />
              <ul className="summary-list">
                <li><span>Silhouette</span><b>{product.name}</b></li>
                <li><span>Leather</span><b>{leather.name}</b></li>
                <li><span>Shade</span><b><i className="mini-swatch" style={{ background: selectedColor.hex }} />{selectedColor.name}</b></li>
                <li><span>Hardware</span><b>{configuration.hardware === 'brass' ? 'Antique brass' : configuration.hardware === 'silver' ? 'Brushed silver' : 'Matte black'}</b></li>
                <li><span>Size</span><b>{configuration.widthCm} × {configuration.heightCm} × {configuration.depthCm} cm</b></li>
                {configuration.monogram && <li><span>Personalization</span><b>{configuration.monogramMethod} · {configuration.monogram}</b></li>}
              </ul>
              <div className={`validation-status ${errors.length ? 'invalid' : 'valid'}`}>
                <span>{errors.length ? '!' : '✓'}</span>
                <div><b>{errors.length ? 'Needs a little adjustment' : warnings.length ? 'Ready for artisan review' : 'Within sample design rules'}</b><small>{errors.length ? `${errors.length} item${errors.length === 1 ? '' : 's'} to review` : warnings.length ? 'Custom notes need a human review' : 'Illustrative validation only'}</small></div>
              </div>
              {errors.length > 0 && (
                <div className="issue-list" role="alert">
                  {errors.map((issue) => <p key={issue.code}>{issue.message}</p>)}
                  {recommendations.map((item, index) => (
                    <button className="recommendation" key={`${item.title}-${index}`} onClick={() => setConfiguration(item.configuration)}>
                      <span>TRY THIS INSTEAD</span><b>{item.title}</b><small>{item.changes.join(' · ')}</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="estimate-block">
                <div><span className="small-label">SUPPLIER-BASED PRICE</span><strong>{errors.length ? '—' : 'Quote required'}</strong></div>
                <span className="estimate-info" title={price.reason}>ⓘ</span>
              </div>
              <details className="budget-tool">
                <summary><span>♧</span> Design within my budget</summary>
                <div className="budget-content">
                  <label>Target budget (INR)<input type="number" min="1" step="1" value={targetBudget} onChange={(event) => setTargetBudget(event.target.value)} placeholder="Enter your budget" /></label>
                  <label>What matters most?<select value={budgetPriority} onChange={(event) => setBudgetPriority(event.target.value)}><option value="lowest">Lowest achievable price</option><option value="best-balance">Best balance of price and durability</option><option value="premium">Premium materials within budget</option><option value="preserve">Preserve my current design</option></select></label>
                  <div className="budget-result" role="status">
                    <b>{targetBudget && Number(targetBudget) > 0 ? 'Budget fit cannot be assessed yet.' : 'Start with a budget that feels right.'}</b>
                    <p>No verified procurement cost is mapped to {leather.name}, and the workshop’s full costing model is unavailable. I can’t responsibly rank alternatives, confirm affordability, or claim a saving.</p>
                    <small>Priority selected: {budgetPriority === 'best-balance' ? 'Best balance of price and durability' : budgetPriority === 'lowest' ? 'Lowest achievable price' : budgetPriority === 'premium' ? 'Premium materials within budget' : 'Preserve my current design'}.</small>
                    <button type="button" onClick={() => setMarketOpen(true)}>Review supplier observations →</button>
                  </div>
                </div>
              </details>
              <p className="estimate-disclaimer">{errors.length ? <>Resolve invalid sample-rule conflicts first.<br />No price for this combination.</> : <>No current verified supplier price is mapped to this material.<br />Market averages are not procurement costs.</>}</p>
              <button className="market-link-button" onClick={() => setMarketOpen(true)}>View observed supplier prices <span>↗</span></button>
              <button className="primary-button" disabled={errors.length > 0} onClick={() => { setShowQuoteForm(true); setQuotePrepared(false) }}>Request an artisan quote <span>↗</span></button>
              <button className="secondary-button" onClick={() => window.print()}>Print design brief <span>⌁</span></button>
              <button className="save-button" onClick={saveCurrentDesign}>♡ &nbsp;Save this design</button>
              <button className="save-button" onClick={shareConfiguration}>↗ &nbsp;Share this version</button>
              <details className="specification-card">
                <summary>Review your design specification <span>⌄</span></summary>
                <div>
                  <small>{designIdentity.id ? `${designIdentity.id} · ${displayedVersion ? `VERSION ${displayedVersion}` : 'UNSAVED DRAFT'}` : 'UNSAVED DESIGN · SAVE TO ASSIGN AN ID'}</small>
                  <ul>{configurationSummary(configuration).map((item) => <li key={item}>{item}</li>)}</ul>
                  <p>Price: unavailable — no verified mapped procurement cost. Lead time: to be confirmed by the workshop. Sample rule validation is not workshop approval.</p>
                  {configuration.customRequest && <p>Customer instruction: {configuration.customRequest}</p>}
                </div>
              </details>
              <div className="leadtime-note"><span>◷</span><span><b>Made with intention</b><small>Timing confirmed by an artisan after review.</small></span></div>
            </div>
            <div className="trust-note"><span>✳</span><p><b>Every detail has a reason.</b><br />Thoughtful materials. Skilled hands. Made to last.</p></div>
          </aside>
        </div>

        <section className="materials-section" id="materials">
          <div className="section-kicker">A CLOSER LOOK AT MATERIALS <span>02 — 03</span></div>
          <div className="materials-heading"><h2>Good things<br /><em>get better with age.</em></h2><p>Leather is a living material. The right hide has its own character, its own story, and a way of becoming more yours with every use.</p></div>
          <div className="material-cards">
            {LEATHERS.map((item, index) => (
              <article className={`material-card ${configuration.leatherId === item.id ? 'chosen' : ''}`} key={item.id}>
                <div className={`material-image texture-${index}`}><span>{item.grade.toUpperCase()}</span><button onClick={() => { update('leatherId', item.id); goTo('design') }} aria-label={`Choose ${item.name}`}>↗</button></div>
                <div className="material-card-body"><div><h3>{item.name}</h3><span>{item.finish}</span></div><p>{item.description}</p><div className="material-meta"><span>{item.temper}</span><span>{item.thickness.toFixed(1)} mm</span></div></div>
              </article>
            ))}
          </div>
          <p className="sample-data-note">Material details and costs are demonstration data; confirm grades, finishes, availability and prices with the supplier.</p>
        </section>

        <section className="craft-section" id="details">
          <div className="craft-copy"><span className="section-kicker">A NOTE FROM THE WORKSHOP</span><h2>Made slowly.<br /><em>Made to stay.</em></h2><p>Every piece begins with a material and a little imagination. We bring them together with care, then let the details do the talking.</p><button className="text-button" onClick={() => setShowQuoteForm(true)}>Talk to an artisan ↗</button></div>
          <div className="craft-steps"><div><span>01</span><b>Choose with care</b><p>Find a shape, a hide and a palette that feel like you.</p></div><div><span>02</span><b>Made by hand</b><p>Your brief goes to a maker for a thoughtful review.</p></div><div><span>03</span><b>Made to keep</b><p>A personal piece, finished for the long way round.</p></div></div>
        </section>
        </>
        )}
      </main>

      <footer className="site-footer"><a className="brand" href="#"><span className="brand-mark">A<span>07</span></span><span className="brand-name">ATELIER <b>N°07</b></span></a><span>OBJECTS WITH A LITTLE MORE MEANING.</span><span>DEMO STUDIO · 2026</span></footer>

      <div className="print-sheet" aria-hidden="true">
        <h1>Atelier N°07 — Design brief</h1><p>DEMONSTRATION ONLY · NOT A PRODUCTION SPECIFICATION</p>
        <p>Design ID: {designIdentity.id ?? 'Not yet saved'} · Version: {displayedVersion || 'Draft'}</p>
        <h2>{product.name}</h2><ul>{configurationSummary(configuration).map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Material &amp; finish</h3><p>{leather.name} · {leather.grade} · {leather.finish} · {leather.thickness.toFixed(1)} mm · {selectedColor.name}</p>
        <p>Hardware: {configuration.hardware}. Monogram: {configuration.monogram || 'none'} {configuration.monogram && `(${configuration.monogramMethod})`}.</p>
        <p>Supplier source/procurement reference: not mapped. Price: unavailable. Lead time: to be confirmed by the workshop.</p>
        <h3>Review status</h3><p>{errors.length ? `NOT VALIDATED — ${errors.map((item) => item.message).join(' ')}` : warnings.length ? 'Requires artisan review.' : 'Passed sample rules only; confirm with the workshop before production.'}</p>
        <h3>Price status</h3><p>{price.reason}</p>
        {configuration.customRequest && <><h3>Customer note for artisan</h3><p>{configuration.customRequest}</p></>}
        <p>All catalog constraints and prices in this demo are illustrative, not verified manufacturing data or a customer quote.</p>
      </div>

      {assistantOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAssistantOpen(false) }}>
          <section className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
            <div className="assistant-head"><div><span className="assistant-spark">✳</span><div><span className="small-label">ATELIER N°07</span><h2 id="assistant-title">Design, together.</h2></div></div><button className="close-button" onClick={() => setAssistantOpen(false)} aria-label="Close assistant">×</button></div>
            <p className="assistant-disclaimer">A simple on-device demo assistant. It maps known words to the sample catalog; no AI service is connected.</p>
            <div className="chat-messages" aria-live="polite">
              {messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'ATELIER' : 'YOU'}</span><p>{message.text}</p></div>)}
            </div>
            {proposal && (
              <div className="proposal-card">
                <span className="small-label">A PROPOSAL FOR YOU</span>
                <ul>{configurationSummary(proposal.configuration).map((item) => <li key={item}>{item}</li>)}</ul>
                {proposal.questions.map((question) => <p className="proposal-question" key={question}>? {question}</p>)}
                <button className="primary-button" onClick={applyProposal}>Review &amp; apply <span>→</span></button>
              </div>
            )}
            <form className="chat-form" onSubmit={handleAssistantSubmit}><label htmlFor="assistant-input" className="sr-only">Describe your design</label><input id="assistant-input" value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder="Describe the piece you’re imagining..." /><button type="submit" aria-label="Send message">↑</button></form>
            <div className="reference-box">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleReference(event.target.files?.[0])} />
              <button className="upload-button" onClick={() => fileRef.current?.click()}>＋ <span>{referenceName ? 'Change reference image' : 'Add a reference image'}</span></button>
              {referenceError && <p className="upload-error">{referenceError}</p>}
              {referenceImage && <div className="reference-preview"><img src={referenceImage} alt="Customer-provided design reference" /><span>{referenceName} · session only</span><button onClick={() => { setReferenceImage(''); setReferenceName('') }}>Remove</button></div>}
              <p>JPEG, PNG or WebP · max 5 MB. Image interpretation and cloud storage are not configured; your image stays in this browser session.</p>
            </div>
          </section>
        </div>
      )}

      {showQuoteForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowQuoteForm(false) }}>
          <section className="quote-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <button className="close-button" onClick={() => setShowQuoteForm(false)} aria-label="Close quote form">×</button>
            {quotePrepared ? <><span className="quote-icon">✓</span><h2 id="quote-title">Your brief is ready.</h2><p>This demo cannot transmit quote requests. Your design summary is ready to print or share for an artisan conversation.</p><button className="primary-button" onClick={() => { setShowQuoteForm(false); window.print() }}>Print your brief <span>↗</span></button></> : <>
              <span className="small-label">THE NEXT STEP</span><h2 id="quote-title">Let’s talk it through.</h2><p>A maker can review your choices, confirm what’s possible, and provide an accurate quote.</p>
              {errors.length > 0 && <p className="quote-warning">There are still items to resolve in the sample validation. You can prepare a brief, but it is not production-ready.</p>}
              <form onSubmit={submitQuoteRequest}><label>Your name<input required name="name" autoComplete="name" placeholder="Name" /></label><label>Email address<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label><label>A note for the maker<textarea name="note" rows={3} placeholder="Anything else we should know?" /></label><p className="privacy-note">This demo does not send or store this information. Connecting a secure quote service is required for submission.</p><button className="primary-button" type="submit">Prepare my brief <span>→</span></button></form>
            </>}
          </section>
        </div>
      )}

      {savedDesignState.error && <div className="toast" role="alert"><span>!</span>{savedDesignState.error}<button onClick={() => setSavedDesignState((previous) => ({ ...previous, error: '' }))} aria-label="Dismiss saved design error">×</button></div>}

      {savedDesignsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSavedDesignsOpen(false) }}>
          <section className="saved-designs-dialog" role="dialog" aria-modal="true" aria-labelledby="saved-designs-title">
            <div className="saved-dialog-head"><div><span className="small-label">BROWSER-LOCAL HISTORY</span><h2 id="saved-designs-title">Saved designs.</h2></div><button className="close-button" onClick={() => setSavedDesignsOpen(false)} aria-label="Close saved designs">×</button></div>
            <p>Saved snapshots stay in this browser only. They are not backed up or available to the workshop. Share a selected version to create a portable link without monogram text or customer notes.</p>
            {savedDesigns.length === 0 ? <div className="saved-empty">No saved designs yet. Save the current configuration to start a version history.</div> : <div className="saved-list">{savedDesigns.map((saved) => <article key={`${saved.id}-${saved.version}`}>
              <div><b>{productById(saved.configuration.productId).name} · v{saved.version}</b><small>{saved.id} · {new Date(saved.savedAt).toLocaleString()}</small><span>{configurationSummary(saved.configuration).slice(1, 4).join(' · ')}</span></div>
              <button onClick={() => restoreDesignVersion(saved)}>Open version</button>
            </article>)}</div>}
            <button className="primary-button" onClick={() => { setSavedDesignsOpen(false); saveCurrentDesign() }}>Save current version <span>♡</span></button>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><span>✳</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  )
}

export default App
