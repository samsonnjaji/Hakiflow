import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FileSearch, LockKeyhole, Mic2, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

export function LoginPage() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState<Role | null>(null)

  async function enter(role: Role) {
    setActiveRole(role)
    try {
      await login(role)
      navigate(role === 'paralegal' || role === 'lawyer' ? '/app/review' : '/app')
    } catch {
      setActiveRole(null)
    }
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Logo />
        <div className="landing-nav-right">
          <span className="made-in-kenya"><span /> Built for Kenya</span>
          <button className="text-button" onClick={() => enter('paralegal')}>Legal aid portal</button>
        </div>
      </header>

      <main className="hero-section">
        <section className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> Katiba OS · Justice Engine</div>
          <h1>From scattered evidence<br />to a <em>clear path</em> to justice.</h1>
          <p className="hero-lead">Katiba OS turns voice notes, M-Pesa records, invoices, and chats into an organized small-claims action pack—while keeping people in control.</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" disabled={loading} onClick={() => enter('claimant')}>
              {loading && activeRole === 'claimant' ? <span className="spinner" /> : 'Explore citizen demo'}<ArrowRight size={19} />
            </button>
            <button className="button button-quiet button-large" disabled={loading} onClick={() => enter('lawyer')}>
              {loading && activeRole === 'lawyer' ? <span className="spinner" /> : 'Open lawyer workspace'}
            </button>
          </div>
          {error && <div className="inline-error" role="alert">{error} Please try again after the API is available.</div>}
          <div className="hero-trust-row">
            <span><ShieldCheck size={17} /> Privacy-first controls</span>
            <span><LockKeyhole size={17} /> Human review required</span>
            <span><Check size={17} /> Works offline</span>
          </div>
        </section>

        <section className="hero-demo" aria-label="Katiba OS product preview">
          <div className="demo-window">
            <div className="demo-window-bar"><span /><span /><span /><small>KO-2026-0042 · Evidence workspace</small></div>
            <div className="demo-window-body">
              <div className="demo-case-head">
                <div><small>Outstanding balance</small><strong>KES 86,000</strong><span>MetroBuild Supplies Ltd</span></div>
                <div className="mini-score"><strong>84%</strong><span>case ready</span></div>
              </div>
              <div className="demo-flow">
                <div className="flow-source">
                  <small>Your evidence</small>
                  <div><Mic2 size={17} /><span><strong>Kiswahili voice note</strong><small>Story captured</small></span><Check size={15} /></div>
                  <div><FileSearch size={17} /><span><strong>4 documents</strong><small>Facts extracted</small></span><Check size={15} /></div>
                </div>
                <div className="flow-connector"><span>Katiba AI</span></div>
                <div className="flow-result">
                  <small>Action pack</small>
                  <div className="document-preview">
                    <span className="doc-seal">KO</span>
                    <strong>Claim summary</strong>
                    <i /><i /><i className="short" />
                    <div><ShieldCheck size={14} /> Sources attached</div>
                  </div>
                </div>
              </div>
              <div className="demo-insight"><Sparkles size={17} /><p><strong>One item needs attention</strong><span>Add the respondent’s service address before review.</span></p><ArrowRight size={17} /></div>
            </div>
          </div>
          <div className="floating-proof proof-one"><Check size={16} /><span><strong>Debt acknowledged</strong><small>91% confidence</small></span></div>
          <div className="floating-proof proof-two"><ShieldCheck size={16} /><span><strong>Kenyan law cited</strong><small>Section 12 · SCC Act</small></span></div>
        </section>
      </main>

      <section className="value-strip" aria-label="Product outcomes">
        <div><strong>10 min</strong><span>evidence to first draft</span></div>
        <div><strong>2 languages</strong><span>English and Kiswahili</span></div>
        <div><strong>100%</strong><span>explainable recommendations</span></div>
        <div><strong>Offline-first</strong><span>built for low connectivity</span></div>
      </section>
    </div>
  )
}
