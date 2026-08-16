export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px', minHeight: '100vh', background: 'var(--c-bg)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Terms of Service</h1>
      <p style={{ color: 'var(--c-text2)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>1. Agreement to Terms</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>By accessing or using our services, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
        </section>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>2. Subscription and Billing</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (such as daily, weekly, monthly or annually).</p>
        </section>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3. Fair Use</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>We reserve the right to monitor usage and restrict access if we believe your use violates our fair use policy or exceeds plan limits.</p>
        </section>
      </div>
    </div>
  )
}
