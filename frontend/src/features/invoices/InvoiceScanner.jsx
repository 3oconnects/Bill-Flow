import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scan, Upload, Search, X, FileText, User, Calendar, CheckCircle } from 'lucide-react'
import { invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui'
import jsQR from 'jsqr'

export default function InvoiceScanner({ onClose }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        
        if (code) {
          const detected = code.data.trim()
          toast.info(`QR Detected: ${detected.length > 20 ? detected.substring(0, 20) + '...' : detected}`)
          handleSearch(detected)
        } else {
          setLoading(false)
          toast.error('No QR code detected in the image')
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSearch = async (query) => {
    const q = (query || search || '').toString().trim()
    if (!q) return
    
    setLoading(true)
    setResult(null)
    try {
      const res = await invoicesApi.list()
      const invoices = Array.isArray(res) ? res : (res?.data || [])
      
      const found = invoices.find(inv => {
        const invNum = (inv.number || '').toString().trim().toLowerCase()
        const custId = (inv.customer_id_display || '').toString().trim().toLowerCase()
        const refNo = (inv.reference_number || '').toString().trim().toLowerCase()
        const searchNum = q.toLowerCase()
        
        // Exact match or partial match in any identifying field
        return (
          invNum === searchNum || 
          searchNum.includes(invNum) || 
          (custId && searchNum.includes(custId)) ||
          (refNo && searchNum.includes(refNo)) ||
          invNum.includes(searchNum)
        )
      })
      
      if (found) {
        setResult(found)
        toast.success(`Invoice ${found.number} found!`)
      } else {
        toast.error(`Invoice "${q}" not found in system`)
      }
    } catch (e) {
      toast.error('Search failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scanner-modal">
      <div className="scanner-header" style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
        <div className="scanner-icon-wrap" style={{ width: 44, height: 44, background: 'var(--c-primary-lt)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary)', flexShrink: 0 }}>
          <Scan size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Invoice QR Scanner</div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>Upload a QR image for instant details</div>
        </div>
        <button className="topbar-icon-btn sm" onClick={onClose}><X size={16} /></button>
      </div>

      {!result ? (
        <>
          <div className="scanner-viewport" style={{ width: '100%', aspectRatio: '16/9', background: '#0f172a', borderRadius: 12, marginBottom: 16, position: 'relative', overflow: 'hidden', border: '1px solid var(--c-border)' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', gap: 12 }}>
              <Scan size={48} className="scanner-anim" style={{ opacity: 0.2 }} />
              <div style={{ fontSize: 12, fontWeight: 500 }}>Ready to scan...</div>
            </div>
            <div className="scanner-guide" style={{ position: 'absolute', top: '15%', left: '25%', right: '25%', bottom: '15%', border: '2px dashed rgba(255,255,255,0.3)', borderRadius: 12 }}></div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*" 
            onChange={handleFileUpload} 
          />

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', height: 48, marginBottom: 24, fontSize: 14, fontWeight: 700 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? <Spinner size={18} /> : <><Upload size={18} /> Upload QR Image</>}
          </button>

          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Or manual search</div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} style={{ display: 'flex', gap: 8 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <Search className="search-icon" size={16} />
                <input 
                  className="form-input" 
                  style={{ paddingLeft: 36 }}
                  placeholder="Enter Invoice Number..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={loading}>
                {loading ? <Spinner size={14} /> : 'Find'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="scanner-result" style={{ animation: 'slideUp 0.3s ease' }}>
          <div style={{ background: 'var(--c-surface2)', borderRadius: 12, padding: 20, border: '1px solid var(--c-border)', marginBottom: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', marginBottom: 4 }}>Found Invoice</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{result.number}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 4 }}>Total Amount</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--c-primary)' }}>{fmt.currency(result.total)}</div>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--c-border)' }}>
                    <User size={16} color="var(--c-text3)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 600 }}>Customer</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{result.customer_name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--c-border)' }}>
                    <Calendar size={16} color="var(--c-text3)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 600 }}>Invoice Date</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt.date(result.date)}</div>
                  </div>
                </div>
             </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => {
              navigate(`/invoices/${result.id}`)
              onClose()
            }}>
              <FileText size={16} /> View Full Invoice
            </button>
            <button className="btn btn-secondary" onClick={() => setResult(null)}>
              Scan Another
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scanLine {
          0% { top: 15%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .scanner-guide::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--c-primary);
          box-shadow: 0 0 10px var(--c-primary);
          animation: scanLine 2s ease-in-out infinite;
        }
        .scanner-anim {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.4; }
          100% { transform: scale(1); opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
