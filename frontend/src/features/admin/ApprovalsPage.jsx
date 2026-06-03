import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Search, Plus, Edit2, Trash2, Eye, CheckCircle, AlertCircle, GitBranch, X } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import Modal from '@/components/Modal'

const WORKFLOW_STATUS = {
  active: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Active' },
  inactive: { bg: 'var(--c-border)', color: 'var(--c-text3)', label: 'Inactive' },
  paused: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Paused' },
}

const DOCUMENT_TYPES = {
  invoice: { label: 'Invoice', color: 'var(--c-info)' },
  expense: { label: 'Expense', color: 'var(--c-warning)' },
  purchase: { label: 'Purchase', color: 'var(--c-success)' },
}

// ── View Workflow Modal ────────────────────────────────────────────────
function ViewWorkflowModal({ workflow, onClose }) {
  return (
    <Modal title="View Workflow" onClose={onClose} size="sm">
      <div style={{ width: '100%', fontSize: 13 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 4 }}>Workflow Name</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{workflow.name}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
            <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{workflow.docType}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 4 }}>Threshold</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>₹{(workflow.amountThreshold / 1000).toFixed(0)}K</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 8 }}>Approval Chain</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '10px', background: 'var(--c-surface2)', borderRadius: 6 }}>
            {workflow.approvers.map((approver, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--c-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', maxWidth: 60, color: 'var(--c-text)', lineHeight: 1.2 }}>{approver}</div>
                </div>
                {idx < workflow.approvers.length - 1 && (
                  <div style={{ fontSize: 18, color: 'var(--c-text3)', margin: '0 4px', marginBottom: 10 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit Workflow Modal ────────────────────────────────────────────────
function EditWorkflowModal({ workflow, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: workflow.name,
    docType: workflow.docType,
    amountThreshold: workflow.amountThreshold.toString(),
    levels: workflow.approvers.map((approver, idx) => ({ id: idx + 1, approver, department: '' })),
  })
  const [submitting, setSubmitting] = useState(false)

  const handleLevelChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map(l => l.id === id ? { ...l, [field]: value } : l)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.levels.some(l => !l.approver.trim())) {
      alert('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    onSuccess(formData)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal title="Edit Workflow" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Name *</label>
            <input
              className="form-input"
              type="text"
              style={{ fontSize: 12, height: 32 }}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Type</label>
              <select className="form-select" style={{ fontSize: 12, height: 32 }} value={formData.docType} onChange={(e) => setFormData(prev => ({ ...prev, docType: e.target.value }))}>
                <option value="invoice">Invoice</option>
                <option value="expense">Expense</option>
                <option value="purchase">Purchase</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Threshold</label>
              <input className="form-input" type="number" style={{ fontSize: 12, height: 32 }} value={formData.amountThreshold} onChange={(e) => setFormData(prev => ({ ...prev, amountThreshold: e.target.value }))} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 6 }}>Approvers</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {formData.levels.map((level, idx) => (
              <div key={level.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--c-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                  {idx + 1}
                </div>
                <input className="form-input" type="text" placeholder="Approver" style={{ margin: 0, fontSize: 12, height: 32 }} value={level.approver} onChange={(e) => handleLevelChange(level.id, 'approver', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Workflow Modal ──────────────────────────────────────────────
function CreateWorkflowModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    docType: 'invoice',
    amountThreshold: '',
    levels: [{ id: 1, approver: '', department: '' }],
  })
  const [submitting, setSubmitting] = useState(false)

  const handleLevelChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map(l => l.id === id ? { ...l, [field]: value } : l)
    }))
  }

  const addLevel = () => {
    const newId = Math.max(...formData.levels.map(l => l.id), 0) + 1
    setFormData(prev => ({
      ...prev,
      levels: [...prev.levels, { id: newId, approver: '', department: '' }]
    }))
  }

  const removeLevel = (id) => {
    if (formData.levels.length > 1) {
      setFormData(prev => ({
        ...prev,
        levels: prev.levels.filter(l => l.id !== id)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.levels.some(l => !l.approver.trim())) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    onSuccess(formData)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal title="New Workflow" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label className="form-label" style={{ fontSize: 12 }}>Name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="Invoice Approval"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            style={{ fontSize: 12, height: 32 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Type *</label>
            <select
              className="form-select"
              value={formData.docType}
              onChange={(e) => setFormData(prev => ({ ...prev, docType: e.target.value }))}
              style={{ fontSize: 12, height: 32 }}
            >
              <option value="invoice">Invoice</option>
              <option value="expense">Expense</option>
              <option value="purchase">Purchase</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Threshold (₹)</label>
            <input
              className="form-input"
              type="number"
              placeholder="50000"
              value={formData.amountThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, amountThreshold: e.target.value }))}
              style={{ fontSize: 12, height: 32 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase' }}>Levels *</label>
            <button
              type="button"
              onClick={addLevel}
              className="btn btn-ghost"
              style={{ padding: '2px 6px', fontSize: 11 }}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {formData.levels.map((level, idx) => (
              <div key={level.id} style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  background: 'var(--c-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                <input
                  className="form-input"
                  type="text"
                  placeholder="Approver"
                  value={level.approver}
                  onChange={(e) => handleLevelChange(level.id, 'approver', e.target.value)}
                  style={{ margin: 0, height: 30, fontSize: 12 }}
                />

                {formData.levels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLevel(level.id)}
                    className="btn btn-ghost"
                    style={{ padding: '2px 4px', color: 'var(--c-red)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '6px 12px', fontSize: 12 }}>{submitting ? 'Creating...' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  )
}

const MOCK_WORKFLOWS = [
  {
    id: 1,
    name: 'Standard Invoice Approval',
    docType: 'invoice',
    status: 'active',
    levels: 3,
    approvers: ['Finance Manager', 'Director', 'CFO'],
    createdDate: '2024-01-15',
    amountThreshold: 50000,
    activeCount: 24,
  },
  {
    id: 2,
    name: 'Expense Report Approval',
    docType: 'expense',
    status: 'active',
    levels: 2,
    approvers: ['Manager', 'Finance Team'],
    createdDate: '2024-02-10',
    amountThreshold: 10000,
    activeCount: 15,
  },
  {
    id: 3,
    name: 'Purchase Order - High Value',
    docType: 'purchase',
    status: 'active',
    levels: 4,
    approvers: ['Procurement', 'Manager', 'Director', 'CFO'],
    createdDate: '2024-01-20',
    amountThreshold: 100000,
    activeCount: 8,
  },
  {
    id: 4,
    name: 'Quick Expense Approval',
    docType: 'expense',
    status: 'inactive',
    levels: 1,
    approvers: ['Finance Manager'],
    createdDate: '2024-03-05',
    amountThreshold: 5000,
    activeCount: 0,
  },
]

export default function ApprovalsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocType, setSelectedDocType] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(null)

  const handleCreateWorkflow = (formData) => {
    const newWorkflow = {
      id: Math.max(...workflows.map(w => w.id), 0) + 1,
      name: formData.name,
      docType: formData.docType,
      status: 'active',
      levels: formData.levels.length,
      approvers: formData.levels.map(l => l.approver),
      createdDate: new Date().toISOString().split('T')[0],
      amountThreshold: parseInt(formData.amountThreshold) || 0,
      activeCount: 0,
    }
    setWorkflows([newWorkflow, ...workflows])
  }

  const handleEditWorkflow = (formData) => {
    setWorkflows(workflows.map(w => w.id === editModalOpen.id ? {
      ...w,
      name: formData.name,
      docType: formData.docType,
      levels: formData.levels.length,
      approvers: formData.levels.map(l => l.approver),
      amountThreshold: parseInt(formData.amountThreshold) || 0,
    } : w))
    setEditModalOpen(null)
  }

  useEffect(() => {
    setContext('Administration', 'Approval Workflows')
    setActions(
      <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
        <Plus size={15} /> Create Workflow
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredWorkflows = workflows.filter(wf => {
    const matchesSearch = wf.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDocType = selectedDocType === 'all' || wf.docType === selectedDocType
    return matchesSearch && matchesDocType
  })

  const activeWorkflows = workflows.filter(w => w.status === 'active').length
  const totalPendingApprovals = workflows.reduce((sum, w) => sum + w.activeCount, 0)
  const avgApprovalLevels = Math.round(
    workflows.reduce((sum, w) => sum + w.levels, 0) / workflows.length
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Approval Workflows</h1>
          <p>Set up multi-level approval rules for invoices, expenses and purchases.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Workflows</span>
            <GitBranch size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text)' }}>
            {workflows.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>configured workflows</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Workflows</span>
            <CheckCircle size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>
            {activeWorkflows}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>currently enabled</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Approvals</span>
            <AlertCircle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {totalPendingApprovals}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>awaiting review</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Avg. Levels</span>
            <GitBranch size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-info)' }}>
            {avgApprovalLevels}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>approval levels</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 160 }}
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="invoice">Invoices</option>
          <option value="expense">Expenses</option>
          <option value="purchase">Purchases</option>
        </select>
      </div>

      {/* Workflows Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredWorkflows.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<GitBranch size={48} />}
              title="No approval workflows found"
              description={searchTerm || selectedDocType !== 'all'
                ? "Try adjusting your filters or search terms."
                : "Create your first approval workflow to get started."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>WORKFLOW NAME</th>
                  <th style={{ textAlign: 'center' }}>TYPE</th>
                  <th style={{ textAlign: 'center' }}>LEVELS</th>
                  <th>ASSIGNED TO</th>
                  <th style={{ textAlign: 'center' }}>THRESHOLD</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 100, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map(workflow => {
                  const StatusBadge = WORKFLOW_STATUS[workflow.status]
                  const DocType = DOCUMENT_TYPES[workflow.docType]
                  return (
                    <tr key={workflow.id}>
                      <td style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === workflow.id ? null : workflow.id)}>
                        <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>
                          {expandedId === workflow.id ? '▼' : '▶'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{workflow.name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: `${DocType.color}15`,
                          color: DocType.color,
                        }}>
                          {DocType.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                        {workflow.levels}
                      </td>
                      <td style={{ color: 'var(--c-text2)', fontSize: 12 }}>
                        {workflow.approvers.length} approver{workflow.approvers.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        ₹{(workflow.amountThreshold / 1000).toFixed(0)}K+
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: StatusBadge.bg,
                            color: StatusBadge.color,
                          }}
                        >
                          {StatusBadge.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            style={{
                              padding: '6px 8px',
                              background: 'var(--c-info-lt)',
                              color: 'var(--c-info)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => setViewModalOpen(workflow)}
                            title="View details"
                            onMouseOver={(e) => {
                              e.target.style.background = 'var(--c-info)'
                              e.target.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'var(--c-info-lt)'
                              e.target.style.color = 'var(--c-info)'
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            style={{
                              padding: '6px 8px',
                              background: 'var(--c-primary-lt)',
                              color: 'var(--c-primary)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => setEditModalOpen(workflow)}
                            title="Edit workflow"
                            onMouseOver={(e) => {
                              e.target.style.background = 'var(--c-primary)'
                              e.target.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'var(--c-primary-lt)'
                              e.target.style.color = 'var(--c-primary)'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          {workflow.status === 'inactive' && (
                            <button
                              style={{
                                padding: '6px 8px',
                                background: 'var(--c-red-lt)',
                                color: 'var(--c-red)',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                              onClick={() => alert('Delete workflow: ' + workflow.name)}
                              title="Delete workflow"
                              onMouseOver={(e) => {
                                e.target.style.background = 'var(--c-red)'
                                e.target.style.color = 'white'
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'var(--c-red-lt)'
                                e.target.style.color = 'var(--c-red)'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable Row Details */}
      {expandedId && (
        <div className="card" style={{ marginTop: 16, padding: 20, background: 'var(--c-surface2)' }}>
          {filteredWorkflows.find(w => w.id === expandedId) && (() => {
            const wf = filteredWorkflows.find(w => w.id === expandedId)
            return (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--c-border)', paddingBottom: 12 }}>
                  Approval Chain
                </h4>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {wf.approvers.map((approver, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: 'var(--c-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{approver}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Level {idx + 1}</div>
                      </div>
                      {idx < wf.approvers.length - 1 && (
                        <div style={{ fontSize: 18, color: 'var(--c-text3)', margin: '0 8px' }}>→</div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Created Date</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(wf.createdDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Active Documents</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{wf.activeCount} pending</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Amount Threshold</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>₹{(wf.amountThreshold / 100000).toFixed(1)}L+</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Create Workflow Modal */}
      {createModalOpen && (
        <CreateWorkflowModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(formData) => {
            handleCreateWorkflow(formData)
          }}
        />
      )}

      {/* View Workflow Modal */}
      {viewModalOpen && (
        <ViewWorkflowModal
          workflow={viewModalOpen}
          onClose={() => setViewModalOpen(null)}
        />
      )}

      {/* Edit Workflow Modal */}
      {editModalOpen && (
        <EditWorkflowModal
          workflow={editModalOpen}
          onClose={() => setEditModalOpen(null)}
          onSuccess={(formData) => {
            handleEditWorkflow(formData)
          }}
        />
      )}
    </div>
  )
}
