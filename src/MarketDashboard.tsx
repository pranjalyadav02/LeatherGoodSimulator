import { useMemo, useState } from 'react'
import {
  calculateMarketAverages,
  convertSupplierPrice,
  EMPTY_MARKET_STORE,
  listingExclusionReasons,
  loadMarketStore,
  normalizeObservation,
  saveMarketStore,
  SUPPLIER_SOURCES,
  type CurrencyCode,
  type ExchangeRateObservation,
  type Grade,
  type MarketFinish,
  type MarketStore,
  type MarketSegment,
  type PriceObservation,
  type PriceUnit,
  type Species,
  type StockStatus,
  type Tanning,
  type VerificationStatus,
} from './market'
import './MarketDashboard.css'

type Props = { onBack: () => void; selectedMaterial: string }
type IntakeForm = Omit<PriceObservation, 'id'>
type RateForm = Omit<ExchangeRateObservation, 'id'>

const currencyOptions: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP']
const unitOptions: PriceUnit[] = ['sq-ft', 'sq-m', 'hide', 'side', 'sheet', 'panel', 'piece', 'kg']
const speciesOptions: Species[] = ['cow', 'buffalo', 'goat', 'sheep-lamb', 'other', 'unknown']
const gradeOptions: Grade[] = ['full-grain', 'top-grain', 'corrected-grain', 'split-suede', 'other', 'unknown']
const tanningOptions: Tanning[] = ['vegetable', 'chrome', 'other', 'unknown']
const finishOptions: MarketFinish[] = ['oil-pull-up', 'nubuck', 'suede', 'smooth', 'embossed', 'other', 'unknown']

const nowInput = () => new Date().toISOString().slice(0, 16)
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const money = (value: number, digits = 2) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
const label = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const emptyForm = (): IntakeForm => ({
  sourceId: SUPPLIER_SOURCES[0].id,
  supplier: SUPPLIER_SOURCES[0].supplier,
  productName: '',
  sourceUrl: SUPPLIER_SOURCES[0].url,
  species: 'unknown',
  grade: 'unknown',
  tanning: 'unknown',
  finish: 'unknown',
  thicknessMm: null,
  country: 'India',
  displayedPrice: 0,
  currency: 'INR',
  unit: 'sq-ft',
  unitAreaSqFt: null,
  minimumOrder: '',
  segment: 'retail',
  stock: 'unknown',
  taxesShipping: '',
  observedAt: nowInput(),
  expiresAt: null,
  verification: 'pending',
  verifiedBy: '',
  correctionReason: '',
})

function loadInitial(): { store: MarketStore; error: string } {
  try {
    return { store: loadMarketStore(), error: '' }
  } catch {
    return { store: EMPTY_MARKET_STORE, error: 'Could not read locally saved market data. A temporary empty view is shown.' }
  }
}

function Field({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`market-field ${wide ? 'wide' : ''}`}><span>{title}</span>{children}</label>
}

export default function MarketDashboard({ onBack, selectedMaterial }: Props) {
  const [initial] = useState(loadInitial)
  const [store, setStore] = useState(initial.store)
  const [storageError, setStorageError] = useState(initial.error)
  const [form, setForm] = useState<IntakeForm>(emptyForm)
  const [marketNow, setMarketNow] = useState(() => Date.now())
  const [rateForm, setRateForm] = useState<RateForm>({
    currency: 'USD',
    inrPerUnit: 0,
    sourceUrl: '',
    observedAt: nowInput(),
    verifiedBy: '',
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'rates'>('overview')
  const [notice, setNotice] = useState('')
  const [attemptedRefresh, setAttemptedRefresh] = useState(false)
  const averages = useMemo(
    () => calculateMarketAverages(store.observations, store.exchangeRates, store.freshnessDays, marketNow),
    [store, marketNow],
  )
  const exclusions = useMemo(
    () => listingExclusionReasons(store.observations, store.exchangeRates, store.freshnessDays, marketNow),
    [store, marketNow],
  )
  const eligibleCount = store.observations.filter((item) => exclusions.get(item.id) === 'Eligible for its exact comparison group').length

  const persist = (next: MarketStore) => {
    try {
      saveMarketStore(next)
      setStore(next)
      setStorageError('')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not save market data.')
    }
  }

  const updateForm = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const selectSource = (id: string) => {
    if (id === 'manual-quotation') {
      setForm((previous) => ({
        ...previous,
        sourceId: id,
        supplier: '',
        sourceUrl: '',
      }))
      return
    }
    const source = SUPPLIER_SOURCES.find((item) => item.id === id)
    if (!source) return
    setForm((previous) => ({
      ...previous,
      sourceId: source.id,
      supplier: source.supplier,
      sourceUrl: source.url,
      country: source.region === 'India' ? 'India' : previous.country,
    }))
  }

  const submitListing = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let source: URL
    try {
      source = new URL(form.sourceUrl)
    } catch {
      setNotice('Enter a valid public HTTPS source or quotation URL.')
      return
    }
    if (source.protocol !== 'https:') {
      setNotice('Only HTTPS source links can be recorded.')
      return
    }
    if (form.unitAreaSqFt !== null && (!Number.isFinite(form.unitAreaSqFt) || form.unitAreaSqFt <= 0)) {
      setNotice('Verified area must be a positive number.')
      return
    }
    if (form.verification === 'verified' && (!form.verifiedBy.trim() || !form.correctionReason.trim())) {
      setNotice('Record the reviewer and verification evidence before marking a listing verified.')
      return
    }
    const observation: PriceObservation = {
      ...form,
      id: newId(),
      supplier: form.supplier.trim(),
      productName: form.productName.trim(),
      sourceUrl: source.toString(),
      country: form.country.trim(),
      minimumOrder: form.minimumOrder.trim(),
      taxesShipping: form.taxesShipping.trim(),
      observedAt: new Date(form.observedAt).toISOString(),
      verifiedBy: form.verifiedBy.trim(),
      correctionReason: form.correctionReason.trim(),
    }
    persist({ ...store, observations: [observation, ...store.observations] })
    setForm(emptyForm())
    setActiveTab('listings')
    setNotice('Price observation saved locally. It remains outside averages until verified, in stock, comparable, and fresh.')
  }

  const submitRate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let source: URL
    try {
      source = new URL(rateForm.sourceUrl)
    } catch {
      setNotice('Add the public source URL for the exchange-rate observation.')
      return
    }
    if (source.protocol !== 'https:' || rateForm.inrPerUnit <= 0 || !rateForm.verifiedBy.trim()) {
      setNotice('Use an HTTPS source, a positive rate, and record who verified it.')
      return
    }
    const next: ExchangeRateObservation = {
      ...rateForm,
      id: newId(),
      sourceUrl: source.toString(),
      observedAt: new Date(rateForm.observedAt).toISOString(),
      verifiedBy: rateForm.verifiedBy.trim(),
    }
    persist({ ...store, exchangeRates: [next, ...store.exchangeRates] })
    setRateForm({ currency: 'USD', inrPerUnit: 0, sourceUrl: '', observedAt: nowInput(), verifiedBy: '' })
    setNotice('Exchange-rate observation saved locally. Only rates observed before a listing are used for normalization.')
  }

  const refresh = () => {
    setMarketNow(Date.now())
    setAttemptedRefresh(true)
    setNotice('No authorised API or server-side connector is configured. Nothing was fetched, and no price was generated.')
  }

  const currentMaterialAverages = averages

  return (
    <section className="market-page">
      <div className="market-topline">
        <div><span className="market-kicker">SUPPLIER RESEARCH · ADMIN WORKSPACE</span><h1>Leather market <em>observations.</em></h1></div>
        <button className="market-back" onClick={onBack}>← Back to design studio</button>
      </div>
      <p className="market-intro">A transparent record of source-linked listings and quotations. Averages are calculated only from fresh, approved, in-stock listings with comparable specifications; they describe these observations, not the whole market.</p>

      <div className="market-warning"><b>Prototype storage:</b> records live only in this browser’s local storage; this is not a secure, shared admin console. No supplier pages are scraped or automatically refreshed. Verify source terms, listings, units, stock, and rates before approval.</div>
      {storageError && <div className="market-error" role="alert">{storageError}</div>}
      {notice && <div className="market-notice" role="status">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}

      <div className="market-toolbar">
        <nav className="market-tabs" aria-label="Market workspace">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Observed averages</button>
          <button className={activeTab === 'listings' ? 'active' : ''} onClick={() => setActiveTab('listings')}>Price observations <span>{store.observations.length}</span></button>
          <button className={activeTab === 'rates' ? 'active' : ''} onClick={() => setActiveTab('rates')}>Exchange rates <span>{store.exchangeRates.length}</span></button>
        </nav>
        <button className="refresh-button" onClick={refresh}>↻ Check source connectors</button>
      </div>
      {attemptedRefresh && <div className="connector-message"><b>Connectors not configured.</b> Sources are listed below for permitted manual review. There is no background worker, API credential, or authorised feed configured in this frontend-only project.</div>}

      {activeTab === 'overview' && (
        <>
          <div className="market-metrics">
            <div><span>ELIGIBLE LISTINGS</span><b>{eligibleCount}</b><small>After verification, stock and freshness filters</small></div>
            <div><span>OBSERVED COMPARABLE GROUPS</span><b>{averages.length}</b><small>Exact specification groups only</small></div>
            <div><span>FRESHNESS WINDOW</span><label><input type="number" min="1" max="365" value={store.freshnessDays} onChange={(event) => {
              const days = Number(event.target.value)
              if (Number.isInteger(days) && days >= 1 && days <= 365) persist({ ...store, freshnessDays: days })
            }} /> days</label><small>Configurable · local to this browser</small></div>
          </div>

          {selectedMaterial && <div className="material-market-note"><b>Configurator selection: {selectedMaterial}</b><span>There is no verified mapping from this demonstration swatch to a supplier material specification. No market average is being used as its procurement price.</span></div>}

          {currentMaterialAverages.length === 0 ? (
            <section className="market-empty"><span>∅</span><h2>No eligible market observations yet</h2><p>Record a public listing or a current supplier quotation in the observations tab. Leave it pending until its details, stock, unit, and source have been checked.</p><button onClick={() => setActiveTab('listings')}>Record a price observation →</button></section>
          ) : (
            <div className="market-groups">
              {averages.map((group) => {
                const [segment, species, grade, tanning, finish, country, thickness, minimumOrder] = group.groupKey.split('|')
                return <article className="market-group-card" key={group.groupKey}>
                  <div className="group-heading"><div><span>{label(segment)} comparison</span><h2>{label(species)} · {label(grade)}</h2></div><span className={`confidence ${group.confidence}`}>{label(group.confidence)} confidence</span></div>
                  <p>{label(tanning)} tanned · {label(finish)} · {label(country)} · {thickness === 'thickness-unknown' ? 'Thickness unknown' : thickness} · minimum order: {label(minimumOrder)}</p>
                  <div className="average-price">{money(group.mean)} <small>mean / sq ft</small></div>
                  <div className="stat-grid"><div><span>MEDIAN</span><b>{money(group.median)}</b></div><div><span>OBSERVED RANGE</span><b>{money(group.minimum)}–{money(group.maximum)}</b></div><div><span>ELIGIBLE LISTINGS</span><b>{group.listingCount} · {group.supplierCount} suppliers</b></div></div>
                  <small className="last-observed">Latest eligible observation: {new Date(group.latestObservedAt).toLocaleString()}</small>
                </article>
              })}
            </div>
          )}
          <p className="market-disclaimer">All figures are arithmetic calculations from eligible records stored here. Similar names alone do not make products comparable. Retail and wholesale listings, thickness, species, grade, finish, tanning, and origin are kept in separate groups. A market average is not the procurement cost of a selected material.</p>
        </>
      )}

      {activeTab === 'listings' && (
        <div className="market-columns">
          <section className="market-form-card">
            <span className="market-kicker">MANUAL INTAKE · IMMUTABLE PRICE SNAPSHOT</span><h2>Record a listing</h2>
            <form className="market-form" onSubmit={submitListing}>
              <Field title="Supplier source">
                <select value={form.sourceId} onChange={(event) => selectSource(event.target.value)}>
                  {SUPPLIER_SOURCES.map((source) => <option value={source.id} key={source.id}>{source.supplier}</option>)}
                  <option value="manual-quotation">Manual quotation (enter supplier below)</option>
                </select>
              </Field>
              <Field title="Supplier name"><input required value={form.supplier} onChange={(event) => updateForm('supplier', event.target.value)} /></Field>
              <Field title="Product / SKU"><input required value={form.productName} onChange={(event) => updateForm('productName', event.target.value)} placeholder="Supplier's product name" /></Field>
              <Field title="Source listing or quotation URL" wide><input required type="url" value={form.sourceUrl} onChange={(event) => updateForm('sourceUrl', event.target.value)} placeholder="https://…" /></Field>
              <Field title="Species"><select value={form.species} onChange={(event) => updateForm('species', event.target.value as Species)}>{speciesOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
              <Field title="Grade"><select value={form.grade} onChange={(event) => updateForm('grade', event.target.value as Grade)}>{gradeOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
              <Field title="Tanning"><select value={form.tanning} onChange={(event) => updateForm('tanning', event.target.value as Tanning)}>{tanningOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
              <Field title="Finish"><select value={form.finish} onChange={(event) => updateForm('finish', event.target.value as MarketFinish)}>{finishOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
              <Field title="Thickness (mm)"><input type="number" min="0" step="0.1" value={form.thicknessMm ?? ''} onChange={(event) => updateForm('thicknessMm', event.target.value === '' ? null : Number(event.target.value))} placeholder="Unknown" /></Field>
              <Field title="Country of origin"><input required value={form.country} onChange={(event) => updateForm('country', event.target.value)} /></Field>
              <Field title="Displayed price"><input required type="number" min="0.01" step="any" value={form.displayedPrice || ''} onChange={(event) => updateForm('displayedPrice', Number(event.target.value))} /></Field>
              <Field title="Currency"><select value={form.currency} onChange={(event) => updateForm('currency', event.target.value as CurrencyCode)}>{currencyOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field title="Price unit"><select value={form.unit} onChange={(event) => updateForm('unit', event.target.value as PriceUnit)}>{unitOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></Field>
              {['hide', 'side', 'sheet', 'panel', 'piece'].includes(form.unit) && <Field title="Verified area per unit (sq ft)"><input type="number" min="0.01" step="any" value={form.unitAreaSqFt ?? ''} onChange={(event) => updateForm('unitAreaSqFt', event.target.value === '' ? null : Number(event.target.value))} placeholder="Required to normalize" /></Field>}
              {form.unit === 'kg' && <div className="market-inline-note">Weight-priced listings are retained, but excluded from per-area averages without verified yield data.</div>}
              <Field title="Purchase segment"><select value={form.segment} onChange={(event) => updateForm('segment', event.target.value as MarketSegment)}><option value="retail">Retail</option><option value="wholesale">Wholesale</option></select></Field>
              <Field title="Minimum order"><input value={form.minimumOrder} onChange={(event) => updateForm('minimumOrder', event.target.value)} placeholder="As disclosed by seller" /></Field>
              <Field title="Stock status"><select value={form.stock} onChange={(event) => updateForm('stock', event.target.value as StockStatus)}><option value="unknown">Unknown</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select></Field>
              <Field title="Price observed at"><input required type="datetime-local" value={form.observedAt} onChange={(event) => updateForm('observedAt', event.target.value)} /></Field>
              <Field title="Quotation expiry (if applicable)"><input type="date" value={form.expiresAt ?? ''} onChange={(event) => updateForm('expiresAt', event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : null)} /></Field>
              <Field title="Taxes / shipping"><input value={form.taxesShipping} onChange={(event) => updateForm('taxesShipping', event.target.value)} placeholder="As disclosed; no assumptions" /></Field>
              <Field title="Verification status"><select value={form.verification} onChange={(event) => updateForm('verification', event.target.value as VerificationStatus)}><option value="pending">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></Field>
              {form.verification === 'verified' && <>
                <Field title="Reviewed by"><input required value={form.verifiedBy} onChange={(event) => updateForm('verifiedBy', event.target.value)} /></Field>
                <Field title="Verification evidence / reason" wide><textarea required rows={2} value={form.correctionReason} onChange={(event) => updateForm('correctionReason', event.target.value)} placeholder="What was checked? If corrected, retain the original value and explain." /></Field>
              </>}
              <button className="market-submit" type="submit">Save source-linked observation →</button>
            </form>
          </section>

          <section className="market-data-card">
            <div className="market-data-heading"><div><span className="market-kicker">OBSERVATION HISTORY</span><h2>Recorded listings</h2></div><span>{store.observations.length} snapshots</span></div>
            {store.observations.length === 0 ? <p className="empty-history">No price observations have been entered.</p> : <div className="observation-list">
              {store.observations.map((item) => {
                const normalized = normalizeObservation(item, store.exchangeRates, marketNow, store.freshnessDays)
                const converted = convertSupplierPrice(item, store.exchangeRates, store.freshnessDays)
                const reason = exclusions.get(item.id) ?? normalized.excludedReason
                return <article className="observation-row" key={item.id}>
                  <div className="observation-title"><div><b>{item.productName}</b><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.supplier} ↗</a></div><span className={`review-state ${item.verification}`}>{label(item.verification)}</span></div>
                  <p>{label(item.species)} · {label(item.grade)} · {label(item.tanning)} · {label(item.finish)} · {item.thicknessMm === null ? 'thickness unknown' : `${item.thicknessMm} mm`}</p>
                  <div className="observation-price">{item.currency} {item.displayedPrice.toLocaleString()} / {label(item.unit)} <span>{item.stock === 'in-stock' ? 'In stock' : label(item.stock)}</span></div>
                  {item.currency !== 'INR' && (converted
                    ? <div className="conversion-note">Supplier amount converted: {money(converted.amountInInr)} / original unit using {item.currency}→INR {converted.rate.toLocaleString()} · <a href={converted.sourceUrl} target="_blank" rel="noreferrer">rate source ↗</a> · {new Date(converted.observedAt).toLocaleString()}</div>
                    : <div className="conversion-note unavailable">INR conversion unavailable: no rate recorded at or before this listing.</div>)}
                  {item.currency !== 'INR' && <div className="conversion-note unavailable">Landed cost unavailable; shipping, insurance, customs classification and applicable charges are not verified.</div>}
                  <small>{item.segment} · {item.country} · {new Date(item.observedAt).toLocaleString()}</small>
                  <div className={`eligibility ${reason === 'Eligible for its exact comparison group' ? 'eligible' : ''}`}>{reason}{normalized.inrPerSqFt !== null && <b> · {money(normalized.inrPerSqFt)}/sq ft</b>}</div>
                </article>
              })}
            </div>}
          </section>
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="market-columns">
          <section className="market-form-card">
            <span className="market-kicker">VERIFIED PROVIDER DATA REQUIRED</span><h2>Record an exchange rate</h2>
            <p className="market-form-copy">Rates are entered with a source URL and reviewer. The market module will not guess an exchange rate. An observation uses only the latest rate recorded at or before its price timestamp.</p>
            <form className="market-form rate-form" onSubmit={submitRate}>
              <Field title="Currency"><select value={rateForm.currency} onChange={(event) => setRateForm((previous) => ({ ...previous, currency: event.target.value as RateForm['currency'] }))}><option value="USD">USD → INR</option><option value="EUR">EUR → INR</option><option value="GBP">GBP → INR</option></select></Field>
              <Field title="INR per currency unit"><input type="number" min="0.0001" step="any" required value={rateForm.inrPerUnit || ''} onChange={(event) => setRateForm((previous) => ({ ...previous, inrPerUnit: Number(event.target.value) }))} /></Field>
              <Field title="Rate source URL" wide><input type="url" required value={rateForm.sourceUrl} onChange={(event) => setRateForm((previous) => ({ ...previous, sourceUrl: event.target.value }))} placeholder="https://approved-rate-provider/…" /></Field>
              <Field title="Rate observed at"><input type="datetime-local" required value={rateForm.observedAt} onChange={(event) => setRateForm((previous) => ({ ...previous, observedAt: event.target.value }))} /></Field>
              <Field title="Verified by"><input required value={rateForm.verifiedBy} onChange={(event) => setRateForm((previous) => ({ ...previous, verifiedBy: event.target.value }))} /></Field>
              <button className="market-submit" type="submit">Save verified rate snapshot →</button>
            </form>
          </section>
          <section className="market-data-card"><div className="market-data-heading"><div><span className="market-kicker">EXCHANGE RATE HISTORY</span><h2>Recorded rates</h2></div><span>{store.exchangeRates.length} snapshots</span></div>
            {store.exchangeRates.length === 0 ? <p className="empty-history">No exchange rates have been entered. Non-INR listings cannot be normalized yet.</p> : store.exchangeRates.map((rate) => <article className="observation-row rate-row" key={rate.id}><div className="observation-title"><b>{rate.currency} → INR</b><strong>{rate.inrPerUnit.toLocaleString()} INR</strong></div><a href={rate.sourceUrl} target="_blank" rel="noreferrer">{rate.sourceUrl} ↗</a><small>{new Date(rate.observedAt).toLocaleString()} · reviewed by {rate.verifiedBy}</small></article>)}
          </section>
        </div>
      )}

      <section className="supplier-directory"><div className="market-data-heading"><div><span className="market-kicker">INITIAL SOURCE DIRECTORY</span><h2>Suppliers to verify</h2></div><span>Manual review only</span></div><p>These sources were provided as research leads, not confirmed APIs, listings, live prices, or permission for automated collection.</p><div className="source-grid">{SUPPLIER_SOURCES.map((source) => <article key={source.id}><div><b>{source.supplier}</b><span>{source.region} · Manual verification</span></div><a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a><small>{source.notes}</small></article>)}</div></section>

      <div className="market-footnote"><b>Costing boundary</b><span>Supplier prices remain tied to their original listing, currency, unit, source and timestamp. There are no verified supplier observations or material-to-catalog mappings configured, so no market rate is applied to configurator production costing. Landed costs, customs and usable-area yields remain unavailable unless documented separately.</span></div>
    </section>
  )
}
