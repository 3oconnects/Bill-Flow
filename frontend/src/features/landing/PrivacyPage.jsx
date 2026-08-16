export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px', minHeight: '100vh', background: 'var(--c-bg)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--c-text2)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>1. Information We Collect</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
        </section>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>2. How We Use Your Information</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>We may use the information we collect from you to provide, maintain, and improve our Services, process transactions, and send you related information.</p>
        </section>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3. Security</h2>
          <p style={{ color: 'var(--c-text)', lineHeight: 1.6 }}>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
        </section>
      </div>
    </div>
  )
}
