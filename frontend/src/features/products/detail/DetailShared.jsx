import { Info, DollarSign, Shield, Truck, History, ReceiptText, Tag } from 'lucide-react'

export const S = {
  card: { background: 'var(--bg-1,#fff)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 },
  title: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },
  row: (last) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border)', fontSize: 13 }),
  lbl: { fontSize: 12, color: 'var(--text-2)' },
  val: { fontWeight: 600, fontSize: 13 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 20px', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 12 },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' },
  td: { padding: '10px 14px', fontSize: 13 },
}

export const TABS = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'warranty', label: 'Warranty', icon: Shield },
  { id: 'vendors', label: 'Vendors', icon: Truck },
  { id: 'stock-history', label: 'Stock History', icon: History },
  { id: 'sales', label: 'Sales', icon: ReceiptText },
  { id: 'price-lists', label: 'Price Lists', icon: Tag },
]

export const WIDE = ['vendors', 'stock-history', 'sales', 'price-lists']
