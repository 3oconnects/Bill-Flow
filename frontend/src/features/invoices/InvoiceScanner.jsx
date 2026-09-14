import { useState, useEffect, useRef } from 'react'
import { Scan, Upload, Search, X, CheckCircle2, AlertCircle, Eye, Loader2 } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { fmt } from '@/lib/utils'
import { Badge } from '@/components/ui'

const STATUS_COLOR = {
  paid:      { bg: '#d1fae5', color: '#065f46' },
  sent:      { bg: '#dbeafe', color: '#1d4ed8' },
  draft:     { bg: '#f3f4f6', color: '#374151' },
  overdue:   { bg: '#fee2e2', color: '#b91c1c' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
}

function InvoiceResultCard({ invoice, onView }) {
  const sc = STATUS_COLOR[invoice.status] || STATUS_COLOR.draft
  return (
    <div style={{
      border: '1.5px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      {/* Card header accent */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
      <div style={{ padding: '16px 18px' }}>
        {/* Invoice # + Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Invoice Number
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
              {invoice.number}
            </div>
          </div>
          <span style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: sc.bg, color: sc.color,
          }}>
            {invoice.status}
          </span>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
          {[
            { label: 'Customer', value: invoice.customer_name },
            { label: 'Amount', value: fmt.currency(invoice.total, invoice.currency), bold: true, accent: true },
            { label: 'Invoice Date', value: fmt.date(invoice.date) },
            { label: 'Due Date', value: fmt.date(invoice.due_date), warn: invoice.status === 'overdue' },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                {row.label}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: row.bold ? 700 : 500,
                color: row.accent ? '#6366f1' : row.warn ? '#dc2626' : '#111827',
              }}>
                {row.value || '—'}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => onView(invoice.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Eye size={14} /> View Full Invoice →
        </button>
      </div>
    </div>
  )
}

export default function InvoiceScanner({ onClose, invoices = [], onViewInvoice }) {
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [match, setMatch] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const scannerRef = useRef(null)
  const fileInputRef = useRef(null)
  const scannerInstanceRef = useRef(null)

  // Find invoice by number or customer name (case-insensitive)
  const findInvoice = (query) => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return invoices.find(
      (inv) =>
        inv.number?.toLowerCase() === q ||
        inv.number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q)
    ) || null
  }

  const handleSearchSubmit = () => {
    const result = findInvoice(search)
    setMatch(result)
    setNotFound(!result && search.trim().length > 0)
  }

  const handleQRResult = (decodedText) => {
    stopCamera()
    const result = findInvoice(decodedText)
    setSearch(decodedText)
    setMatch(result)
    setNotFound(!result)
  }

  const stopCamera = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().catch(() => {})
      scannerInstanceRef.current = null
    }
    setScanning(false)
  }

  const startCamera = async () => {
    setMatch(null)
    setNotFound(false)
    setCameraError('')
    setScanning(true)
  }

  useEffect(() => {
    if (!scanning) return
    const html5QrCode = new Html5Qrcode('qr-reader')
    scannerInstanceRef.current = html5QrCode
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => handleQRResult(decodedText),
      () => {}
    ).catch((err) => {
      setCameraError('Camera access denied or unavailable.')
      setScanning(false)
    })
    return () => {
      html5QrCode.stop().catch(() => {})
    }
  }, [scanning])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMatch(null)
    setNotFound(false)
    const html5QrCode = new Html5Qrcode('qr-file-reader')
    try {
      const result = await html5QrCode.scanFile(file, false)
      handleQRResult(result)
    } catch {
      setNotFound(true)
    } finally {
      setUploading(false)
      // cleanup hidden element
      html5QrCode.clear()
    }
    e.target.value = ''
  }

  const handleViewInvoice = (id) => {
    if (onClose) onClose()
    if (onViewInvoice) onViewInvoice(id)
  }

  const reset = () => {
    stopCamera()
    setSearch('')
    setMatch(null)
    setNotFound(false)
    setCameraError('')
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 22, alignItems: 'center' }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}>
          <Scan size={22} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>Invoice QR Scanner</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
            Scan, upload, or search to instantly look up any invoice
          </div>
        </div>
      </div>

      {/* Camera Viewport */}
      <div style={{
        width: '100%', borderRadius: 14, marginBottom: 14,
        background: scanning ? '#000' : 'var(--bg-2)',
        border: '1.5px solid var(--border)',
        overflow: 'hidden',
        minHeight: scanning ? 240 : 0,
        transition: 'min-height 0.2s',
      }}>
        {/* html5-qrcode will inject video into this element */}
        <div id="qr-reader" style={{ width: '100%' }} />
        {!scanning && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px', gap: 8,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              <Scan size={26} color="var(--accent, #6366f1)" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Camera Scanner</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
              Point your camera at an invoice QR code to instantly look it up
            </div>
            {cameraError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                <AlertCircle size={14} /> {cameraError}
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ marginTop: 8 }}
              onClick={startCamera}
            >
              <Scan size={14} /> Start Camera Scan
            </button>
          </div>
        )}
        {scanning && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', background: 'rgba(0,0,0,0.7)' }}>
            <button
              onClick={stopCamera}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <X size={14} /> Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Hidden element required by html5-qrcode for file scanning */}
      <div id="qr-file-reader" style={{ display: 'none' }} />

      {/* Upload Button */}
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: '1.5px dashed var(--border)', borderRadius: 10, padding: '12px 0', marginBottom: 20,
          color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
          background: 'var(--bg-2)', cursor: 'pointer', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          {uploading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Reading QR from image…</>
            : <><Upload size={16} /> Upload Invoice QR Image</>
          }
        </div>
      </label>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          or search manually
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-3)', pointerEvents: 'none',
          }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36, fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.03em' }}
            placeholder="e.g. INV-042 or customer name"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setMatch(null); setNotFound(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
          />
        </div>
        <button className="btn btn-primary" style={{ padding: '0 20px' }} onClick={handleSearchSubmit}>
          <Search size={14} /> Search
        </button>
        {(search || match || notFound) && (
          <button className="topbar-icon-btn" onClick={reset} title="Clear">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Result */}
      {match && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#065f46', fontSize: 12, fontWeight: 700 }}>
            <CheckCircle2 size={15} color="#10b981" /> Invoice found!
          </div>
          <InvoiceResultCard invoice={match} onView={handleViewInvoice} />
        </div>
      )}

      {notFound && !match && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: '20px 16px', borderRadius: 10,
          background: '#fff5f5', border: '1.5px solid #fca5a5',
          color: '#b91c1c', fontSize: 13,
        }}>
          <AlertCircle size={20} />
          <div style={{ fontWeight: 700 }}>Invoice not found</div>
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            No invoice matched "{search}". Try the exact invoice number.
          </div>
        </div>
      )}
    </div>
  )
}
