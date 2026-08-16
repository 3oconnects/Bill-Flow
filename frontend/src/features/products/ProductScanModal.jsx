import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Scan, X, Camera, CameraOff } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { productsApi } from '@/api'
import { toast } from '@/store/toastStore'

const READER_ID = 'product-qr-reader'

/**
 * Camera-based product barcode / QR scanner.
 *
 * Uses html5-qrcode, which talks to getUserMedia and decodes QR codes plus
 * common 1D barcodes (EAN/UPC/Code128/etc). Works on desktop webcams *and*
 * phones — on mobile it picks the rear camera by default.
 *
 * onSelect(product) fires once the scanned code resolves to a product row;
 * the modal then auto-closes.
 */
export default function ProductScanModal({ onClose, onSelect }) {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })
  const [code, setCode]       = useState('')
  const [camOn, setCamOn]     = useState(true)
  const [error, setError]     = useState('')
  const scannerRef            = useRef(null)
  const handledRef            = useRef(false)

  // Build SKU/barcode/QR -> product index
  const skuIndex = useMemo(() => {
    const map = new Map()
    for (const p of products) {
      if (p.sku)     map.set(String(p.sku).toLowerCase(),     p)
      if (p.barcode) map.set(String(p.barcode).toLowerCase(), p)
      if (p.qr_code) map.set(String(p.qr_code).toLowerCase(), p)
    }
    return map
  }, [products])

  const resolveCode = (raw) => {
    const q = String(raw || '').trim().toLowerCase()
    if (!q) return null
    return skuIndex.get(q) || products.find(p => (p.name || '').toLowerCase() === q) || null
  }

  const handleMatch = (raw) => {
    if (handledRef.current) return
    const str = String(raw || '').trim()
    
    // Check if it's a JSON bundle (e.g. [{"sku":"ABC", "qty":5}])
    if (str.startsWith('[') || str.startsWith('{')) {
      try {
        const parsed = JSON.parse(str)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        const resolvedItems = []
        let missing = 0
        
        for (const item of items) {
          const match = resolveCode(item.sku || item.itemCode || item.barcode || item.product_id)
          if (match) {
            resolvedItems.push({ product: match, qty: Number(item.qty) || 1 })
          } else {
            missing++
          }
        }
        
        if (resolvedItems.length > 0) {
          handledRef.current = true
          toast.success(`Scanned bundle: ${resolvedItems.length} items added${missing ? ` (${missing} skipped)` : ''}`)
          onSelect(resolvedItems, true) // true indicates it's a bundle/array
          onClose()
          return
        } else {
          toast.error("QR Code JSON parsed, but no matching products found.")
          return
        }
      } catch (e) {
        // Not valid JSON, fall through to normal SKU lookup
      }
    }

    const match = resolveCode(raw)
    if (!match) {
      toast.error(`No product matches "${raw}"`)
      return
    }
    handledRef.current = true
    toast.success(`Scanned: ${match.name}`)
    onSelect(match, false)
    onClose()
  }

  // Camera lifecycle
  useEffect(() => {
    if (!camOn || !products.length) return
    let cancelled = false
    let started   = false
    setError('')

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(READER_ID, { verbose: false })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 180 } },
          (decoded) => handleMatch(decoded),
          () => { /* per-frame decode failure — ignore */ },
        )
        started = true
        if (cancelled) {
          try { await scanner.stop() } catch { /* race: ignore */ }
          try { scanner.clear() } catch {}
        }
      } catch (e) {
        setError(e?.message || 'Camera unavailable. Use manual entry below.')
      }
    }
    start()

    return () => {
      cancelled = true
      const s = scannerRef.current
      if (!s) return
      // html5-qrcode throws if .stop() is called while not scanning,
      // so guard with isScanning() and swallow any race errors.
      Promise.resolve()
        .then(() => (started && s.isScanning ? s.stop() : null))
        .catch(() => {})
        .finally(() => { try { s.clear() } catch {} })
      scannerRef.current = null
    }
    // products.length triggers re-init once catalogue is loaded
  }, [camOn, products.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
            }}>
              <Scan size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Product Barcode / QR Scanner</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                Point your phone or webcam at the product
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Camera viewport */}
          <div style={{
            width: '100%', aspectRatio: '16/10', background: '#000', borderRadius: 12,
            marginBottom: 10, position: 'relative', overflow: 'hidden',
          }}>
            <div id={READER_ID} style={{ width: '100%', height: '100%' }} />
            {!camOn && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.55)', fontSize: 12, gap: 6,
              }}>
                <CameraOff size={26} />
                <div>Camera is off</div>
              </div>
            )}
            {camOn && error && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center', padding: 16,
                color: '#ffb4b4', fontSize: 12, background: 'rgba(0,0,0,.6)',
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setCamOn(c => !c)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {camOn ? <><CameraOff size={15} /> Pause Camera</> : <><Camera size={15} /> Start Camera</>}
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8,
            }}>
              Or enter SKU / barcode manually
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="e.g. SKU-1002 or 8901234567890"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleMatch(code) }}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={() => handleMatch(code)} style={{ padding: '0 22px' }}>
                Find
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 8 }}>
              Tip: a USB barcode scanner acts like a keyboard — focus this field and scan.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
