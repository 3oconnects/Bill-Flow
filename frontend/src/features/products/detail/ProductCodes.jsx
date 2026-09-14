import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, QrCode } from 'lucide-react'
import { S } from './DetailShared'

// Renders a QR code and a CODE128 barcode that both encode the product's SKU.
// Scanning either one with the built-in Product Scanner (or any barcode/QR
// reader) resolves straight back to this product, since findLocalMatch()
// in ProductScanner.jsx checks the scanned value against p.sku first.
export default function ProductCodes({ p }) {
  const barcodeRef = useRef(null)
  const qrWrapRef = useRef(null)
  const code = (p.sku || p.unique_id || '').trim()

  useEffect(() => {
    if (!code || !barcodeRef.current) return
    try {
      JsBarcode(barcodeRef.current, code, {
        format: 'CODE128',
        width: 1.6,
        height: 40,
        fontSize: 11,
        margin: 6,
        displayValue: true,
      })
    } catch {
      // JsBarcode throws on characters CODE128 can't encode — leave it blank
      if (barcodeRef.current) barcodeRef.current.innerHTML = ''
    }
  }, [code])

  const printCodes = () => {
    const qrSvg = qrWrapRef.current?.innerHTML || ''
    const barcodeSvg = barcodeRef.current?.outerHTML || ''
    const w = window.open('', '_blank', 'width=420,height=460')
    w.document.write(`<html><head><title>${p.name} — Scan Codes</title><style>
      body{font-family:Arial;margin:0;padding:24px;text-align:center}
      .label{border:1px solid #ccc;border-radius:10px;padding:20px;display:inline-block}
      h2{font-size:14px;margin:0 0 16px}
      .row{display:flex;gap:20px;align-items:center;justify-content:center;flex-wrap:wrap}
      .sku{font-family:monospace;font-size:12px;color:#666;margin-top:12px}
      svg{max-width:160px}
      @media print{body{margin:0}}
    </style></head><body>
      <div class="label">
        <h2>${p.name}</h2>
        <div class="row">
          <div>${qrSvg}</div>
          <div>${barcodeSvg}</div>
        </div>
        <div class="sku">SKU: ${code || 'N/A'}</div>
      </div>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`)
    w.document.close()
  }

  if (!code) {
    return (
      <div style={S.card}>
        <div style={{ ...S.title, display: 'flex', alignItems: 'center', gap: 6 }}><QrCode size={12} /> Scan Codes</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Add a SKU to this product to generate a scannable QR code and barcode.</div>
      </div>
    )
  }

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...S.title, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}><QrCode size={12} /> Scan Codes</div>
        <button className="btn btn-ghost btn-sm" onClick={printCodes}><Printer size={12} /> Print</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div ref={qrWrapRef} style={{ padding: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
          <QRCodeSVG value={code} size={110} level="M" />
        </div>
        <svg ref={barcodeRef} style={{ maxWidth: '100%' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 10, fontFamily: 'monospace' }}>{code}</div>
    </div>
  )
}
