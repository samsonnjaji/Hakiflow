import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Filter, Search, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { getStats } from '../api'
import { PageHeader, ReadinessRing, StatusPill } from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import type { DashboardStats } from '../types'
import { demoStats } from '../data/demo'

const queue = [
  { id: 'case-amina', ref: 'KO-2026-0042', person: 'Amina Wanjiku', initials: 'AW', type: 'Unpaid goods supplied', amount: 86000, readiness: 84, status: 'ready_review', updated: '8 min ago', flag: '1 missing detail' },
  { id: 'case-joseph', ref: 'KO-2026-0041', person: 'Joseph Otieno', initials: 'JO', type: 'Money lent and unpaid', amount: 45000, readiness: 92, status: 'ready_review', updated: '32 min ago', flag: 'Complete' },
  { id: 'case-fatuma', ref: 'KO-2026-0039', person: 'Fatuma Ali', initials: 'FA', type: 'Damaged movable property', amount: 128000, readiness: 66, status: 'needs_evidence', updated: '2 hrs ago', flag: 'Receipt missing' },
  { id: 'case-peter', ref: 'KO-2026-0037', person: 'Peter Mwangi', initials: 'PM', type: 'Unpaid services', amount: 210000, readiness: 73, status: 'needs_evidence', updated: 'Yesterday', flag: 'Identity check' },
]

export function ParalegalPage() {
  const { user } = useAuth()
  const isLawyer = user?.role === 'lawyer'
  const [stats, setStats] = useState<DashboardStats>(demoStats)
  const [query, setQuery] = useState('')
  useEffect(() => { getStats().then(setStats) }, [])
  const filtered = queue.filter((item) => `${item.person} ${item.ref} ${item.type}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="page review-page">
    <PageHeader eyebrow={isLawyer ? 'Advocate workspace' : 'Legal aid workspace'} title={isLawyer ? 'Client matter review' : 'Review queue'} copy="AI organizes the record. You make the professional judgment." action={<button className="button button-primary"><UsersRound size={18} /> {isLawyer ? 'Assign counsel' : 'Assign reviewer'}</button>} />
    <section className="review-stats">
      <article className="card"><span className="stat-icon green"><CheckCircle2 /></span><div><small>{isLawyer ? 'Awaiting counsel' : 'Ready for review'}</small><strong>{stats.readyForReview}</strong><span>2 added today</span></div></article>
      <article className="card"><span className="stat-icon amber"><Clock3 /></span><div><small>Needs evidence</small><strong>5</strong><span>Average age 1.8 days</span></div></article>
      <article className="card"><span className="stat-icon blue"><Sparkles /></span><div><small>Average readiness</small><strong>{stats.averageReadiness}%</strong><span>+7% this week</span></div></article>
      <article className="card"><span className="stat-icon slate"><ShieldCheck /></span><div><small>Privacy exceptions</small><strong>0</strong><span>All controls healthy</span></div></article>
    </section>

    <section className="card queue-card">
      <div className="queue-tools"><div><span className="section-label">Cases requiring attention</span><h2>{filtered.length} cases in queue</h2></div><div className="queue-search"><label><Search /><span className="visually-hidden">Search cases</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or reference" /></label><button className="button button-light"><Filter size={16} /> Filter</button></div></div>
      <div className="queue-table" role="table" aria-label="Case review queue">
        <div className="queue-row queue-head" role="row"><span>Claimant</span><span>Claim</span><span>Amount</span><span>Readiness</span><span>Status</span><span>Updated</span><span /></div>
        {filtered.map((item) => <Link to={`/app/cases/${item.id}`} className="queue-row" role="row" key={item.id}>
          <span className="queue-person"><i className="avatar">{item.initials}</i><span><strong>{item.person}</strong><small>{item.ref}</small></span></span>
          <span><strong>{item.type}</strong><small className={item.flag === 'Complete' ? 'flag-good' : 'flag-attention'}>{item.flag === 'Complete' ? <CheckCircle2 /> : <AlertCircle />}{item.flag}</small></span>
          <span className="number-cell">KES {item.amount.toLocaleString()}</span>
          <span><ReadinessRing value={item.readiness} size="small" /></span>
          <span><StatusPill status={item.status} /></span><span>{item.updated}</span><span><ArrowRight /></span>
        </Link>)}
      </div>
      {!filtered.length && <div className="empty-state"><Search /><h3>No cases match that search</h3><p>Try a claimant name, reference, or claim type.</p></div>}
    </section>

    <section className="review-lower-grid"><article className="card workload-card"><div className="card-title"><div><span className="section-label">Today’s workload</span><h2>{isLawyer ? 'Matter capacity' : 'Review capacity'}</h2></div><span className="metric-good">72%</span></div><div className="capacity-bar"><i style={{ width: '72%' }} /></div><div><span><i className="dot green" />4 reviewed</span><span><i className="dot amber" />4 waiting</span><span><i className="dot gray" />3 slots open</span></div></article><article className="card quality-card"><span><ShieldCheck /></span><div><span className="section-label">Professional guardrail</span><h2>{isLawyer ? 'Privilege and sign-off remain human.' : 'AI never closes a case.'}</h2><p>{isLawyer ? 'Counsel controls strategy, privileged notes, client communication, and every final legal position.' : 'Every generated document remains a draft until a named human reviewer records a decision.'}</p></div></article></section>
  </div>
}
