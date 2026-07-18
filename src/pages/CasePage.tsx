import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, Building2, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Download, ExternalLink, FileCheck2, FileImage, FileText, Fingerprint,
  Link2, MapPin, MessageSquareText, PackageCheck, Scale, ShieldCheck, Sparkles, TriangleAlert, UserRound, Volume2,
} from 'lucide-react'
import { analyzeCase, downloadCasePack, getCase, openCasePack, speakText, updateCaseDetails, updateCaseStatus } from '../api'
import { speakWithBrowser, stopBrowserSpeech } from '../browserVoice'
import { ReadinessRing, StatusPill } from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { demoCase } from '../data/demo'
import type { CaseRecord, LegalIssue } from '../types'

const tabs = ['overview', 'evidence', 'analysis', 'documents', 'activity'] as const
type Tab = typeof tabs[number]

function EvidenceIcon({ category }: { category: string }) {
  if (category === 'payment') return <CircleDollarSign />
  if (category === 'communication') return <MessageSquareText />
  if (category === 'delivery') return <PackageCheck />
  if (category === 'agreement') return <FileText />
  return <FileImage />
}

function IssueIcon({ issue }: { issue: LegalIssue }) {
  if (issue.severity === 'strength') return <CheckCircle2 />
  if (issue.severity === 'missing') return <AlertCircle />
  return <TriangleAlert />
}

export function CasePage() {
  const { id = 'case-amina' } = useParams()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<CaseRecord>(demoCase)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [packBusy, setPackBusy] = useState(false)
  const [packError, setPackError] = useState('')
  const [detailBusy, setDetailBusy] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef('')
  const isProfessional = user?.role === 'paralegal' || user?.role === 'lawyer'
  const activeTab = (tabs.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab
  const isNew = params.get('new') === '1'

  useEffect(() => { getCase(id).then(setCaseData).finally(() => setLoading(false)) }, [id])
  useEffect(() => () => {
    audioRef.current?.pause()
    stopBrowserSpeech()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])
  const missingCount = useMemo(() => caseData.issues.filter((issue) => issue.severity === 'missing').length, [caseData])

  async function approve() {
    setApproving(true)
    try { setCaseData(await updateCaseStatus(id, 'approved')) } finally { setApproving(false) }
  }

  async function listenToSummary() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    setSpeaking(true)
    setVoiceError('')
    const summaryText = `Katiba AI draft summary. ${caseData.summary} Next best action: ${caseData.nextAction} This guidance requires human review.`
    try {
      const audioBlob = await speakText(summaryText)
      const url = URL.createObjectURL(audioBlob)
      audioUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setSpeaking(false)
        URL.revokeObjectURL(url)
        audioUrlRef.current = ''
        audioRef.current = null
      }
      audio.onerror = () => {
        setSpeaking(false)
        setVoiceError('The generated audio could not be played on this device.')
      }
      await audio.play()
    } catch (reason) {
      audioRef.current?.pause()
      audioRef.current = null
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = ''
      try {
        await speakWithBrowser(summaryText, caseData.language)
      } catch {
        setVoiceError(reason instanceof Error ? reason.message : 'AI voice is temporarily unavailable.')
      } finally {
        setSpeaking(false)
      }
    }
  }

  async function handlePack(action: 'open' | 'download', page = 1) {
    setPackBusy(true)
    setPackError('')
    try {
      if (action === 'open') await openCasePack(caseData.id, page)
      else await downloadCasePack(caseData.id)
    } catch (reason) {
      setPackError(reason instanceof Error ? reason.message : 'The PDF pack could not be prepared.')
    } finally {
      setPackBusy(false)
    }
  }

  async function saveRespondentAddress(address: string) {
    setDetailBusy(true)
    try {
      await updateCaseDetails(caseData.id, { respondentAddress: address })
      setCaseData(await analyzeCase(caseData.id))
    } finally {
      setDetailBusy(false)
    }
  }

  return (
    <div className={`page case-page ${loading ? 'is-loading' : ''}`}>
      <div className="case-breadcrumb"><Link to={isProfessional ? '/app/review' : '/app'}><ArrowLeft size={17} /> {isProfessional ? 'Review queue' : 'Overview'}</Link><ChevronRight size={15} /><span>{caseData.reference}</span></div>

      {isNew && <div className="success-banner" role="status"><span><Sparkles /></span><div><strong>Your evidence map is ready.</strong><p>We found {caseData.timeline.length} key events, {caseData.evidence.length} supporting items, and {missingCount} detail to add before review.</p></div><button className="icon-button" onClick={() => { params.delete('new'); setParams(params) }} aria-label="Dismiss"><Check /></button></div>}

      <header className="case-header card">
        <div className="case-title-block"><div className="case-title-top"><StatusPill status={caseData.status} /><span>{caseData.reference}</span></div><h1>{caseData.claimType}</h1><p><UserRound size={16} />{caseData.claimantName}<ArrowRight size={15} /><Building2 size={16} />{caseData.respondentName}</p></div>
        <div className="case-amount"><small>Amount claimed</small><strong>KES {caseData.amount.toLocaleString()}</strong><span><MapPin size={14} />{caseData.courtStation}</span></div>
        <ReadinessRing value={caseData.completeness} />
        <div className="case-header-actions">
          <button className="button button-light" disabled={speaking} onClick={listenToSummary}><Volume2 size={17} /> {speaking ? 'Generating voice…' : 'Listen · AI voice'}</button>
          <button className="button button-light" disabled={packBusy} onClick={() => handlePack('download')}><Download size={17} /> {packBusy ? 'Preparing PDF…' : 'Download pack'}</button>
          {isProfessional ? <button className="button button-primary" disabled={approving || caseData.status === 'approved'} onClick={approve}>{caseData.status === 'approved' ? <><Check size={17} /> Approved</> : approving ? 'Approving…' : <><FileCheck2 size={17} /> {user?.role === 'lawyer' ? 'Approve & sign off' : 'Approve draft'}</>}</button> : <button className="button button-primary" onClick={() => setParams({ tab: 'analysis' })}><Sparkles size={17} /> Review AI findings</button>}
        </div>
      </header>
      {voiceError && <div className="inline-error" role="alert">{voiceError}</div>}
      {packError && <div className="inline-error" role="alert">{packError}</div>}

      <nav className="case-tabs" aria-label="Case sections">
        {tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setParams({ tab })}>{tab === 'analysis' ? 'AI analysis' : tab[0].toUpperCase() + tab.slice(1)}{tab === 'analysis' && <span>{caseData.issues.length}</span>}</button>)}
      </nav>

      {activeTab === 'overview' && <div className="case-content-grid">
        <section className="case-main-column">
          <article className="card case-summary-card">
            <div className="card-title"><div><span className="section-label">Case in plain language</span><h2>What the evidence says</h2></div><span className="ai-badge"><Sparkles size={14} /> AI organized</span></div>
            <p className="summary-lead">{caseData.summary}</p>
            <div className="fact-grid"><div><small>Amount claimed</small><strong>KES {caseData.amount.toLocaleString()}</strong><span>Claimant-entered figure</span></div><div><small>Evidence supplied</small><strong>{caseData.evidence.length} items</strong><span>{caseData.evidence.filter((item) => item.verified).length} content-analyzed</span></div><div><small>Readiness</small><strong>{caseData.completeness}%</strong><span>{missingCount} open gap{missingCount === 1 ? '' : 's'}</span></div><div><small>Claim category</small><strong>{caseData.claimType}</strong><span>Human review required</span></div></div>
            <details className="story-details"><summary>Read Amina’s original story <ChevronRight size={16} /></summary><p>{caseData.story}</p></details>
          </article>

          <article className="card timeline-card">
            <div className="card-title"><div><span className="section-label">Evidence-linked timeline</span><h2>How the claim unfolded</h2></div><button className="text-button" onClick={() => setParams({ tab: 'evidence' })}>Open evidence map</button></div>
            <div className="timeline">
              {caseData.timeline.map((event) => <div className="timeline-event" key={event.id}><div className="timeline-date"><strong>{new Date(event.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</strong><span>{new Date(event.date).getFullYear()}</span></div><span className="timeline-dot"><Check size={12} /></span><div className="timeline-content"><strong>{event.title}</strong><p>{event.detail}</p><span><Link2 size={13} />{event.evidenceIds.length} linked source{event.evidenceIds.length === 1 ? '' : 's'} · {event.confidence}% confidence</span></div></div>)}
            </div>
          </article>
        </section>

        <aside className="case-side-column">
          <article className="card next-action-card"><span className="next-action-icon"><Sparkles /></span><span className="section-label">Next best action</span><h2>{missingCount ? `Resolve ${missingCount} evidence gap${missingCount === 1 ? '' : 's'}.` : 'Ready for human verification.'}</h2><p>{caseData.nextAction}</p><button className="button button-primary button-full" onClick={() => setParams({ tab: 'analysis' })}>{missingCount ? 'Resolve missing item' : 'Review assessment'} <ArrowRight size={17} /></button></article>
          <article className="card eligibility-card"><span className="section-label">Basic eligibility check</span><h2>Small Claims Court</h2><div><span><Check />Claim is under KES 1M</span><span><Check />Type covered by Section 12</span><span><Check />Evidence of transaction exists</span><span className="pending"><AlertCircle />Service details incomplete</span></div><a href={caseData.citations[0]?.url} target="_blank" rel="noreferrer" className="inline-link">View legal basis <ExternalLink size={14} /></a></article>
          <article className="card human-card"><div><span className="avatar avatar-paralegal">NK</span><i className="online-dot" /></div><h2>Human review is built in.</h2><p>Njeri, an accredited review partner, can check the pack before you act.</p><span><ShieldCheck size={14} /> No filing without your approval</span></article>
        </aside>
      </div>}

      {activeTab === 'evidence' && <EvidenceMap caseData={caseData} />}
      {activeTab === 'analysis' && <AnalysisPanel caseData={caseData} saving={detailBusy} onSaveAddress={saveRespondentAddress} />}
      {activeTab === 'documents' && <DocumentsPanel busy={packBusy} onOpen={(page) => handlePack('open', page)} onDownload={() => handlePack('download')} />}
      {activeTab === 'activity' && <ActivityPanel caseData={caseData} />}
    </div>
  )
}

function EvidenceMap({ caseData }: { caseData: CaseRecord }) {
  return <div className="evidence-tab-layout">
    <section className="card evidence-map-card">
      <div className="card-title"><div><span className="section-label">Explainable evidence graph</span><h2>Every conclusion links back to a source.</h2></div><span className="legend"><i className="verified" /> Verified source <i className="inferred" /> AI connection</span></div>
      <div className="evidence-map">
        <div className="map-claim"><span><Scale /></span><small>Claim at issue</small><strong>KES {caseData.amount.toLocaleString()} claimed</strong><p>{caseData.claimType} · {caseData.respondentName}</p></div>
        <div className="map-lines" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="map-sources">
          {caseData.evidence.map((item) => <div className="map-source" key={item.id}><span><EvidenceIcon category={item.category} /></span><small>{item.category}</small><strong>{item.name.replaceAll('_', ' ')}</strong><p>{item.verified ? <><Check size={12} /> Content analyzed</> : <><Clock3 size={12} /> Metadata indexed</>}</p></div>)}
        </div>
      </div>
      <div className="map-insight"><Sparkles /><p><strong>How Katiba connected these items</strong><span>The assessment links extracted content to the claimant narrative. Files without readable extracted content remain clearly marked for human verification.</span></p></div>
    </section>
    <aside className="card evidence-index"><div className="card-title"><div><span className="section-label">Evidence index</span><h2>{caseData.evidence.length} items</h2></div></div>{caseData.evidence.map((item, index) => <div className="evidence-index-row" key={item.id}><span className="evidence-number">E{index + 1}</span><span className="file-icon"><EvidenceIcon category={item.category} /></span><p><strong>{item.name}</strong><small>{(item.size / 1024).toFixed(0)} KB · {item.category}</small></p>{item.verified ? <CheckCircle2 className="verified-check" /> : <Clock3 className="pending-check" />}</div>)}<div className="chain-note"><Fingerprint /><p><strong>Integrity protected</strong><small>Original files are never overwritten. Production storage adds per-file hashes.</small></p></div></aside>
  </div>
}

function AnalysisPanel({ caseData, saving, onSaveAddress }: { caseData: CaseRecord; saving: boolean; onSaveAddress: (address: string) => Promise<void> }) {
  const [address, setAddress] = useState(caseData.respondentAddress ?? '')
  const [addressError, setAddressError] = useState('')
  const strengthCount = caseData.issues.filter((issue) => issue.severity === 'strength').length
  const gapCount = caseData.issues.filter((issue) => issue.severity === 'missing').length

  async function saveAddress() {
    if (address.trim().length < 5) {
      setAddressError('Enter a usable physical or postal service address.')
      return
    }
    setAddressError('')
    try { await onSaveAddress(address.trim()) } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : 'The address could not be saved.')
    }
  }

  return <div className="analysis-layout">
    <section className="analysis-main">
      <div className="ai-explainer"><span><Sparkles /></span><div><small>Katiba evidence-readiness assessment</small><h2>{strengthCount} supporting strength{strengthCount === 1 ? '' : 's'} and {gapCount} unresolved gap{gapCount === 1 ? '' : 's'}.</h2><p>{caseData.aiMode === 'openai' ? 'OpenAI structured analysis is active.' : 'Rules-based fallback mode is active.'} Every conclusion remains subject to source and human verification.</p></div><strong>{caseData.completeness}%<small>readiness</small></strong></div>
      <div className="issues-list">
        {caseData.issues.map((issue) => <article key={issue.id} className={`card issue-card issue-${issue.severity}`}><span className="issue-icon"><IssueIcon issue={issue} /></span><div><span className="issue-label">{issue.severity === 'strength' ? 'Supporting strength' : issue.severity === 'missing' ? 'Missing information' : 'Check before filing'}</span><h3>{issue.title}</h3><p>{issue.detail}</p>{issue.action?.toLowerCase().includes('address') && <div className="issue-resolution"><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Building, street, town or postal address" /><button className="button button-light" disabled={saving} onClick={() => void saveAddress()}>{saving ? 'Saving and reassessing…' : 'Save address & reassess'} <ArrowRight size={16} /></button>{addressError && <small className="field-error">{addressError}</small>}</div>}</div><span className="confidence-tag">{issue.severity === 'strength' ? 'Evidence-linked' : 'Actionable'}</span></article>)}
      </div>
    </section>
    <aside className="analysis-side">
      <article className="card source-card"><span className="section-label">Legal grounding</span><h2>Sources used</h2>{caseData.citations.map((citation) => <a key={citation.id} href={citation.url} target="_blank" rel="noreferrer"><span><BookOpen /></span><p><strong>{citation.label}</strong><small>{citation.section} · {citation.source}</small></p><ExternalLink /></a>)}<p className="source-note"><ShieldCheck /> Answers are constrained to the cited jurisdictional material.</p></article>
      <article className="card guardrail-card"><span><ShieldCheck /></span><h2>What this assessment means</h2><ul><li>Shows how the supplied evidence supports the story</li><li>Flags missing proof and inconsistencies</li><li>Does not invent a win percentage—only a court can decide the outcome</li><li>Keeps filing and legal decisions with the user and reviewer</li></ul></article>
    </aside>
  </div>
}

function DocumentsPanel({ busy, onOpen, onDownload }: { busy: boolean; onOpen: (page: number) => void; onDownload: () => void }) {
  const docs = [
    { name: 'Claim summary', copy: 'Structured facts, parties, amount, and relief sought.', page: 1, ready: true },
    { name: 'Demand letter', copy: 'Editable pre-filing request for payment.', page: 2, ready: true },
    { name: 'Evidence index', copy: 'Numbered schedule linked to each material fact.', page: 3, ready: true },
    { name: 'Filing checklist', copy: 'Station, forms, service, and human-review steps.', page: 4, ready: false },
  ]
  return <div className="documents-layout"><section><div className="documents-hero"><div><span className="section-label">Action pack</span><h2>Four documents. One coherent story.</h2><p>Everything remains editable and clearly marked as a draft until approved.</p></div><div className="pack-actions"><button className="button button-primary" disabled={busy} onClick={() => onOpen(1)}><ExternalLink /> {busy ? 'Preparing PDF…' : 'Open complete PDF'}</button><button className="button button-light" disabled={busy} onClick={onDownload}><Download /> Download</button></div></div><div className="document-grid">{docs.map((doc, index) => <article className="card document-card" key={doc.name}><div className="paper-preview"><span>KO</span><i /><i /><i /><small>{index + 1}</small></div><div><span className={`doc-state ${doc.ready ? '' : 'attention'}`}>{doc.ready ? <Check size={13} /> : <AlertCircle size={13} />}{doc.ready ? 'Ready to review' : 'Needs address'}</span><h3>{doc.name}</h3><p>{doc.copy}</p><small>Page {doc.page} of 4</small></div><button className="icon-button" disabled={busy} aria-label={`Open ${doc.name}`} onClick={() => onOpen(doc.page)}><ChevronRight /></button></article>)}</div></section><aside className="card pack-checklist"><span className="section-label">Before you use this pack</span><h2>Final quality check</h2><div><span className="done"><Check />Facts match source evidence</span><span className="done"><Check />Claim total reconciles</span><span className="done"><Check />Legal basis is cited</span><span><AlertCircle />Respondent address needed</span><span><Clock3 />Professional approval pending</span></div><p><ShieldCheck />This pack is a preparation aid. Follow current Judiciary instructions when filing.</p></aside></div>
}

function ActivityPanel({ caseData }: { caseData: CaseRecord }) {
  function exportLog() {
    const blob = new Blob([JSON.stringify({ caseReference: caseData.reference, exportedAt: new Date().toISOString(), entries: caseData.audit }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${caseData.reference}-audit-log.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  return <section className="card activity-card"><div className="card-title"><div><span className="section-label">Privilege-aware audit trail</span><h2>Every important action is recorded.</h2></div><button className="button button-light" onClick={exportLog}><Download size={16} /> Export log</button></div><div className="activity-list">{caseData.audit.map((entry) => <div key={entry.id}><span><ShieldCheck /></span><div><strong>{entry.action}</strong><p>{entry.detail}</p><small>{entry.actor} · {new Date(entry.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></div>)}</div><div className="audit-note"><ShieldCheck /><p><strong>Tamper-evident in production</strong><span>Audit entries are append-only and exclude document contents, minimizing sensitive-data exposure.</span></p></div></section>
}
