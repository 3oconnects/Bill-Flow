import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api'
import { toast } from '@/store/toastStore'
import { PageLoading, Spinner, Badge } from '@/components/ui'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function BillingTab() {
  const { data: sub, isLoading: subLoading, refetch: refetchSub } = useQuery({ queryKey: ['subscription'], queryFn: billingApi.getSubscription })
  const { data: plans, isLoading: plansLoading } = useQuery({ queryKey: ['plans'], queryFn: billingApi.getPlans })
  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ['usage'], queryFn: billingApi.getUsage })

  const [billingCycle, setBillingCycle] = useState('monthly')
  const [changingPlan, setChangingPlan] = useState(false)

  const handleUpgrade = async (planSlug) => {
    try {
      setChangingPlan(true)
      const res = await billingApi.changePlan({ plan_slug: planSlug, billing_cycle: billingCycle })
      if (res.checkout_url) {
        window.location.href = res.checkout_url
      } else {
        toast.success(`Successfully changed to ${res.plan.name} plan`)
        refetchSub()
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change plan')
    } finally {
      setChangingPlan(false)
    }
  }

  const handleOpenPortal = async () => {
    try {
      const res = await billingApi.getPortalUrl()
      if (res.url) {
        window.location.href = res.url
      }
    } catch (err) {
      toast.error(err.message || 'Failed to open billing portal')
    }
  }

  if (subLoading || plansLoading || usageLoading) return <PageLoading />

  return (
    <div>
      {/* Current Plan Overview */}
      <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Current Plan</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{sub?.plan_name}</h2>
              <Badge status={sub?.status === 'active' ? 'active' : sub?.status === 'trialing' ? 'pending' : 'inactive'} />
            </div>
            
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--c-text2)' }}>
              {sub?.status === 'trialing' && sub?.trial_ends_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#eab308' }}>
                  <AlertCircle size={14} /> Trial ends on {new Date(sub.trial_ends_at).toLocaleDateString()}
                </div>
              )}
              {sub?.status === 'active' && sub?.current_period_end && (
                <div>Renews on {new Date(sub.current_period_end).toLocaleDateString()}</div>
              )}
            </div>
          </div>
          
          {sub?.gateway === 'stripe' && (
            <button className="btn btn-secondary" onClick={handleOpenPortal}>
              Manage Billing
            </button>
          )}
        </div>

        {/* Usage Limits */}
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--c-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Current Usage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Invoices this month', current: usage?.invoices?.current || 0, limit: usage?.invoices?.limit },
              { label: 'Team Members', current: usage?.users?.current || 0, limit: usage?.users?.limit },
              { label: 'Customers', current: usage?.customers?.current || 0, limit: usage?.customers?.limit },
              { label: 'Products', current: usage?.products?.current || 0, limit: usage?.products?.limit }
            ].map(item => {
              const limitStr = item.limit === undefined || item.limit === null ? '∞' : item.limit;
              const isNearLimit = typeof item.limit === 'number' && (item.current / item.limit) > 0.8;
              return (
                <div key={item.label} style={{ background: 'var(--c-surface)', padding: 16, borderRadius: 8, border: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isNearLimit ? 'var(--c-danger)' : 'var(--c-text)' }}>
                    {item.current} <span style={{ fontSize: 14, color: 'var(--c-text3)', fontWeight: 500 }}>/ {limitStr}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Upgrade Plan</h3>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', background: 'var(--c-surface2)', borderRadius: 8, padding: 4, border: '1px solid var(--c-border)' }}>
          <button 
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: billingCycle === 'monthly' ? 'var(--c-primary)' : 'transparent', color: billingCycle === 'monthly' ? '#fff' : 'var(--c-text2)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setBillingCycle('monthly')}
          >Monthly</button>
          <button 
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: billingCycle === 'yearly' ? 'var(--c-primary)' : 'transparent', color: billingCycle === 'yearly' ? '#fff' : 'var(--c-text2)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setBillingCycle('yearly')}
          >Yearly (Save 17%)</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {plans?.map(plan => {
          const isCurrentPlan = sub?.plan_slug === plan.slug
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
          const displayPrice = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : plan.price_monthly
          
          return (
            <div key={plan.id} style={{ 
              background: isCurrentPlan ? 'var(--c-surface)' : 'var(--c-surface2)', 
              border: `2px solid ${isCurrentPlan ? 'var(--c-primary)' : 'var(--c-border)'}`, 
              borderRadius: 16, 
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              {isCurrentPlan && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--c-primary)', color: '#fff', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                  Current Plan
                </div>
              )}
              <h4 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>{plan.name}</h4>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 16, minHeight: 40 }}>{plan.description}</div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>${displayPrice}</span>
                <span style={{ fontSize: 14, color: 'var(--c-text3)' }}>/mo</span>
                {billingCycle === 'yearly' && price > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--c-success)', marginLeft: 'auto' }}>Billed ${price}/yr</div>
                )}
              </div>

              <div style={{ flex: 1, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', marginBottom: 12 }}>Includes:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><CheckCircle2 size={16} color="var(--c-success)" /> {plan.max_users || 'Unlimited'} Team members</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><CheckCircle2 size={16} color="var(--c-success)" /> {plan.max_invoices_mo || 'Unlimited'} Invoices / mo</li>
                  {plan.features?.advanced_reports && <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><CheckCircle2 size={16} color="var(--c-success)" /> Advanced Reports</li>}
                  {plan.features?.custom_roles && <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><CheckCircle2 size={16} color="var(--c-success)" /> Custom Roles</li>}
                  {plan.features?.api_access && <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><CheckCircle2 size={16} color="var(--c-success)" /> API Access</li>}
                </ul>
              </div>

              {!isCurrentPlan && (
                <button 
                  className={`btn ${plan.sort_order > (sub?.plan_sort_order || 0) ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={changingPlan}
                  onClick={() => handleUpgrade(plan.slug)}
                >
                  {changingPlan ? <Spinner size={16} /> : plan.sort_order > (sub?.plan_sort_order || 0) ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
