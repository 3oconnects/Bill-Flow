import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingApi } from '@/api'
import {
  CheckCircle2, ArrowRight, BarChart3, Receipt, Wallet, 
  ShieldCheck, Zap, Users, Globe, ChevronDown, Check
} from 'lucide-react'

// ── Components ──────────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 2000, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

function Accordion({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className={`landing-faq-item ${isOpen ? 'open' : ''}`}>
      <button className="landing-faq-q" onClick={() => setIsOpen(!isOpen)}>
        {question}
        <ChevronDown size={20} className="landing-faq-icon" />
      </button>
      <div className="landing-faq-a">
        <p>{answer}</p>
      </div>
    </div>
  )
}

// ── Main Landing Page ───────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [plans, setPlans] = useState([])
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    billingApi.getPlans().then(setPlans).catch(() => {
      setPlans([
        { id: 'plan_free', name: 'Starter', slug: 'free', description: 'Perfect for freelancers just starting out.', price_monthly: 0, price_yearly: 0, max_users: 1, max_invoices_mo: 50, features: { invoices: true, payments: true, basic_reports: true } },
        { id: 'plan_pro', name: 'Professional', slug: 'pro', description: 'Everything growing businesses need.', price_monthly: 29, price_yearly: 290, max_users: 5, max_invoices_mo: 500, features: { invoices: true, payments: true, basic_reports: true, advanced_reports: true, recurring_billing: true, banking: true } },
        { id: 'plan_enterprise', name: 'Enterprise', slug: 'enterprise', description: 'Advanced limits and custom workflows.', price_monthly: 99, price_yearly: 990, max_users: 'Unlimited', max_invoices_mo: 'Unlimited', features: { invoices: true, payments: true, basic_reports: true, advanced_reports: true, recurring_billing: true, banking: true, api_access: true, custom_roles: true, priority_support: true } },
      ])
    })
  }, [])

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src="/logo.png?v=2" alt="Ozofi Books Logo" style={{ height: '48px', width: 'auto', transform: 'scale(1.3)', transformOrigin: 'left center', marginRight: '4px' }} />
            <span>Ozofi Books</span>
          </div>
          <div className="landing-nav-links desktop-only">
            <a href="#features">Platform</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="landing-nav-actions">
            <button className="landing-btn-text desktop-only" onClick={() => navigate('/login')}>Sign In</button>
            <button className="landing-btn-primary small" onClick={() => navigate('/login')}>Start Free Trial</button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <header className="landing-hero">
        <div className="landing-hero-container">
          <div className="landing-hero-content">
            <div className="landing-badge animate-fade-up" style={{animationDelay: '0ms'}}>
              <Zap size={14} /> New: Automated GST Returns
            </div>
            <h1 className="animate-fade-up" style={{animationDelay: '100ms'}}>
              Financial Operations,<br/>
              <span className="text-highlight">Simplified for Growth.</span>
            </h1>
            <p className="landing-hero-subtitle animate-fade-up" style={{animationDelay: '200ms'}}>
              Ozofi Books unifies your invoicing, payments, inventory, and accounting into one beautifully crafted platform. Built for modern businesses that demand speed and precision.
            </p>
            <div className="landing-hero-buttons animate-fade-up" style={{animationDelay: '300ms'}}>
              <button className="landing-btn-primary large" onClick={() => navigate('/login')}>
                Get Started Free <ArrowRight size={18} />
              </button>
              <button className="landing-btn-outline large" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore Platform
              </button>
            </div>
            <p className="landing-hero-microcopy animate-fade-up" style={{animationDelay: '400ms'}}>
              <CheckCircle2 size={14} className="text-success" /> No credit card required. 14-day free trial on Pro.
            </p>
          </div>

          {/* Hero App Mockup */}
          <div className="landing-hero-image-wrap animate-fade-up" style={{animationDelay: '500ms'}}>
            <img src="/hero-mockup.png" alt="Ozofi Books Dashboard Mockup" />
          </div>
        </div>

        {/* Trusted By Logos */}
        <div className="landing-trusted">
          <p>Trusted by over 2,000 forward-thinking companies</p>
          <div className="landing-trusted-logos">
            <div className="t-logo"><Globe size={24}/> Acme Corp</div>
            <div className="t-logo"><Zap size={24}/> TechFlow</div>
            <div className="t-logo"><ShieldCheck size={24}/> SecurePay</div>
            <div className="t-logo"><Users size={24}/> TeamSync</div>
            <div className="t-logo"><BarChart3 size={24}/> DataPro</div>
          </div>
        </div>
      </header>

      {/* ── Feature Deep Dives ── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          
          <div className="landing-feature-row">
            <div className="feature-text">
              <div className="feature-icon-wrap"><Receipt size={24} /></div>
              <h2>Lightning-Fast Invoicing</h2>
              <p>Create professional, brandable invoices in seconds. Automatically calculate taxes, apply discounts, and send them directly to your clients via email or SMS.</p>
              <ul className="feature-list">
                <li><Check size={16} className="text-accent" /> GST & Tax compliant ready</li>
                <li><Check size={16} className="text-accent" /> Automated recurring invoices</li>
                <li><Check size={16} className="text-accent" /> Client portal for payments</li>
              </ul>
            </div>
            <div className="feature-visual">
              <div className="v-card float-anim">
                <div className="v-card-header">
                  <div>Invoice #INV-2023-001</div>
                  <div className="v-badge success">Paid</div>
                </div>
                <div className="v-card-body">
                  <div className="v-line"></div>
                  <div className="v-line w-75"></div>
                  <div className="v-total">$4,250.00</div>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-feature-row reverse">
            <div className="feature-text">
              <div className="feature-icon-wrap"><Wallet size={24} /></div>
              <h2>Seamless Payment Tracking</h2>
              <p>Never lose track of a payment again. Reconcile bank transactions automatically and keep your cash flow positive with smart reminders.</p>
              <ul className="feature-list">
                <li><Check size={16} className="text-accent" /> Bank integration & sync</li>
                <li><Check size={16} className="text-accent" /> Multi-currency support</li>
                <li><Check size={16} className="text-accent" /> Auto-matching algorithms</li>
              </ul>
            </div>
            <div className="feature-visual">
              <div className="v-card float-anim-delayed">
                <div className="v-tx-row"><div className="v-tx-icon down"></div><div>Stripe Payout</div><div className="v-tx-amt">+$12,450</div></div>
                <div className="v-tx-row"><div className="v-tx-icon up"></div><div>AWS Hosting</div><div className="v-tx-amt">-$450</div></div>
                <div className="v-tx-row"><div className="v-tx-icon down"></div><div>Wire Transfer</div><div className="v-tx-amt">+$3,200</div></div>
              </div>
            </div>
          </div>

          <div className="landing-feature-row">
            <div className="feature-text">
              <div className="feature-icon-wrap"><BarChart3 size={24} /></div>
              <h2>Real-time Financial Insights</h2>
              <p>Make data-driven decisions with powerful reporting. Generate P&L statements, balance sheets, and tax reports instantly with one click.</p>
              <ul className="feature-list">
                <li><Check size={16} className="text-accent" /> Cash flow forecasting</li>
                <li><Check size={16} className="text-accent" /> Expense categorization</li>
                <li><Check size={16} className="text-accent" /> Export to CSV, PDF & Excel</li>
              </ul>
            </div>
            <div className="feature-visual">
               <div className="v-card grid-bg float-anim">
                  <div className="v-chart-line">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d="M0 30 Q 20 10, 40 20 T 80 10 T 100 5 L 100 40 L 0 40 Z" fill="rgba(37,99,235,0.1)" stroke="var(--lp-accent)" strokeWidth="2"/>
                    </svg>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-section bg-alt" id="pricing">
        <div className="landing-container">
          <div className="section-title text-center">
            <span className="landing-badge">Pricing</span>
            <h2>Simple, transparent pricing</h2>
            <p>Start for free, upgrade when you need more power. No hidden fees.</p>
          </div>
          
          <div className="pricing-toggle">
            <button className={billingCycle === 'monthly' ? 'active' : ''} onClick={() => setBillingCycle('monthly')}>Monthly billing</button>
            <button className={billingCycle === 'yearly' ? 'active' : ''} onClick={() => setBillingCycle('yearly')}>
              Annual billing <span className="save-tag">Save 20%</span>
            </button>
          </div>

          <div className="pricing-grid">
            {plans.map(plan => {
              const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
              const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : plan.price_monthly
              const isPopular = plan.slug === 'pro'
              
              return (
                <div key={plan.id} className={`pricing-card ${isPopular ? 'popular' : ''}`}>
                  {isPopular && <div className="popular-badge">Most Popular</div>}
                  <div className="p-head">
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                    <div className="p-price">
                      <span className="currency">$</span>
                      <span className="amount">{monthlyPrice}</span>
                      <span className="period">/mo</span>
                    </div>
                  </div>
                  <div className="p-limits">
                    <div>Users: <strong>{plan.max_users}</strong></div>
                    <div>Invoices: <strong>{plan.max_invoices_mo}</strong></div>
                  </div>
                  <div className="p-features">
                    {Object.keys(plan.features).map((feat, i) => (
                      <div key={i} className="p-feat-item">
                        <CheckCircle2 size={16} className="text-accent"/> 
                        {feat.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                  <div className="p-footer">
                    <button className={`landing-btn-${isPopular ? 'primary' : 'outline'} block w-full`} onClick={() => navigate('/login')}>
                      {plan.slug === 'free' ? 'Get Started Free' : 'Start 14-Day Trial'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-section" id="faq">
        <div className="landing-container max-w-3xl">
          <div className="section-title text-center">
            <h2>Frequently Asked Questions</h2>
            <p>Got questions? We've got answers.</p>
          </div>
          <div className="faq-list">
            <Accordion 
              question="Can I upgrade or downgrade my plan at any time?" 
              answer="Yes! You can upgrade, downgrade, or cancel your subscription at any time from your billing settings. Prorated credits will be applied automatically." 
            />
            <Accordion 
              question="Do I need a credit card to sign up for the free trial?" 
              answer="No, you don't need a credit card to sign up. You can fully test the platform on the Free plan or start a 14-day trial of the Pro plan risk-free." 
            />
            <Accordion 
              question="Is my financial data secure?" 
              answer="Absolutely. We use enterprise-grade 256-bit AES encryption for all data at rest and in transit. We are fully compliant with industry standards and perform regular security audits." 
            />
            <Accordion 
              question="Can I invite my accountant to Ozofi Books?" 
              answer="Yes! All paid plans allow you to invite team members with custom roles. You can easily invite your accountant and restrict their access to financial reports only." 
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-cta-section">
        <div className="landing-container text-center">
          <h2>Ready to revolutionize your finances?</h2>
          <p>Join thousands of businesses already scaling faster with Ozofi Books.</p>
          <button className="landing-btn-primary large white" onClick={() => navigate('/login')}>
            Start your free trial today
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="f-brand">
              <img src="/logo.png?v=2" alt="Ozofi Books Logo" style={{ height: '40px', width: 'auto', marginBottom: '1rem', transform: 'scale(1.3)', transformOrigin: 'left center' }} />
              <p>The operating system for modern business finance.</p>
            </div>
            <div className="f-links">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#changelog">Changelog</a>
            </div>
            <div className="f-links">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="f-links">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Ozofi Books Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
