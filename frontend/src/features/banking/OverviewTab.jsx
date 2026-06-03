import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { CustomTooltip } from './BankingShared'

export default function OverviewTab({ chartData, pieData, reconciled, unreconciled, reconPct }) {
  return (
    <div>
      <div className="responsive-grid cols-2-1" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Cash Flow Trend</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Monthly inflow vs outflow</div>
            </div>
          </div>
          <div style={{ padding: '16px 20px 12px' }}>
            {chartData.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                No cash flow data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a8754" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0a8754" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d63d3d" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#d63d3d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#0a8754" fill="url(#inflowGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#d63d3d" fill="url(#outflowGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Payment Channels</div>
          </div>
          <div style={{ padding: '8px 20px 16px' }}>
            {pieData.length === 0 ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                No data
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [fmt.currency(v), n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', fontFamily: 'monospace' }}>
                        {fmt.currency(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Monthly Net Cash Position</div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Positive = surplus, Negative = deficit</div>
          </div>
        </div>
        <div style={{ padding: '16px 20px 12px' }}>
          {chartData.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="net" name="Net Flow" radius={[4, 4, 0, 0]} fill="#1a6be8" label={false}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.net >= 0 ? '#0a8754' : '#d63d3d'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Reconciliation Status</div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px', background: '#e6f5ee', borderRadius: 10 }}>
              <CheckCircle2 size={28} color="#0a8754" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0a8754' }}>{reconciled}</div>
              <div style={{ fontSize: 12, color: '#0a8754', fontWeight: 600 }}>Reconciled</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: '#fef7e7', borderRadius: 10 }}>
              <Clock size={28} color="#c97b10" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: '#c97b10' }}>{unreconciled}</div>
              <div style={{ fontSize: 12, color: '#c97b10', fontWeight: 600 }}>Unmatched</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--c-blue-lt)', borderRadius: 10 }}>
              <AlertCircle size={28} color="var(--c-primary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)' }}>{reconPct}%</div>
              <div style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600 }}>Match Rate</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--c-text2)' }}>
              <span>Reconciliation Progress</span>
              <span style={{ fontWeight: 700 }}>{reconPct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--c-border)', borderRadius: 99 }}>
              <div style={{
                height: '100%', borderRadius: 99, transition: 'width .4s ease',
                width: `${reconPct}%`,
                background: reconPct >= 80 ? '#0a8754' : reconPct >= 50 ? '#c97b10' : '#d63d3d',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
