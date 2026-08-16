import { useQuery } from '@tanstack/react-query'
import { Modal, PageLoading, EmptyState } from '@/components/ui'
import { productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Package, TrendingUp, Calendar, Hash, FileText } from 'lucide-react'

export default function ProductAnalysisModal({ isOpen, onClose, productId, product }) {
  const { data, isLoading } = useQuery({
    queryKey: ['productAnalysis', productId],
    queryFn: () => productsApi.analysis(productId).then(res => res.data),
    enabled: !!productId && isOpen
  })

  if (!isOpen) return null

  const metrics = data?.metrics || { total_sold: 0, total_revenue: 0 }
  const recentSales = data?.recentSales || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Product Analysis: ${product?.name || ''}`} size="lg">
      <div style={{ padding: '0 8px 16px' }}>
        {/* Basic Details */}
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600 }}>SKU</span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{product?.sku || 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600 }}>Category</span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{product?.category || 'N/A'}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{product?.quantity || 0}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', fontWeight: 600 }}>Unit Price</span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{fmt.currency(product?.value / (product?.quantity || 1) || 0)}</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 0' }}><PageLoading /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Sales Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 16, border: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Package size={16} style={{ color: 'var(--c-primary)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>TOTAL SOLD</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{metrics.total_sold}</div>
              </div>
              <div className="card" style={{ padding: 16, border: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp size={16} style={{ color: 'var(--c-success)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>TOTAL REVENUE</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>{fmt.currency(metrics.total_revenue)}</div>
              </div>
            </div>

            {/* Sales Table */}
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Sales</h3>
            {recentSales.length === 0 ? (
              <EmptyState title="No sales found" description="This product hasn't been sold on any invoices yet." icon={<FileText size={32} />} />
            ) : (
              <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="compact" style={{ margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--c-surface)', zIndex: 1 }}>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale, i) => (
                      <tr key={`${sale.invoice_id}-${i}`}>
                        <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={12} />
                            {fmt.date(sale.invoice_date)}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Hash size={12} style={{ color: 'var(--c-text3)' }} />
                            {sale.invoice_number}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{sale.customer_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{sale.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-primary)' }}>{fmt.currency(sale.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
