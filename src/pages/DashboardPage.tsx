import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, FilePlus2, FileText, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { getCases } from '../api'
import { PageHeader, ReadinessRing, StatusPill } from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { demoCase } from '../data/demo'
import type { CaseRecord } from '../types'

export function DashboardPage() {
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<CaseRecord>(demoCase)
  useEffect(() => { getCases().then((cases) => cases[0] && setCaseData(cases[0])) }, [])

  return (
    <div className="page dashboard-page">
      <PageHeader eyebrow="Citizen workspace" title={`Good morning, ${user?.name.split(' ')[0]}.`} copy="Your evidence is organized. Here is the clearest next step." action={<Link className="button button-primary" to="/app/new"><FilePlus2 size={18} /> Start another claim</Link>} />

      <section className="dashboard-grid">
        <article className="card active-case-card">
          <div className="card-heading-row">
            <div><span className="section-label">Active case</span><StatusPill status={caseData.status} /></div>
            <span className="reference">{caseData.reference}</span>
          </div>
          <div className="active-case-main">
            <div className="active-case-copy">
              <p className="claim-type">{caseData.claimType}</p>
              <h2>{caseData.respondentName}</h2>
              <p className="claim-amount"><small>Amount claimed</small>KES {caseData.amount.toLocaleString()}</p>
              <div className="case-meta"><span><MapPin size={15} />{caseData.courtStation}</span><span><Clock3 size={15} />Updated today</span></div>
            </div>
            <ReadinessRing value={caseData.completeness} />
          </div>
          <div className="next-step-panel"><span className="next-step-icon"><Sparkles size={19} /></span><div><small>Your next best action</small><strong>{caseData.nextAction}</strong></div><Link to={`/app/cases/${caseData.id}`} className="button button-light">Open workspace <ArrowRight size={17} /></Link></div>
        </article>

        <article className="card progress-card">
          <div className="card-title"><div><span className="section-label">Case journey</span><h2>Four steps to review</h2></div><span className="step-count">3 of 4</span></div>
          <ol className="journey-list">
            <li className="done"><span><CheckCircle2 /></span><div><strong>Tell your story</strong><small>Completed 14 Jul</small></div></li>
            <li className="done"><span><CheckCircle2 /></span><div><strong>Add evidence</strong><small>4 items verified</small></div></li>
            <li className="done"><span><CheckCircle2 /></span><div><strong>AI evidence review</strong><small>Facts and gaps identified</small></div></li>
            <li className="current"><span>4</span><div><strong>Paralegal review</strong><small>Ready after one missing detail</small></div></li>
          </ol>
        </article>

        <article className="card evidence-summary-card">
          <div className="card-title"><div><span className="section-label">Evidence health</span><h2>Strong foundation</h2></div><strong className="metric-good">4/4</strong></div>
          <div className="evidence-bars">
            <div><span>Agreement</span><i><b style={{ width: '92%' }} /></i><strong>Strong</strong></div>
            <div><span>Payment</span><i><b style={{ width: '100%' }} /></i><strong>Verified</strong></div>
            <div><span>Delivery</span><i><b style={{ width: '88%' }} /></i><strong>Strong</strong></div>
            <div><span>Identity</span><i><b className="attention" style={{ width: '48%' }} /></i><strong className="text-attention">Check</strong></div>
          </div>
          <Link to={`/app/cases/${caseData.id}?tab=evidence`} className="inline-link">Review all evidence <ArrowRight size={16} /></Link>
        </article>

        <article className="card deadline-card">
          <div className="deadline-icon"><CalendarClock /></div>
          <span className="section-label">Next reminder</span><h2>Demand response window</h2>
          <p><strong>24 July 2026</strong><span>6 days remaining</span></p>
          <small>We will send an SMS reminder two days before.</small>
        </article>

        <article className="card privacy-card">
          <span className="privacy-watermark"><ShieldCheck /></span>
          <div className="privacy-icon"><ShieldCheck /></div><span className="section-label">Your data</span><h2>You stay in control.</h2>
          <p>Evidence is used only for this claim. AI drafts never become final without your approval.</p>
          <Link to="/app/security" className="inline-link light-link">See your privacy controls <ArrowRight size={16} /></Link>
        </article>

        <article className="card pack-card">
          <div className="pack-visual"><FileText /></div>
          <div><span className="section-label">Draft action pack</span><h2>Your documents are taking shape</h2><p>Claim summary, demand letter, evidence index, and filing checklist.</p><Link className="inline-link" to={`/app/cases/${caseData.id}?tab=documents`}>Preview pack <ArrowRight size={16} /></Link></div>
        </article>
      </section>
    </div>
  )
}
