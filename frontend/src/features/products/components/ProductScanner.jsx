import { useEffect, useRef, useState } from 'react'
import { Upload, Search as SearchIcon, Package, CheckCircle2, HelpCircle, Globe } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { fmt } from '@/lib/utils'
import { Spinner } from '@/components/ui'

// ── Local product matching — checks SKU first since that's what the QR code / barcode
// on the product page encodes, then falls back to Product No./barcode/name ──
function findLocalMatch(products, code) {
  const c = code.trim().toLowerCase()
  if (!c) return null
  let m = products.find(p => p.sku?.trim().toLowerCase() === c)
  if (!m) m = products.find(p => p.unique_id?.trim().toLowerCase() === c)
  if (!m) m = products.find(p => p.sku && p.sku.trim().toLowerCase().includes(c))
  if (!m) m = products.find(p => p.sku && c.includes(p.sku.trim().toLowerCase()))
  if (!m) m = products.find(p => p.barcode?.trim().toLowerCase() === c || p.name?.trim().toLowerCase() === c)
  return m || null
}

// ── Online barcode lookup (Open Food Facts, then UPCItemDB) — numeric EAN/UPC only ──
async function lookupBarcodeOnline(barcode) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`)
    if (r.ok) {
      const d = await r.json()
      if (d.status === 1 && d.product) {
        const p = d.product
        return {
          name: p.product_name || p.product_name_en || '',
          brand: p.brands || '',
          description: p.generic_name || p.categories || '',
          category: 'food',
          sku: barcode,
        }
      }
    }
  } catch { /* try next source */ }

  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`)
    if (r.ok) {
      const d = await r.json()
      const item = (d.items || [])[0]
      if (item) {
        return {
          name: item.title || item.description || '',
          brand: item.brand || '',
          description: item.description || '',
          category: (item.category || '').toLowerCase().includes('food') ? 'food' : 'general',
          sku: barcode,
          unit_price: item.lowest_recorded_price || 0,
        }
      }
    }
  } catch { /* ignore */ }

  return null
}

const looksLikeInternalSKU = (code) => /^SKU-/i.test(code) || /^[A-Z]{2,}-[A-Z0-9]+-\d{3,}$/i.test(code) || /^[A-Z0-9]{6,10}$/i.test(code)
const looksLikeBarcode = (code) => /^\d{8,14}$/.test(code)

export default function ProductScanner({ products, onViewProduct, onEditProduct, onAddNewWithSku, onAddNewWithData }) {
  const readerRef = useRef(null)
  const fileReaderRef = useRef(null)
  const scannerInstance = useRef(null)
  const [cameraState, setCameraState] = useState('starting') // starting | active | denied | unavailable
  const [manualQuery, setManualQuery] = useState('')
  const [result, setResult] = useState(null) // { kind: 'match'|'online'|'notfound'|'loading'|'unreadable', ... }

  useEffect(() => {
    let stopped = false

    if (!readerRef.current) { setCameraState('unavailable'); return }
    const scanner = new Html5Qrcode(readerRef.current.id)
    scannerInstance.current = scanner
    let scanning = false

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 180 } },
      (decoded) => {
        if (scanning) return
        scanning = true
        if (window.navigator?.vibrate) window.navigator.vibrate(150)
        try { scanner.pause(true) } catch { /* noop */ }
        handleScannedValue(decoded).finally(() => {
          setTimeout(() => { scanning = false; try { scanner.resume() } catch { /* noop */ } }, 4000)
        })
      },
      () => { /* fires continuously with no code in frame — ignore */ }
    ).then(() => { if (!stopped) setCameraState('active') })
      .catch(() => { if (!stopped) setCameraState('denied') })

    return () => {
      stopped = true
      const s = scannerInstance.current
      if (s) {
        try {
          if (s.isScanning) s.stop().then(() => s.clear()).catch(() => {})
          else s.clear()
        } catch { /* noop */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScannedValue(rawCode) {
    const code = rawCode.trim()
    setResult({ kind: 'loading', code })

    const local = findLocalMatch(products, code)
    if (local) { setResult({ kind: 'match', product: local, code }); return }

    if (looksLikeBarcode(code) && !looksLikeInternalSKU(code)) {
      const online = await Promise.race([
        lookupBarcodeOnline(code),
        new Promise(res => setTimeout(() => res(null), 4000)),
      ])
      if (online && online.name) { setResult({ kind: 'online', data: online, code }); return }
    }

    setResult({ kind: 'notfound', code })
  }

  async function scanUploadedImage(file) {
    if (!file) return
    setResult({ kind: 'loading', code: 'image' })
    // scanFile is an INSTANCE method (not static) — needs its own Html5Qrcode bound to a
    // dedicated hidden element so it doesn't collide with the live camera scanner instance.
    if (!fileReaderRef.current) { setResult({ kind: 'unreadable' }); return }
    const fileScanner = new Html5Qrcode(fileReaderRef.current.id, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
      ],
      verbose: false,
    })
    try {
      const decoded = await Promise.race([
        fileScanner.scanFile(file, false),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
      ])
      if (decoded) { handleScannedValue(decoded); return }
    } catch { /* fall through to unreadable state */ }
    finally { try { fileScanner.clear() } catch { /* noop */ } }
    setResult({ kind: 'unreadable' })
  }

  const manualSearch = () => {
    if (!manualQuery.trim()) return
    handleScannedValue(manualQuery.trim())
  }

  return (
    <div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
        <HelpCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Scan any barcode or QR code. Existing products show instantly. New products found online are auto-filled so you only need to review and save.</span>
      </div>

      <div style={{ width: '100%', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border)', minHeight: 220, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div id="product-scanner-reader" ref={readerRef} style={{ width: '100%' }} />
        {/* Hidden element used only for decoding uploaded images — kept separate from the live camera reader above */}
        <div id="product-scanner-file-reader" ref={fileReaderRef} style={{ display: 'none' }} />
        {cameraState === 'starting' && <div style={{ position: 'absolute', color: '#fff', fontSize: 12, opacity: 0.5 }}>Starting camera…</div>}
        {cameraState === 'denied' && (
          <div style={{ position: 'absolute', color: '#fca5a5', fontSize: 12, padding: 16, textAlign: 'center' }}>
            Camera access denied or unavailable.<br /><span style={{ opacity: 0.7, fontSize: 11 }}>Use "Upload Image" or type SKU manually below.</span>
          </div>
        )}
        {cameraState === 'unavailable' && (
          <div style={{ position: 'absolute', color: '#fca5a5', fontSize: 12, padding: 16, textAlign: 'center' }}>Scanner library failed to load. Use upload or manual search below.</div>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-2)', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginTop: 12 }}>
        <Upload size={16} /> Upload Barcode / QR Image
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { scanUploadedImage(e.target.files?.[0]); e.target.value = '' }} />
      </label>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Or search by SKU / Product Name</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="e.g. SKU-1002 or Samsung" value={manualQuery}
            onChange={e => setManualQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') manualSearch() }} />
          <button className="btn btn-primary" onClick={manualSearch}><SearchIcon size={14} /> Search</button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {result?.kind === 'loading' && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-2)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Spinner size={14} /> Matching…
          </div>
        )}

        {result?.kind === 'match' && (() => {
          const p = result.product
          const stockLabel = p.stock_qty <= 0 ? 'Out of Stock' : Number(p.stock_qty) <= Number(p.low_stock_alert) ? `Low (${p.stock_qty})` : `${p.stock_qty} ${p.unit || 'pcs'}`
          const stockColor = p.stock_qty <= 0 ? 'var(--red)' : Number(p.stock_qty) <= Number(p.low_stock_alert) ? '#f59e0b' : 'var(--green)'
          return (
            <div style={{ border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#fff" />
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Product Found!</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                {p.brand && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>{p.brand}{p.model_number ? ` · ${p.model_number}` : ''} · {p.category || 'general'}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Selling Price</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>{fmt.currency(p.unit_price)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Stock</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: stockColor }}>{stockLabel}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10 }}>Product No: <strong style={{ fontFamily: 'monospace' }}>{p.unique_id || '—'}</strong>{p.sku ? ` · SKU: ${p.sku}` : ''}{p.hsn_code ? ` · HSN: ${p.hsn_code}` : ''}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onViewProduct(p.id)}>Full Details</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => onEditProduct(p)}>Edit</button>
                </div>
              </div>
            </div>
          )
        })()}

        {result?.kind === 'online' && (
          <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Globe size={16} color="#0ea5e9" />
              <span style={{ fontWeight: 700, color: '#0369a1', fontSize: 13 }}>Found Online — Not in Catalog Yet</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{result.data.name}</div>
            {result.data.brand && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>{result.data.brand}</div>}
            <p style={{ fontSize: 11, color: '#0369a1', marginBottom: 10 }}>Details will be auto-filled. Set the price and save.</p>
            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onAddNewWithData(result.data)}>Add to Catalog (Auto-filled)</button>
          </div>
        )}

        {result?.kind === 'notfound' && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Package size={16} color="#f59e0b" />
              <span style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>Product Not Found</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>No product matched: <strong style={{ fontFamily: 'monospace' }}>{result.code}</strong></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onAddNewWithSku(result.code)}>Add as New Product</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setResult(null)}>Try Again</button>
            </div>
          </div>
        )}

        {result?.kind === 'unreadable' && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 6, fontSize: 13 }}>Could not read QR/Barcode</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Tips: make sure the code fills most of the image, or try the camera scanner, or type the SKU manually above.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
