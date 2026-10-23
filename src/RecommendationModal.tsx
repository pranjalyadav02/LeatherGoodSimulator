import { useState, useEffect } from 'react'
import type { Configuration, ProductId } from './types'
import { evaluateColorHarmony, getSmartRecommendations } from './recommendationEngine'
import type { RecommendationProposal } from './api'

interface RecommendationModalProps {
  isOpen: boolean
  onClose: () => void
  currentConfig: Configuration
  onApplyRecommendation: (config: Partial<Configuration>) => void
  targetBudget?: number
}

export function RecommendationModal({
  isOpen,
  onClose,
  currentConfig,
  onApplyRecommendation,
  targetBudget = 4500,
}: RecommendationModalProps) {
  const [selectedUseCase, setSelectedUseCase] = useState<
    'daily_office' | 'travel_commute' | 'formal_luxury' | 'minimalist_edc' | 'weather_rugged'
  >('daily_office')
  const [budget, setBudget] = useState<number>(targetBudget)
  const [proposals, setProposals] = useState<RecommendationProposal[]>([])
  const [loading, setLoading] = useState(false)

  const currentHarmony = evaluateColorHarmony(currentConfig)

  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false

    void Promise.resolve()
      .then(() => {
        if (isCancelled) return
        setLoading(true)
        return getSmartRecommendations(
          currentConfig.productId as ProductId,
          selectedUseCase,
          budget,
          currentConfig,
        )
      })
      .then((results) => {
        if (!isCancelled && results) {
          setProposals(results)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, selectedUseCase, budget, currentConfig])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="assistant-panel"
        style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="assistant-header">
          <div>
            <h3>✦ Smart Style &amp; Harmony Recommender</h3>
            <p>Atelier AI &amp; Color Theory Engine · Personalized for your lifestyle</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Current Palette Harmony Card */}
          <div
            style={{
              background: 'var(--cream)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em' }}>
                  CURRENT SELECTION COLOR HARMONY:
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                  {currentHarmony.paletteType} · {currentHarmony.verdict}
                </div>
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-serif)',
                  color: currentHarmony.score >= 90 ? 'var(--green)' : 'var(--amber)',
                }}
              >
                {currentHarmony.score}%
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {currentHarmony.advice}
            </p>
          </div>

          {/* Use Case Selector */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
              WHAT IS YOUR PRIMARY USE-CASE?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { id: 'daily_office', label: 'Daily Office', icon: '💼' },
                { id: 'travel_commute', label: 'Travel & Trips', icon: '✈️' },
                { id: 'formal_luxury', label: 'Formal / Evening', icon: '✨' },
                { id: 'weather_rugged', label: 'All-Weather Tough', icon: '🌧️' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid',
                    borderColor: selectedUseCase === item.id ? 'var(--brown)' : 'var(--line)',
                    background: selectedUseCase === item.id ? 'var(--cream)' : 'var(--paper)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--ink)',
                  }}
                  onClick={() => setSelectedUseCase(item.id as typeof selectedUseCase)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Budget Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)' }}>TARGET BUDGET:</span>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>₹{budget.toLocaleString('en-IN')}</div>
            </div>
            <input
              type="range"
              min={1500}
              max={8000}
              step={250}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>

          {/* Tailored Proposals List */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '10px' }}>
              RECOMMENDED ARTISAN CONFIGURATIONS:
            </div>

            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                Evaluating leather grains and color harmony...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proposals.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: '10px',
                      padding: '14px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{p.title}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                          {p.subtitle}
                        </small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ font: '700 15px var(--font-serif)', color: 'var(--ink)' }}>
                          ~₹{p.targetPrice.toLocaleString('en-IN')}
                        </span>
                        <small style={{ display: 'block', color: 'var(--green)', fontSize: '10px', fontWeight: 700 }}>
                          {p.harmonyScore}% Harmony
                        </small>
                      </div>
                    </div>

                    <ul style={{ margin: '8px 0', paddingLeft: '18px', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                      {p.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line-light)' }}>
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>{p.suitability}</small>
                      <button
                        type="button"
                        style={{
                          background: 'var(--ink)',
                          color: '#fff',
                          border: 0,
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          onApplyRecommendation(p.config)
                          onClose()
                        }}
                      >
                        Apply This Look →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
