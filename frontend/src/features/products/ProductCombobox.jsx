import { useState, useMemo, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

/**
 * Searchable product combobox. Same UX used in both QuotationForm and
 * InvoiceDetail so picking a product feels identical across the app.
 *
 * Props:
 *  - products   array of catalogue rows (must include id, name; optionally
 *               sku, hsn_code, unit_price, stock_qty, barcode)
 *  - onPick     callback(product) when a product is chosen
 *  - placeholder
 */
export default function ProductCombobox({ products = [], onPick, placeholder }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef             = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products.filter(p =>
      (p.name    || '').toLowerCase().includes(q) ||
      (p.sku     || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q),
    ).slice(0, 30)
  }, [query, products])

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => { setActive(0) }, [query, open])

  const pick = (p) => {
    if (!p) return
    onPick(p)
    setQuery('')
    setOpen(false)
  }

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 240 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-text3)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          value={query}
          placeholder={placeholder || 'Search product by name or SKU…'}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKey}
          style={{ paddingLeft: 30 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,.12)',
          maxHeight: 280, overflowY: 'auto', zIndex: 100,
        }}>
          {results.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === active ? 'var(--c-primary-lt)' : 'transparent',
                borderBottom: '1px solid var(--c-border)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--c-text)' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', gap: 10, marginTop: 2 }}>
                {p.sku      && <span style={{ fontFamily: 'monospace' }}>{p.sku}</span>}
                {p.hsn_code && <span>HSN {p.hsn_code}</span>}
                {p.unit_price != null && <span>₹{Number(p.unit_price).toLocaleString('en-IN')}</span>}
                {p.stock_qty != null  && <span>Stock {p.stock_qty}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-text3)',
          zIndex: 100,
        }}>
          No products match "{query}"
        </div>
      )}
    </div>
  )
}
