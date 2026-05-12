import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, AlertCircle, CheckCircle, Download, X } from 'lucide-react'
import { productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui'

const TEMPLATE_CSV = 'Product Name*,SKU,Brand,Category,Selling Price*,Purchase Price,Stock Quantity,GST Rate,Unit,Description\nSample Product,SKU-001,BrandX,general,1000,800,10,18,pcs,Sample description'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'product_template.csv'
  a.click()
}

function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.trim())
  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace('*', '').replace(/ /g, '_'))
  return lines.slice(1).map((line) => {
    const vals = line.split(',')
    const obj = {}
    rawHeaders.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
    return obj
  })
}

function normalizeRow(raw, idx) {
  const get = (...keys) => { for (const k of keys) { if (raw[k] !== undefined && raw[k] !== '') return String(raw[k]).trim() } return '' }
  const name = get('product_name', 'name')
  const unit_price = get('selling_price', 'price', 'unit_price')
  const errors = []
  if (!name) errors.push('Name required')
  if (!unit_price || isNaN(parseFloat(unit_price))) errors.push('Selling price invalid')
  return {
    _idx: idx, _errors: errors,
    name,
    sku: get('sku', 'code'),
    brand: get('brand'),
    category: get('category') || 'general',
    unit_price: parseFloat(unit_price) || 0,
    purchase_price: parseFloat(get('purchase_price', 'purchase price')) || 0,
    stock_qty: parseFloat(get('stock_quantity', 'stock')) || 0,
    tax_rate: parseFloat(get('gst_rate', 'gst rate')) || 18,
    unit: get('unit') || 'pcs',
    description: get('description') || '',
  }
}

export default function BulkUpload({ onClose, onDone }) {
  const qc = useQueryClient()
  const [step, setStep] = useState('upload') // upload | preview | done
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const mutation = useMutation({
    mutationFn: (products) => productsApi.bulk(products),
    onSuccess: (res) => {
      setResult(res)
      setStep('done')
      qc.invalidateQueries(['products'])
      toast.success(`${res.succeeded || rows.filter((_, i) => !errors[i]?.length).length} products uploaded`)
    },
    onError: (e) => toast.error(e.message),
  })

  const processFile = useCallback(async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { toast.error('Only CSV or Excel files are supported'); return }
    try {
      let parsed = []
      if (ext === 'csv') {
        parsed = parseCSV(await file.text())
      } else {
        // Dynamically load SheetJS for xlsx
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
            s.onload = resolve; s.onerror = reject
            document.head.appendChild(s)
          })
        }
        const data = await file.arrayBuffer()
        const wb = window.XLSX.read(data)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = window.XLSX.utils.sheet_to_json(ws, { defval: '' })
        parsed = json.map((r) => {
          const out = {}
          Object.keys(r).forEach((k) => { out[k.toLowerCase().trim().replace(/ /g, '_')] = String(r[k]).trim() })
          return out
        })
      }
      if (!parsed.length) { toast.error('No rows found in file'); return }
      const normalized = parsed.map((r, i) => normalizeRow(r, i))
      setRows(normalized)
      setErrors(normalized.map((r) => r._errors))
      setStep('preview')
    } catch (e) { toast.error(`Parse error: ${e.message}`) }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    processFile(e.dataTransfer?.files?.[0])
  }

  const validRows = rows.filter((_, i) => !errors[i]?.length)
  const invalidCount = rows.length - validRows.length

  return (
    <div>
      {/* Step: Upload */}
      {step === 'upload' && (
        <div>
          {/* Template download */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Download Sample Template</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Fill in your product data using this CSV template. Fields marked * are required.</div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={downloadTemplate}>
              <Download size={13} /> CSV Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 14, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-2)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Drag & drop your file here</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>or click to browse — CSV or Excel (.xlsx)</div>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => processFile(e.target.files?.[0])} />
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Valid rows</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{validRows.length}</div>
            </div>
            {invalidCount > 0 && (
              <div style={{ flex: 1, padding: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Rows with errors</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{invalidCount}</div>
              </div>
            )}
            <div style={{ flex: 1, padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total rows</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{rows.length}</div>
            </div>
          </div>

          {invalidCount > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: '#d97706' }}>
              <AlertCircle size={14} /> {invalidCount} rows have errors and will be skipped. Only {validRows.length} valid rows will be uploaded.
            </div>
          )}

          {/* Preview table */}
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1 }}>
                <tr>
                  {['#', 'Name', 'SKU', 'Selling Price', 'Stock', 'Category', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const errs = errors[i] || []
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: errs.length ? 'rgba(239,68,68,0.06)' : undefined }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-3)' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.name || <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>missing</span>}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-2)' }}>{r.sku || '—'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.unit_price > 0 ? fmt.currency(r.unit_price) : <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>invalid</span>}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{r.stock_qty}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{r.category}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {errs.length ? (
                          <span style={{ color: 'var(--red)', fontSize: 11 }}><AlertCircle size={11} style={{ display: 'inline', marginRight: 3 }} />{errs.join(', ')}</span>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 11 }}><CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => { setRows([]); setErrors([]); setStep('upload') }}>
              ← Re-upload
            </button>
            <button className="btn btn-primary" disabled={!validRows.length || mutation.isPending} onClick={() => mutation.mutate(validRows)}>
              {mutation.isPending ? <Spinner size={14} /> : `Upload ${validRows.length} Products`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Upload Complete</div>
          <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
            {result?.succeeded || validRows.length} products added to inventory successfully.
            {result?.failed > 0 && ` ${result.failed} skipped due to errors.`}
          </div>
          <button className="btn btn-primary" onClick={onDone}>View Products</button>
        </div>
      )}
    </div>
  )
}
