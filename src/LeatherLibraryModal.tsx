import { useState } from 'react'
import './LeatherLibraryModal.css'
import { LEATHERS } from './catalog'

interface LeatherLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  currentLeatherId?: string
  onSelectLeather?: (leatherId: string) => void
}

type LibraryTab = 'hides' | 'anatomy' | 'tanning' | 'care'

interface LeatherTrait {
  patina: number // 1-5
  scratchResilience: number // 1-5
  waterResistance: number // 1-5
  bestFor: string
  origin: string
  careNote: string
}

const LEATHER_TRAITS: Record<string, LeatherTrait> = {
  'heritage-calf': {
    patina: 5,
    scratchResilience: 3,
    waterResistance: 3,
    bestFor: 'Everyday Totes, Weekender Bags, Passport Sleeves',
    origin: 'South German & Alpine Veg-Tan Hides',
    careNote: 'Condition every 3-4 months with natural beeswax or neatsfoot balm.',
  },
  'pebble-grain': {
    patina: 3,
    scratchResilience: 5,
    waterResistance: 4,
    bestFor: 'Architectural Handbags, Commuter Totes, Travel Kits',
    origin: 'French Drum-Dyed Milled Calf',
    careNote: 'Conceals scratches naturally; wipe with damp microfiber cloth.',
  },
  'saddle-hide': {
    patina: 5,
    scratchResilience: 4,
    waterResistance: 3,
    bestFor: 'Structured Gussets, Heavy-Duty Belts, Sunglass Cases',
    origin: 'Heavy English Steerhide Shoulders',
    careNote: 'Hot-stuffed with tallow; light friction buffs out daily abrasions.',
  },
  'saffiano': {
    patina: 2,
    scratchResilience: 5,
    waterResistance: 5,
    bestFor: 'Essential Cardholders, Bifold Wallets, Tech Sleeves',
    origin: 'European Wax-Embossed Calfskin',
    careNote: 'Impervious to rain and keys; clean with mild soapy sponge.',
  },
  'nappa': {
    patina: 4,
    scratchResilience: 2,
    waterResistance: 2,
    bestFor: 'Premium Pocket Linings, Soft Slings, Toiletry Kits',
    origin: 'Italian Drum-Tumbled Glove Calf',
    careNote: 'Delicate luxury feel; store away from prolonged direct humidity.',
  },
}

function StarRating({ count }: { count: number }) {
  return (
    <span className="trait-stars">
      {'★'.repeat(count)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - count)}</span>
    </span>
  )
}

export function LeatherLibraryModal({
  isOpen,
  onClose,
  currentLeatherId,
  onSelectLeather,
}: LeatherLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('hides')

  if (!isOpen) return null

  return (
    <div
      className="leather-library-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="leather-library-modal" role="dialog" aria-modal="true" aria-labelledby="lib-modal-title">
        {/* Header */}
        <div className="leather-library-header">
          <div>
            <span className="leather-library-kicker">ATELIER CRAFTSMANSHIP &amp; EDUCATION</span>
            <h2 id="lib-modal-title">
              The Bespoke Leather &amp; Grain <em>Encyclopedia</em>
            </h2>
            <p>
              An artisan guide to hide anatomy, ancient vegetable-tanning chemistry, surface grain finishes,
              and lifelong patina evolution.
            </p>
          </div>
          <button
            type="button"
            className="library-close-btn"
            onClick={onClose}
            aria-label="Close Leather Library"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="library-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hides'}
            className={`library-tab-btn ${activeTab === 'hides' ? 'active' : ''}`}
            onClick={() => setActiveTab('hides')}
          >
            <span>🐂 The 5 Atelier Hides</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'anatomy'}
            className={`library-tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
            onClick={() => setActiveTab('anatomy')}
          >
            <span>🔬 Hide Anatomy &amp; Grades</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tanning'}
            className={`library-tab-btn ${activeTab === 'tanning' ? 'active' : ''}`}
            onClick={() => setActiveTab('tanning')}
          >
            <span>🧪 Veg-Tan vs Chrome-Tan</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'care'}
            className={`library-tab-btn ${activeTab === 'care' ? 'active' : ''}`}
            onClick={() => setActiveTab('care')}
          >
            <span>✨ Care &amp; Patina Evolution</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="library-content-body">
          {activeTab === 'hides' && (
            <div className="leather-cards-grid">
              {LEATHERS.map((leather) => {
                const traits = LEATHER_TRAITS[leather.id] || {
                  patina: 4,
                  scratchResilience: 4,
                  waterResistance: 3,
                  bestFor: 'Bespoke leather goods',
                  origin: 'Artisan Tannery',
                  careNote: 'Condition regularly.',
                }
                const isSelected = currentLeatherId === leather.id

                return (
                  <article
                    key={leather.id}
                    className={`leather-detail-card ${isSelected ? 'active-selection' : ''}`}
                  >
                    <div className={`card-texture-banner texture-banner-${leather.id}`}>
                      <span className="banner-grade-tag">{leather.grade.toUpperCase()}</span>
                      {onSelectLeather && (
                        <button
                          type="button"
                          className="banner-action-tag"
                          onClick={() => {
                            onSelectLeather(leather.id)
                            onClose()
                          }}
                        >
                          {isSelected ? '✓ Selected' : 'Select in 3D ↗'}
                        </button>
                      )}
                    </div>

                    <div className="card-content">
                      <div className="card-title-row">
                        <h3>{leather.name}</h3>
                        <span className="card-subtitle">{leather.finish}</span>
                      </div>

                      <p className="card-description">{leather.description}</p>

                      <div className="trait-meters">
                        <div className="trait-row">
                          <span className="trait-label">Patina Potential:</span>
                          <StarRating count={traits.patina} />
                        </div>
                        <div className="trait-row">
                          <span className="trait-label">Scratch Resilience:</span>
                          <StarRating count={traits.scratchResilience} />
                        </div>
                        <div className="trait-row">
                          <span className="trait-label">Water Resistance:</span>
                          <StarRating count={traits.waterResistance} />
                        </div>
                      </div>

                      <div className="card-spec-tags">
                        <span>📐 {leather.thickness.toFixed(1)} mm</span>
                        <span>🏷️ ₹{leather.ratePerSqFt}/sq.ft</span>
                        <span>✨ {leather.temper.split(',')[0]}</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {activeTab === 'anatomy' && (
            <div className="guide-section">
              <div className="guide-block">
                <h3><span>🔬</span> Understanding Natural Hide Cross-Sections</h3>
                <p>
                  A genuine animal hide is composed of distinct biological layers. The depth at which
                  the hide is split determines its strength, tensile elasticity, pore breathability,
                  and how it responds to age.
                </p>

                <div className="comparison-grid">
                  <div className="comparison-box">
                    <h4>Full-Grain Leather <span>Highest Grade ★★★★★</span></h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      The uppermost layer of the epidermis with completely intact natural grain, hair follicles,
                      and growth wrinkles.
                    </p>
                    <ul>
                      <li>Unbuffed, unsanded natural surface</li>
                      <li>Highest tensile fiber density and durability</li>
                      <li>Develops rich, multidimensional patina over decades</li>
                      <li>Used in Carry Heritage Calf, Saddle Hide &amp; Nappa</li>
                    </ul>
                  </div>

                  <div className="comparison-box">
                    <h4>Top-Grain Leather <span>High Grade ★★★★☆</span></h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      The outer hide layer with micro-blemishes lightly buffed and stamped with an authentic grain
                      pattern or protective coating.
                    </p>
                    <ul>
                      <li>Exceptional scratch and stain resistance</li>
                      <li>Uniform coloration and tactile consistency</li>
                      <li>Lighter weight with excellent structural temper</li>
                      <li>Used in Carry Pebble Grain &amp; Saffiano Cross-Grain</li>
                    </ul>
                  </div>

                  <div className="comparison-box">
                    <h4>Split &amp; Bonded Leather <span>Commercial Grade ★★☆☆☆</span></h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      The fibrous lower corium layer left after splitting away the grain, often coated with polyurethane.
                    </p>
                    <ul>
                      <li>Lacks natural grain fiber strength</li>
                      <li>Does not patina; prone to cracking and peeling</li>
                      <li><strong>Never utilized in Carry bespoke atelier goods</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tanning' && (
            <div className="guide-section">
              <div className="guide-block">
                <h3><span>🧪</span> The Alchemy of Tanning: Natural Tree-Bark vs Chrome</h3>
                <p>
                  Raw animal hide must be stabilized through tanning to prevent decomposition while preserving
                  suppleness. Carry partners exclusively with certified ethical tanneries practicing audited
                  environmental stewardship.
                </p>

                <div className="comparison-grid">
                  <div className="comparison-box">
                    <h4>Vegetable Tanning (Veg-Tan)</h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      An ancient artisanal process taking 30 to 60 days using organic plant tannins extracted
                      from Chestnut, Mimosa, and Quebracho bark.
                    </p>
                    <ul>
                      <li>Distinctive warm, earthy leather fragrance</li>
                      <li>Firm structural body that moulds to the owner&apos;s habits</li>
                      <li>Develops glorious caramel and golden patina with age</li>
                      <li>100% biodegradable and chrome-free</li>
                    </ul>
                  </div>

                  <div className="comparison-box">
                    <h4>Chrome Tanning &amp; Embossing</h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Modern mineral tanning utilizing chromium salts, followed by mechanical pressure embossing
                      for weather resistance.
                    </p>
                    <ul>
                      <li>Supple, buttery drape from day one</li>
                      <li>Superior moisture and raindrop repellency</li>
                      <li>High colorfastness that resists sun fading</li>
                      <li>Ideal for all-weather commuter bags and wallets</li>
                    </ul>
                  </div>

                  <div className="comparison-box">
                    <h4>Semi-Aniline Hybrid Finish</h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Full-grain drum dye paired with a micro-thin protective pigment coat.
                    </p>
                    <ul>
                      <li>Combines the living feel of veg-tan with spill resistance</li>
                      <li>Visible natural grain variations and character</li>
                      <li>Signature finish of Carry Heritage Calf</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'care' && (
            <div className="guide-section">
              <div className="guide-block">
                <h3><span>✨</span> Masterclass: Preserving Bespoke Leather for Generations</h3>
                <p>
                  Natural leather breathes and absorbs elements from your daily routine. With mindful care, your
                  Carry bespoke piece will become a timeless personal heirloom.
                </p>

                <div className="care-steps-grid">
                  <div className="care-step-item">
                    <div className="care-step-num">01</div>
                    <h4>Routine Dusting</h4>
                    <p>
                      Brush gently with a natural horsehair brush once a week to remove micro-grit from seam crevices.
                    </p>
                  </div>

                  <div className="care-step-item">
                    <div className="care-step-num">02</div>
                    <h4>Conditioning</h4>
                    <p>
                      Apply a dime-sized amount of organic beeswax or jojoba balm with a cotton cloth every 3 to 6 months.
                    </p>
                  </div>

                  <div className="care-step-item">
                    <div className="care-step-num">03</div>
                    <h4>Moisture Protocol</h4>
                    <p>
                      If exposed to rain, blot immediately with unbleached cotton. Never dry near radiators or hairdryers.
                    </p>
                  </div>

                  <div className="care-step-item">
                    <div className="care-step-num">04</div>
                    <h4>Patina Growth</h4>
                    <p>
                      Friction, hand oils, and sunlight will naturally deepen your hide&apos;s hue into a luminous amber gloss.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
