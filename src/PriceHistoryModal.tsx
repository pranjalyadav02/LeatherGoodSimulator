import { useEffect, useState, useMemo } from 'react'
import './PriceHistoryModal.css'
import { fetchPriceHistory, type PriceHistoryRecord } from './api'
import { LEATHERS } from './catalog'

interface PriceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  activeLeatherId?: string
  activeLeatherName?: string
  currentRate?: number
}

export function PriceHistoryModal({
  isOpen,
  onClose,
  activeLeatherId,
  activeLeatherName,
  currentRate,
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistoryRecord[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>(activeLeatherId || 'all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeLeatherId) {
      setSelectedFilter(activeLeatherId)
    }
  }, [activeLeatherId])

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setLoading(true)
    fetchPriceHistory().then((data) => {
      if (isMounted) {
        setHistory(data)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const filteredHistory = useMemo(() => {
    if (selectedFilter === 'all') return history
    return history.filter((item) => item.itemId === selectedFilter)
  }, [history, selectedFilter])

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return {
        current: currentRate ?? 260,
        average: currentRate ?? 260,
        revisions: 0,
      }
    }
    const current = filteredHistory[0]?.newPrice ?? currentRate ?? 260
    const sum = filteredHistory.reduce((acc, h) => acc + h.newPrice, 0)
    const avg = Math.round(sum / filteredHistory.length)
    return {
      current,
      average: avg,
      revisions: filteredHistory.length,
    }
  }, [filteredHistory, currentRate])

  if (!isOpen) return null

  return (
    <div
      className="price-history-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="price-history-modal" role="dialog" aria-modal="true" aria-labelledby="price-modal-title">
        {/* Header */}
        <div className="price-history-header">
          <div>
            <span className="price-history-kicker">
              <span className="realtime-pulse-dot" /> LIVE SUPABASE REALTIME SYNCHRONIZED
            </span>
            <h2 id="price-modal-title">
              Real-Time Hide Rate &amp; <em>Historical Pricing Audit</em>
            </h2>
            <p>
              Verified tannery procurement rates and historical price revisions for{' '}
              {activeLeatherName ? <strong>{activeLeatherName}</strong> : 'Carry bespoke hides'}.
            </p>
          </div>
          <button
            type="button"
            className="library-close-btn"
            onClick={onClose}
            aria-label="Close Price History"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="price-history-body">
          {/* Key Stat Cards */}
          <div className="rate-stats-row">
            <div className="rate-stat-card">
              <small>Live Active Rate</small>
              <div className="rate-val live">₹{stats.current}/sq.ft</div>
            </div>
            <div className="rate-stat-card">
              <small>Historical Average</small>
              <div className="rate-val">₹{stats.average}/sq.ft</div>
            </div>
            <div className="rate-stat-card">
              <small>Total Price Revisions</small>
              <div className="rate-val">{stats.revisions} logged</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="history-filter-bar">
            <label htmlFor="material-select">Filter by Leather / Hide:</label>
            <select
              id="material-select"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Hides &amp; Materials</option>
              {LEATHERS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeline List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8275' }}>
              Fetching real-time price history from Supabase...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8c8275' }}>
              No historical revisions recorded for this hide yet. Initial procurement benchmark active.
            </div>
          ) : (
            <div className="history-timeline">
              {filteredHistory.map((record) => {
                const isIncrease = record.newPrice > record.oldPrice
                return (
                  <div key={record.id} className="history-timeline-item">
                    <div className="history-item-left">
                      <div className="history-item-top">
                        <span className="history-item-title">{record.itemName}</span>
                        <span className={`history-change-tag ${isIncrease ? 'up' : 'down'}`}>
                          {isIncrease ? '▲ +' : '▼ '}
                          {record.changePercentage}%
                        </span>
                      </div>
                      <p className="history-item-reason">
                        &ldquo;{record.reason || 'Artisan hide rate adjustment'}&rdquo;
                      </p>
                      <div className="history-item-meta">
                        <span>👤 {record.changedBy}</span>
                        <span>📅 {new Date(record.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                    </div>

                    <div className="history-item-right">
                      <div className="price-shift-display">
                        <span className="price-old">₹{record.oldPrice}</span>
                        <span className="price-new">₹{record.newPrice}</span>
                        <small style={{ color: '#8c8275', fontSize: '11px' }}>/sq.ft</small>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ethical Pricing Statement */}
          <div className="transparency-guarantee">
            <b>Carry Atelier Pricing Philosophy:</b> Every rupee in our 3D customizer represents direct,
            uncompromised materials and bench labor. When raw hide procurement rates shift due to seasonal
            vegetable-tanning yields, our database recalculates quotes in real time with complete customer transparency.
          </div>
        </div>
      </div>
    </div>
  )
}
