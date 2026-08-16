import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X, FileText } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function ReceiptCombobox({ receipts = [], value, onPick, placeholder }) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef             = useRef(null)

  const selected = useMemo(
    () => receipts.find(r => r.receipt_number === value) || null,
    [receipts, value],
  )

  useEffect(() => {
    if (!open) setQuery(selected?.receipt_number || '')
  }, [selected, open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return receipts
    return receipts.filter(r =>
      (r.receipt_number || '').toLowerCase().includes(q) ||
      (r.base_po_no || '').toLowerCase().includes(q)
    )
  }, [query, receipts])

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => { setActive(0) }, [query, open])

  const pick = (r) => {
    if (!r) return
    onPick(r.receipt_number)
    setQuery(r.receipt_number)
    setOpen(false)
  }

  const clear = () => { onPick(''); setQuery(''); setOpen(true) }

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')   { e.preventDefault(); if (results[active]) pick(results[active]) }
    else if (e.key === 'Escape')  { setOpen(false) }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <FileText size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-text3)', pointerEvents: 'none',
        }} />
        <input
          className="form-input sm"
          value={query}
          placeholder={placeholder || 'Search by receipt no, po no...'}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={e => { 
            setQuery(e.target.value); 
            setOpen(true); 
            if(!e.target.value) onPick('') 
            else onPick(e.target.value) // allow raw typing
          }}
          onKeyDown={onKey}
          style={{ paddingLeft: 30, paddingRight: selected ? 30 : 12, width: '100%' }}
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
          {results.map((r, i) => (
            <div key={r.id}
              onMouseDown={(e) => { e.preventDefault(); pick(r) }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === active ? 'var(--c-primary-lt)' : 'transparent',
                borderBottom: '1px solid var(--c-border)',
              }}>
              <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{r.receipt_number}</span>
                <span style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 'normal' }}>
                  {r.posting_date ? fmt.date(r.posting_date) : ''}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', gap: 10, marginTop: 4 }}>
                {r.base_po_no && <span>PO: {r.base_po_no}</span>}
                <span>Items: {r.items?.length || 0}</span>
                <span>Whse: MAIN</span>
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
          No receipts match "{query}"
        </div>
      )}
    </div>
  )
}
