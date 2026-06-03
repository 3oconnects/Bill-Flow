import { PROB_COLOR } from './QuotationsShared'

export function WinScore({ score }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: '#f1f3f5', borderRadius: 99, minWidth: 48 }}>
        <div style={{ width: `${score}%`, height: '100%', background: PROB_COLOR(score), borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: PROB_COLOR(score), minWidth: 28 }}>{score}%</span>
    </div>
  )
}
