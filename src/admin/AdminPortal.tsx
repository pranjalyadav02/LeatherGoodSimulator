import { useState, useEffect } from 'react'
import './AdminPortal.css'
import {
  fetchQuotes,
  fetchInventory,
  updateQuoteStatus,
  updateInventory,
  fetchHealth,
  type QuoteRecord,
  type InventoryItem,
} from '../api'

interface AdminPortalProps {
  onBackToStudio: () => void
}

type AdminTab = 'orders' | 'inventory' | 'hardware' | 'analytics'

export function AdminPortal({ onBackToStudio }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [serverHealth, setServerHealth] = useState<{ status: string; uptimeSeconds: number } | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  // Quick inventory update state
  const [stockEditItem, setStockEditItem] = useState<InventoryItem | null>(null)
  const [newStockValue, setNewStockValue] = useState<number>(0)
  const [newRateValue, setNewRateValue] = useState<number>(0)

  const loadData = async () => {
    const [qData, iData, hData] = await Promise.all([
      fetchQuotes(),
      fetchInventory(),
      fetchHealth(),
    ])
    setQuotes(qData)
    setInventory(iData)
    setServerHealth(hData)
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData())
    const timer = setInterval(() => {
      void loadData()
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleStatusChange = async (quoteId: string, newStatus: QuoteRecord['status']) => {
    const success = await updateQuoteStatus(quoteId, newStatus)
    if (success) {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q)),
      )
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
      showToast(`Order ${quoteId} updated to: ${newStatus}`)
    } else {
      showToast(`Failed to update status for ${quoteId}`)
    }
  }

  const handleSaveInventory = async () => {
    if (!stockEditItem) return
    const success = await updateInventory(stockEditItem.id, {
      stockSqFt: newStockValue,
      ratePerSqFt: newRateValue,
      status: newStockValue < (stockEditItem.minThresholdSqFt ?? 100) ? 'Low Stock' : 'In Stock',
    })

    if (success) {
      setInventory((prev) =>
        prev.map((item) =>
          item.id === stockEditItem.id
            ? {
                ...item,
                stockSqFt: newStockValue,
                ratePerSqFt: newRateValue,
                status: newStockValue < (item.minThresholdSqFt ?? 100) ? 'Low Stock' : 'In Stock',
              }
            : item,
        ),
      )
      showToast(`Updated stock & rate for ${stockEditItem.name}`)
      setStockEditItem(null)
    }
  }

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.leatherName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Metrics calculation
  const totalPipelineValue = quotes.reduce((acc, q) => acc + (q.totalPrice || 0), 0)
  const lowStockCount = inventory.filter((i) => i.status === 'Low Stock' || i.status === 'Out of Stock').length
  const activeOrdersCount = quotes.filter((q) => q.status !== 'Archived' && q.status !== 'Ready for Dispatch').length

  const leatherHides = inventory.filter((i) => i.category === 'Leather Hides')
  const hardwareAndSupplies = inventory.filter((i) => i.category !== 'Leather Hides')

  return (
    <div className="admin-portal">
      {/* Top Operations Header */}
      <header className="admin-header">
        <div className="admin-brand-block">
          <span className="admin-badge">OPERATIONS HUB</span>
          <div className="admin-title-wrap">
            <h1>Atelier N°07 Operations &amp; Admin Portal</h1>
            <small>Carry Leather Goods · Workshop Bench Management</small>
          </div>
        </div>

        <nav className="admin-nav-tabs">
          <button
            className={`admin-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Orders &amp; Quotes ({quotes.length})
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            🐂 Leather Hide Stock ({leatherHides.length})
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'hardware' ? 'active' : ''}`}
            onClick={() => setActiveTab('hardware')}
          >
            🔩 Hardware &amp; Supplies ({hardwareAndSupplies.length})
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Financials &amp; Analytics
          </button>
        </nav>

        <div className="admin-header-actions">
          <span className="server-status-pill">
            <span className="pulse-dot" />
            {serverHealth ? `API Server Active (Port 3001)` : `Local Offline Mode`}
          </span>

          <button className="exit-admin-btn" onClick={onBackToStudio} title="Return to Customer 3D Studio">
            ← Exit to Bespoke Studio
          </button>
        </div>
      </header>

      {/* KPI Metrics Row */}
      <section className="admin-metrics-row">
        <div className="metric-card">
          <span className="metric-label">TOTAL BESPOKE ORDERS</span>
          <span className="metric-val">{quotes.length}</span>
          <span className="metric-sub">{activeOrdersCount} currently in active production</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">PRODUCTION PIPELINE VALUE</span>
          <span className="metric-val">₹{totalPipelineValue.toLocaleString('en-IN')}</span>
          <span className="metric-sub">Average Order Value: ₹{Math.round(totalPipelineValue / (quotes.length || 1)).toLocaleString('en-IN')}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">RAW MATERIAL INVENTORY</span>
          <span className="metric-val">
            {inventory.reduce((acc, i) => acc + (i.stockSqFt || 0), 0).toLocaleString('en-IN')}{' '}
            <small style={{ fontSize: '14px', fontWeight: 500 }}>sq.ft.</small>
          </span>
          <span className="metric-sub" style={{ color: lowStockCount > 0 ? 'var(--admin-red)' : 'var(--admin-green)' }}>
            {lowStockCount > 0 ? `⚠ ${lowStockCount} items below threshold` : '✓ All materials well-stocked'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-label">ACTIVE BENCH CRAFTSMEN</span>
          <span className="metric-val">6 Artisans</span>
          <span className="metric-sub">Saddler, Edge Burnisher, Pattern Cutter</span>
        </div>
      </section>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '84px',
          right: '32px',
          background: 'var(--admin-gold)',
          color: '#121316',
          padding: '10px 18px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '12px',
          zIndex: 999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      {/* Main Tab Content */}
      <main className="admin-main">
        {/* TAB 1: BESPOKE ORDERS & QUOTES */}
        {activeTab === 'orders' && (
          <div>
            <div className="admin-toolbar">
              <div className="admin-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search order ID, client name, silhouette, or leather..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Production Statuses</option>
                  <option value="New Quote Request">New Quote Request</option>
                  <option value="Bench Approved">Bench Approved</option>
                  <option value="In Cutting Bench">In Cutting Bench</option>
                  <option value="In Stitching">In Stitching</option>
                  <option value="Quality Inspection Passed">Quality Inspection Passed</option>
                  <option value="Ready for Dispatch">Ready for Dispatch</option>
                </select>

                <button className="admin-primary-btn" onClick={loadData}>
                  ↻ Refresh Queue
                </button>
              </div>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Silhouette &amp; Leather</th>
                    <th>Hardware &amp; Monogram</th>
                    <th>Quote (INR)</th>
                    <th>Bench Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-muted)' }}>
                        No orders match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--admin-gold)' }}>
                            {q.id}
                          </strong>
                        </td>
                        <td>
                          <small style={{ color: 'var(--admin-muted)' }}>
                            {new Date(q.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </small>
                        </td>
                        <td>
                          <div><b>{q.customer.name}</b></div>
                          <small style={{ color: 'var(--admin-muted)' }}>{q.customer.email}</small>
                        </td>
                        <td>
                          <div><b>{q.productName}</b></div>
                          <small style={{ color: 'var(--admin-muted)' }}>
                            {q.leatherName} · {q.colorName}
                          </small>
                        </td>
                        <td>
                          <div>Fittings: {q.hardware.toUpperCase()}</div>
                          {q.monogram && (
                            <small style={{ color: 'var(--admin-gold)' }}>
                              Foil: "{q.monogram}" ({q.monogramMethod})
                            </small>
                          )}
                        </td>
                        <td>
                          <b style={{ fontSize: '13px' }}>₹{q.totalPrice.toLocaleString('en-IN')}</b>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              q.status.includes('New')
                                ? 'new'
                                : q.status.includes('Cutting') || q.status.includes('Approved')
                                  ? 'cutting'
                                  : q.status.includes('Stitching')
                                    ? 'stitching'
                                    : 'dispatch'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="table-btn primary"
                            onClick={() => setSelectedQuote(q)}
                            title="Inspect Workshop Specification"
                          >
                            Workshop Spec
                          </button>
                          <select
                            style={{
                              background: 'var(--admin-surface-card)',
                              border: '1px solid var(--admin-border)',
                              color: 'var(--admin-ink)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                            value={q.status}
                            onChange={(e) => handleStatusChange(q.id, e.target.value as QuoteRecord['status'])}
                          >
                            <option value="New Quote Request">New Request</option>
                            <option value="Bench Approved">Approve</option>
                            <option value="In Cutting Bench">Cutting</option>
                            <option value="In Stitching">Stitching</option>
                            <option value="Quality Inspection Passed">QC Passed</option>
                            <option value="Ready for Dispatch">Ready</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RAW LEATHER HIDE INVENTORY */}
        {activeTab === 'inventory' && (
          <div>
            <div className="admin-toolbar">
              <div>
                <h2>Tannery Hides &amp; Square Footage Inventory</h2>
                <small style={{ color: 'var(--admin-muted)' }}>
                  Live tracking of usable full-grain, vegetable-tanned, and cross-hatch hides for bespoke orders
                </small>
              </div>
              <button className="admin-primary-btn" onClick={loadData}>
                ↻ Refresh Stock
              </button>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Material Hide</th>
                    <th>Thickness</th>
                    <th>Supplier / Tannery</th>
                    <th>Procurement Rate</th>
                    <th>Current Stock (Sq. Ft.)</th>
                    <th>Stock Level vs Minimum</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leatherHides.map((h) => {
                    const pct = Math.min(100, Math.round(((h.stockSqFt || 0) / (h.minThresholdSqFt ? h.minThresholdSqFt * 2 : 400)) * 100))
                    return (
                      <tr key={h.id}>
                        <td>
                          <b>{h.name}</b>
                          <br />
                          <small style={{ color: 'var(--admin-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {h.id}
                          </small>
                        </td>
                        <td>{h.thicknessMm} mm</td>
                        <td>{h.supplier}</td>
                        <td>
                          <b>₹{h.ratePerSqFt} / sq.ft.</b>
                        </td>
                        <td>
                          <strong style={{ fontSize: '14px', color: 'var(--admin-gold)' }}>
                            {h.stockSqFt} sq.ft.
                          </strong>
                        </td>
                        <td style={{ minWidth: '160px' }}>
                          <div className="stock-bar-wrap">
                            <div className="stock-bar">
                              <div
                                className={`stock-bar-fill ${h.status === 'Low Stock' ? 'warning' : 'normal'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <small>{pct}%</small>
                          </div>
                          <small style={{ color: 'var(--admin-muted)' }}>
                            Min threshold: {h.minThresholdSqFt} sq.ft.
                          </small>
                        </td>
                        <td>
                          <span className={`status-pill ${h.status === 'Low Stock' ? 'lowstock' : 'instock'}`}>
                            {h.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="table-btn"
                            onClick={() => {
                              setStockEditItem(h)
                              setNewStockValue(h.stockSqFt || 0)
                              setNewRateValue(h.ratePerSqFt || 0)
                            }}
                          >
                            Update Rate &amp; Stock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HARDWARE & SUPPLIES */}
        {activeTab === 'hardware' && (
          <div>
            <div className="admin-toolbar">
              <div>
                <h2>Fittings, French Linen Thread &amp; Edge Lacquers</h2>
                <small style={{ color: 'var(--admin-muted)' }}>
                  Hardware components, solid brass buckles, saddler linen spools, and burnishing compounds
                </small>
              </div>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Unit Cost</th>
                    <th>Stock Units</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareAndSupplies.map((item) => (
                    <tr key={item.id}>
                      <td><b>{item.name}</b></td>
                      <td><span className="status-pill new">{item.category}</span></td>
                      <td>{item.supplier}</td>
                      <td>₹{item.costPerUnit} / unit</td>
                      <td>
                        <strong style={{ color: 'var(--admin-gold)' }}>{item.stockUnits} units</strong>
                      </td>
                      <td>
                        <span className={`status-pill ${item.status === 'Low Stock' ? 'lowstock' : 'instock'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ANALYTICS & FINANCIALS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <div className="admin-table-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--admin-ink)' }}>Bespoke Silhouette Popularity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { name: 'Everyday Tote Bag', count: quotes.filter((q) => q.productId === 'tote').length || 1, share: '42%' },
                  { name: 'Sculptor Handbag', count: quotes.filter((q) => q.productId === 'handbag').length || 1, share: '28%' },
                  { name: 'Bifold & Snap Wallet', count: quotes.filter((q) => q.productId === 'wallet').length || 1, share: '18%' },
                  { name: 'Essential Cardholder', count: quotes.filter((q) => q.productId === 'cardholder').length || 1, share: '8%' },
                  { name: 'Tech & Travel Sleeve', count: quotes.filter((q) => q.productId === 'sleeve').length || 0, share: '4%' },
                ].map((item) => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{item.name}</span>
                      <b>{item.share} ({item.count} orders)</b>
                    </div>
                    <div className="stock-bar">
                      <div className="stock-bar-fill normal" style={{ width: item.share }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-table-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--admin-ink)' }}>Leather Selection Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { name: 'Heritage Full-Grain Calf (Cognac & Saddle)', share: '45%' },
                  { name: 'Saffiano Cross-Grain (Black & Espresso)', share: '30%' },
                  { name: 'Smooth Italian Nappa (Oxblood)', share: '15%' },
                  { name: 'Pebble Grain Calf (Olive & Navy)', share: '10%' },
                ].map((item) => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{item.name}</span>
                      <b>{item.share}</b>
                    </div>
                    <div className="stock-bar">
                      <div className="stock-bar-fill normal" style={{ width: item.share, background: 'var(--admin-gold)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-table-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--admin-ink)' }}>Artisan Studio Performance Metrics</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-muted)' }}>Average Bench Craft Time:</span>
                  <b>~9.2 working days</b>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-muted)' }}>Cutting Yield Efficiency:</span>
                  <b>78.4% (Target: &gt;75%)</b>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-muted)' }}>First-Pass QC Approval Rate:</span>
                  <b style={{ color: 'var(--admin-green)' }}>99.2%</b>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-muted)' }}>Customer Quote-to-Build Conversion:</span>
                  <b>64.8%</b>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Workshop Spec Modal / Drawer */}
      {selectedQuote && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedQuote(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>Production Spec Sheet: {selectedQuote.id}</h3>
                <small style={{ color: 'var(--admin-muted)' }}>
                  Client: {selectedQuote.customer.name} · {selectedQuote.customer.email}
                </small>
              </div>
              <button
                style={{ background: 'transparent', border: 0, color: 'var(--admin-muted)', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setSelectedQuote(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--admin-surface-card)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <small style={{ color: 'var(--admin-muted)' }}>SILHOUETTE &amp; LEATHER</small>
                  <div><b>{selectedQuote.productName}</b></div>
                  <div style={{ fontSize: '12px' }}>{selectedQuote.leatherName} ({selectedQuote.colorName})</div>
                </div>
                <div>
                  <small style={{ color: 'var(--admin-muted)' }}>HARDWARE &amp; MONOGRAM</small>
                  <div><b>{selectedQuote.hardware.toUpperCase()} Fittings</b></div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-gold)' }}>
                    {selectedQuote.monogram ? `Foil: "${selectedQuote.monogram}" (${selectedQuote.monogramMethod})` : 'No Monogram'}
                  </div>
                </div>
              </div>

              {selectedQuote.notes && (
                <div style={{ background: 'var(--admin-surface-card)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                  <small style={{ color: 'var(--admin-gold)', fontWeight: 700 }}>CLIENT SPECIAL INSTRUCTIONS:</small>
                  <p style={{ margin: '4px 0 0' }}>{selectedQuote.notes}</p>
                </div>
              )}

              <div>
                <small style={{ color: 'var(--admin-muted)', display: 'block', marginBottom: '6px' }}>
                  ASCII TECHNICAL CUTTING BENCH SPECIFICATION:
                </small>
                <pre className="spec-pre">{selectedQuote.workshopSpec || 'Specification generated on bench.'}</pre>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-muted)' }}>
                  SET BENCH STATUS:
                </label>
                <select
                  style={{
                    background: 'var(--admin-surface-card)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-ink)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  value={selectedQuote.status}
                  onChange={(e) => handleStatusChange(selectedQuote.id, e.target.value as QuoteRecord['status'])}
                >
                  <option value="New Quote Request">New Quote Request</option>
                  <option value="Bench Approved">Bench Approved</option>
                  <option value="In Cutting Bench">In Cutting Bench</option>
                  <option value="In Stitching">In Stitching</option>
                  <option value="Quality Inspection Passed">Quality Inspection Passed</option>
                  <option value="Ready for Dispatch">Ready for Dispatch</option>
                </select>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                className="table-btn"
                onClick={() => {
                  if (selectedQuote.workshopSpec) {
                    navigator.clipboard.writeText(selectedQuote.workshopSpec)
                    showToast('Workshop spec copied to clipboard!')
                  }
                }}
              >
                Copy Spec
              </button>
              <button
                className="admin-primary-btn"
                onClick={() => {
                  window.print()
                }}
              >
                Print Traveler Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Edit Modal */}
      {stockEditItem && (
        <div className="admin-modal-backdrop" onClick={() => setStockEditItem(null)}>
          <div className="admin-modal" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Update Stock: {stockEditItem.name}</h3>
              <button
                style={{ background: 'transparent', border: 0, color: 'var(--admin-muted)', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setStockEditItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>Current Stock (Square Feet):</label>
                <input
                  type="number"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Number(e.target.value))}
                />
              </div>

              <div className="admin-form-group">
                <label>Procurement Rate (₹ per Sq. Ft.):</label>
                <input
                  type="number"
                  value={newRateValue}
                  onChange={(e) => setNewRateValue(Number(e.target.value))}
                />
              </div>

              <small style={{ color: 'var(--admin-muted)' }}>
                Supplier: {stockEditItem.supplier}
              </small>
            </div>

            <div className="admin-modal-footer">
              <button className="table-btn" onClick={() => setStockEditItem(null)}>
                Cancel
              </button>
              <button className="admin-primary-btn" onClick={handleSaveInventory}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
