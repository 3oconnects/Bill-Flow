import { useRef, useState } from 'react'
import { Upload, X, ImageIcon, Link } from 'lucide-react'

const MAX_BYTES = 1.5 * 1024 * 1024

export default function ImageUploader({ value, onChange }) {
  const [mode, setMode]   = useState(value?.startsWith('data:') ? 'file' : value ? 'url' : 'idle')
  const [drag, setDrag]   = useState(false)
  const [err,  setErr]    = useState('')
  const fileRef           = useRef()

  const clear = () => { onChange(''); setMode('idle'); setErr('') }

  const processFile = (file) => {
    setErr('')
    if (!file.type.startsWith('image/')) return setErr('Please select an image file (jpg, png, webp).')
    if (file.size > MAX_BYTES) return setErr('Image must be under 1.5 MB.')
    const reader = new FileReader()
    reader.onload = e => { onChange(e.target.result); setMode('file') }
    reader.readAsDataURL(file)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // If we already have a value, show preview
  if (value) return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 80, height: 80, borderRadius: 8, border: '1px solid var(--c-border)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)' }}>
        <img src={value} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => { setErr('URL failed to load.') }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
          {mode === 'file' ? '📎 Local file (saved on submit)' : '🔗 Image URL'}
        </div>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)', gap: 4 }} onClick={clear}>
          <X size={12} /> Remove
        </button>
        {err && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{err}</div>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${drag ? 'var(--accent)' : 'var(--c-border)'}`,
          borderRadius: 10, padding: '20px 16px', textAlign: 'center',
          cursor: 'pointer', background: drag ? 'var(--accent-light,#eef2ff)' : 'var(--bg-2)',
          transition: 'all .15s', marginBottom: 8,
        }}>
        <ImageIcon size={22} color={drag ? 'var(--accent)' : 'var(--text-3)'} style={{ margin: '0 auto 6px', display: 'block' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: drag ? 'var(--accent)' : 'var(--text-2)' }}>
          {drag ? 'Drop to upload' : 'Click or drag image here'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>JPG, PNG, WEBP — max 1.5 MB</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
      </div>

      {/* URL option */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--c-border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>or paste URL</span>
        <div style={{ flex: 1, height: 1, background: 'var(--c-border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input className="form-input sm" placeholder="https://example.com/image.jpg"
          style={{ flex: 1 }}
          onBlur={e => { if (e.target.value) { onChange(e.target.value); setMode('url') } }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (e.target.value) { onChange(e.target.value); setMode('url') } } }} />
      </div>

      {err && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{err}</div>}
    </div>
  )
}
