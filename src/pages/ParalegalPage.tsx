import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Filter, Search, ShieldCheck, Sparkles, UserCheck, UsersRound } from 'lucide-react'
import { getStats } from '../api'
import { PageHeader, ReadinessRing, StatusPill } from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import type { CaseStatus, DashboardStats } from '../types'
import { demoStats } from '../data/demo'

const queue = [
  { id: 'case-amina', ref: 'KO-2026-0042', person: 'Amina Wanjiku', initials: 'AW', type: 'Unpaid goods supplied', amount: 86000, readiness: 84, status: 'ready_review', updated: '8 min ago', flag: '1 missing detail' },
  { id: 'case-joseph', ref: 'KO-2026-0041', person: 'Joseph Otieno', initials: 'JO', type: 'Money lent and unpaid', amount: 45000, readiness: 92, status: 'ready_review', updated: '32 min ago', flag: 'Complete' },
  { id: 'case-fatuma', ref: 'KO-2026-0039', person: 'Fatuma Ali', initials: 'FA', type: 'Damaged movable property', amount: 128000, readiness: 66, status: 'needs_evidence', updated: '2 hrs ago', flag: 'Receipt missing' },
  { id: 'case-peter', ref: 'KO-2026-0037', person: 'Peter Mwangi', initials: 'PM', type: 'Unpaid services', amount: 210000, readiness: 73, status: 'needs_evidence', updated: 'Yesterday', flag: 'Identity check' },
]

const statusFilters: Array<{ value: CaseStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'ready_review', label: 'Ready for review' },
  { value: 'needs_evidence', label: 'Needs evidence' },
]

function loadAssignments(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('katiba_os_assignments') ?? '{}') as Record<string, string> } catch { return {} }
}

export function ParalegalPage() {
  const { user } = useAuth()
  const isLawyer = user?.role === 'lawyer'
  const [stats, setStats] = useState<DashboardStats>(demoStats)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, string>>(loadAssignments)
  const filterRef = useRef<HTMLDivElement>(null)
  const assignRef = useRef<HTMLDivElement>(null)
  useEffect(() => { getStats().then(setStats) }, [])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false)
      if (assignOpen && assignRef.current && !assignRef.current.contains(event.target as Node)) setAssignOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [filterOpen, assignOpen])

  function assignToCase(caseId: string) {
    const next = { ...assignments, [caseId]: user?.name ?? 'You' }
    setAssignments(next)
    localStorage.setItem('katiba_os_assignments', JSON.stringify(next))
    setAssignOpen(false)
  }

  const filtered = queue
    .filter((item) => `${item.person} ${item.ref} ${item.type}`.toLowerCase().includes(query.toLowerCase()))
    .filter((item) => statusFilter === 'all' || item.status === statusFilter)
  const unassigned = queue.filter((item) => !assignments[item.id])

  return <div className="page review-page">
    <PageHeader eyebrow={isLawyer ? 'Advocate workspace' : 'Legal aid workspace'} title={isLawyer ? 'Client matter review' : 'Review queue'} copy="AI organizes the record. You make the professional judgment." action={
      <div className="account-menu" ref={assignRef}>
        <button type="button" className="button button-primary" aria-haspopup="menu" aria-expanded={assignOpen} onClick={() => setAssignOpen((value) => !value)}><UsersRound size={18} /> {isLawyer ? 'Assign counsel' : 'Assign reviewer'}</button>
        {assignOpen && <div className="account-menu-panel align-right" role="menu">
          {unassigned.length
            ? unassigned.map((item) => <button key={item.id} role="menuitem" className="account-menu-item" onClick={() => assignToCase(item.id)}><UserCheck size={16} /> {item.person} · {item.ref}</button>)
            : <div className="account-menu-user"><small>Every case in the queue is already assigned.</small></div>}
        </div>}
      </div>
    } />
    <section className="review-stats">
      <article className="card"><span className="stat-icon green"><CheckCircle2 /></span><div><small>{isLawyer ? 'Awaiting counsel' : 'Ready for review'}</small><strong>{stats.readyForReview}</strong><span>2 added today</span></div></article>
      <article className="card"><span className="stat-icon amber"><Clock3 /></span><div><small>Needs evidence</small><strong>5</strong><span>Average age 1.8 days</span></div></article>
      <article className="card"><span className="stat-icon blue"><Sparkles /></span><div><small>Average readiness</small><strong>{stats.averageReadiness}%</strong><span>+7% this week</span></div></article>
      <article className="card"><span className="stat-icon slate"><ShieldCheck /></span><div><small>Privacy exceptions</small><strong>0</strong><span>All controls healthy</span></div></article>
    </section>

    <section className="card queue-card">
      <div className="queue-tools"><div><span className="section-label">Cases requiring attention</span><h2>{filtered.length} cases in queue</h2></div><div className="queue-search"><label><Search /><span className="visually-hidden">Search cases</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or reference" /></label>
        <div className="account-menu" ref={filterRef}>
          <button type="button" className="button button-light" aria-haspopup="menu" aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)}><Filter size={16} /> {statusFilters.find((option) => option.value === statusFilter)?.label}</button>
          {filterOpen && <div className="account-menu-panel align-right" role="menu">
            {statusFilters.map((option) => <button key={option.value} role="menuitem" className="account-menu-item" onClick={() => { setStatusFilter(option.value); setFilterOpen(false) }}>{option.label}</button>)}
          </div>}
        </div>
      </div></div>
      <div className="queue-table" role="table" aria-label="Case review queue">
        <div className="queue-row queue-head" role="rowgroup"><div role="row"><span role="columnheader">Claimant</span><span role="columnheader">Claim</span><span role="columnheader">Amount</span><span role="columnheader">Readiness</span><span role="columnheader">Status</span><span role="columnheader">Updated</span><span role="columnheader" /></div></div>
        <div role="rowgroup">
          {filtered.map((item) => <Link to={`/app/cases/${item.id}`} className="queue-row" role="row" key={item.id}>
            <span role="cell" className="queue-person"><i className="avatar">{item.initials}</i><span><strong>{item.person}</strong><small>{item.ref}</small></span></span>
            <span role="cell"><strong>{item.type}</strong><small className={item.flag === 'Complete' ? 'flag-good' : 'flag-attention'}>{item.flag === 'Complete' ? <CheckCircle2 /> : <AlertCircle />}{item.flag}</small>{assignments[item.id] && <small className="flag-good"><UserCheck size={13} /> Assigned to {assignments[item.id]}</small>}</span>
            <span role="cell" className="number-cell">KES {item.amount.toLocaleString()}</span>
            <span role="cell"><ReadinessRing value={item.readiness} size="small" /></span>
            <span role="cell"><StatusPill status={item.status} /></span><span role="cell">{item.updated}</span><span role="cell"><ArrowRight /></span>
          </Link>)}
        </div>
      </div>
      {!filtered.length && <div className="empty-state"><Search /><h3>No cases match that search</h3><p>Try a claimant name, reference, or claim type.</p></div>}
    </section>

    <section className="review-lower-grid"><article className="card workload-card"><div className="card-title"><div><span className="section-label">Today’s workload</span><h2>{isLawyer ? 'Matter capacity' : 'Review capacity'}</h2></div><span className="metric-good">72%</span></div><div className="capacity-bar"><i style={{ width: '72%' }} /></div><div><span><i className="dot green" />4 reviewed</span><span><i className="dot amber" />4 waiting</span><span><i className="dot gray" />3 slots open</span></div></article><article className="card quality-card"><span><ShieldCheck /></span><div><span className="section-label">Professional guardrail</span><h2>{isLawyer ? 'Privilege and sign-off remain human.' : 'AI never closes a case.'}</h2><p>{isLawyer ? 'Counsel controls strategy, privileged notes, client communication, and every final legal position.' : 'Every generated document remains a draft until a named human reviewer records a decision.'}</p></div></article></section>
  </div>
}
