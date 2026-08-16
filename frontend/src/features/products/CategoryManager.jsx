import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { confirmAction } from '@/store/confirmStore'
import { productsApi } from '@/api'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui'

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b']

function CategoryRow({ cat, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface2)' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{cat.name}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="topbar-icon-btn" onClick={() => onEdit(cat)} title="Edit"><Edit2 size={13} /></button>
        <button className="topbar-icon-btn" style={{ color: 'var(--c-danger)' }} onClick={() => onDelete(cat.id)} title="Delete"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

function CategoryForm({ initial, onSave, onCancel }) {
  const [name,  setName]  = useState(initial?.name  || '')
  const [color, setColor] = useState(initial?.color || '#6366f1')
  return (
    <div style={{ padding: '12px 14px', border: '2px solid var(--c-primary)', borderRadius: 8, background: 'var(--c-primary-lt)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          className="form-input sm"
          placeholder="Category name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: 1 }}
          autoFocus
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 22, height: 22, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--c-text)' : '2px solid transparent', cursor: 'pointer',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={13} /> Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), color })}>
          <Check size={13} /> {initial ? 'Update' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function CategoryManager({ onClose }) {
  const qc = useQueryClient()
  const [editing,  setEditing]  = useState(null)
  const [adding,   setAdding]   = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productsApi.getCategories,
  })

  const createMut = useMutation({
    mutationFn: productsApi.createCategory,
    onSuccess: () => { qc.invalidateQueries(['product-categories']); setAdding(false); toast.success('Category created') },
    onError: e => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: ({ catId, data }) => productsApi.updateCategory(catId, data),
    onSuccess: () => { qc.invalidateQueries(['product-categories']); setEditing(null); toast.success('Category updated') },
    onError: e => toast.error(e.message),
  })
  const deleteMut = useMutation({
    mutationFn: productsApi.removeCategory,
    onSuccess: () => { qc.invalidateQueries(['product-categories']); toast.success('Category deleted') },
    onError: e => toast.error(e.message),
  })

  const handleDelete = (catId) => {
    confirmAction('Delete this category?', () => deleteMut.mutate(catId))
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 16, lineHeight: 1.6 }}>
        Manage product categories. Changes apply immediately to the product catalogue.
      </p>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spinner size={24} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {categories.length === 0 && !adding && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--c-text3)', fontSize: 13 }}>
              No custom categories yet. Add one below.
            </div>
          )}
          {categories.map(cat => (
            editing?.id === cat.id ? (
              <CategoryForm
                key={cat.id}
                initial={cat}
                onSave={d => updateMut.mutate({ catId: cat.id, data: d })}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <CategoryRow key={cat.id} cat={cat} onEdit={setEditing} onDelete={handleDelete} />
            )
          ))}
          {adding && (
            <CategoryForm
              onSave={d => createMut.mutate(d)}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>
      )}

      {!adding && !editing && (
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }} onClick={() => setAdding(true)}>
          <Plus size={14} /> Add Category
        </button>
      )}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
