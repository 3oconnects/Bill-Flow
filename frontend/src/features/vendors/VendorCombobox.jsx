import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Searchable vendor combobox. Mirrors CustomerCombobox so the UX is identical
 * across the app.
 */
export default function VendorCombobox({ vendors = [], value, onPick, placeholder }) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef             = useRef(null)

  const selected = useMemo(
    () => vendors.find(v => v.id === value) || null,
    [vendors, value],
  )

  useEffect(() => {
    if (!open) setQuery(selected?.name || '')
  }, [selected, open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vendors.slice(0, 30)
    return vendors.filter(v =>
      (v.name  || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q) ||
      (v.gstin || '').toLowerCase().includes(q),
    ).slice(0, 50)
  }, [query, vendors])

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => { setActive(0) }, [query, open])

  const pick = (v) => {
    if (!v) return
    onPick(v)
    setQuery(v.name || '')
    setOpen(false)
  }

  const clear = () => { onPick(null); setQuery(''); setOpen(true) }

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')   { e.preventDefault(); pick(results[active]) }
    else if (e.key === 'Escape')  { setOpen(false) }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-text3)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          value={query}
          placeholder={placeholder || 'Search vendor by name, email, phone, GSTIN…'}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKey}
          style={{ paddingLeft: 30, paddingRight: selected ? 30 : 12 }}
        />
        {selected && (
          <button type="button" onClick={clear} title="Clear"
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: 'var(--c-text3)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,.12)',
          maxHeight: 280, overflowY: 'auto', zIndex: 100,
        }}>
          {results.map((v, i) => (
            <div key={v.id}
              onMouseDown={(e) => { e.preventDefault(); pick(v) }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === active ? 'var(--c-primary-lt)' : 'transparent',
                borderBottom: '1px solid var(--c-border)',
              }}>
              <div style={{ fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                {v.email && <span>{v.email}</span>}
                {v.phone && <span>{v.phone}</span>}
                {v.gstin && <span style={{ fontFamily: 'monospace' }}>{v.gstin}</span>}
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
          No vendors match "{query}"
        </div>
      )}
    </div>
  )
}
