import { useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock3, FileSearch, FileText, Gauge, LockKeyhole, ScanText, ShieldCheck, Sparkles, TriangleAlert, UploadCloud } from 'lucide-react'
import { analyzeContract } from '../api'
import { PageHeader } from '../components/AppShell'
import type { ContractAnalysis } from '../types'

export function ContractPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'empty' | 'scanning' | 'result'>('empty')
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null)
  const [error, setError] = useState('')
  const [activeFinding, setActiveFinding] = useState('')

  async function scan(file: File) {
    setError('')
    const allowed = /\.(pdf|docx|txt)$/i.test(file.name)
    if (!allowed) {
      setError('Choose a PDF, DOCX, or TXT document.')
      return
    }
    if (!file.size || file.size > 25_000_000) {
      setError('The document must contain data and be no larger than 25 MB.')
      return
    }
    setStage('scanning')
    try {
      setAnalysis(await analyzeContract(file))
      setStage('result')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The document analysis did not finish. Retry without selecting the file again.')
      setStage('empty')
    }
  }

  function loadSample() {
    const sample = new File([
      'SUPPLIER AGREEMENT\nClause 8 Data processing: the supplier may process customer data.\nClause 11.2 Indemnity: supplier indemnifies all losses without a stated cap.\nClause 14.1 Termination: customer may terminate on seven days notice.\nPayment: customer pays KES 120,000 before implementation.',
    ], 'MetroBuild_Supplier_Agreement.txt', { type: 'text/plain' })
    void scan(sample)
  }

  function reset() {
    setStage('empty')
    setAnalysis(null)
    setError('')
    setActiveFinding('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return <div className="page contract-page"><PageHeader eyebrow="Katiba OS · Contract Engine" title="Turn legal text into an obligation map." copy="Upload, extract, compare, and review—without losing the clause-level source." action={stage === 'result' ? <button className="button button-light" onClick={reset}>Analyze another</button> : undefined} />
    <input ref={fileRef} className="visually-hidden" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.docx,.txt" onChange={(event) => { const file = event.target.files?.[0]; if (file) void scan(file) }} />
    {stage === 'empty' && <section className="contract-start"><article className="card contract-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void scan(file) }}><span className="contract-upload-icon"><UploadCloud /></span><h2>Drop a contract here</h2><p>PDF, DOCX, or TXT · up to 25 MB · originals remain unchanged</p><div className="contract-upload-actions"><button className="button button-primary" onClick={() => fileRef.current?.click()}><UploadCloud /> Choose document</button><button className="button button-light" onClick={loadSample}><FileSearch /> Load sample</button></div>{error && <div className="inline-error" role="alert">{error}</div>}<small><LockKeyhole /> Private professional processing workspace</small></article><aside className="contract-how"><span className="section-label">What happens next</span><div><span>1</span><p><strong>Structure</strong><small>Extract parties, clauses, dates, money, and obligations.</small></p></div><div><span>2</span><p><strong>Compare</strong><small>Check deviations against a Kenyan SME playbook.</small></p></div><div><span>3</span><p><strong>Explain</strong><small>Show risk, why it matters, and a review-ready alternative.</small></p></div></aside></section>}
    {stage === 'scanning' && <section className="card contract-scanning" role="status"><div className="scan-animation"><span><ScanText /></span><i /><i /><i /></div><h2>Reading the uploaded document…</h2><p>Extracting clauses, obligations, dates, money, and review positions.</p><div className="scan-steps"><span className="done"><Check />File uploaded</span><span className="active"><Sparkles />Analyzing content</span><span><Clock3 />Building obligation map</span></div></section>}
    {stage === 'result' && analysis && <div className="contract-results"><header className="card contract-result-head"><div className="contract-file"><span><FileText /></span><p><strong>{analysis.name}</strong><small>{(analysis.size / 1024 / 1024).toFixed(2)} MB · analyzed just now</small></p></div><div className="contract-health"><span>Contract health</span><strong>{analysis.health}<small>/100</small></strong><i><b style={{ width: `${analysis.health}%` }} /></i></div><div className="contract-head-stats"><span><strong>{analysis.clauses}</strong><small>clauses</small></span><span><strong>{analysis.obligations}</strong><small>obligations</small></span><span className="risk-number"><strong>{analysis.risks}</strong><small>risks</small></span></div></header>
      <div className="contract-result-grid"><section><article className="card contract-summary"><div className="card-title"><div><span className="section-label">Executive review</span><h2>{analysis.summary}</h2></div><span className="ai-badge"><Sparkles /> {analysis.mode === 'openai' ? 'OpenAI structured' : 'Rules-assisted fallback'}</span></div><p>Every finding remains a professional review position and must be checked against the original uploaded document.</p><div><span><CheckCircle2 />Source retained locally</span><span><CheckCircle2 />Named findings</span><span className="attention"><TriangleAlert />Human verification required</span></div></article>
        <div className="contract-risk-list">{analysis.findings.map((finding) => <article className={`card contract-risk risk-${finding.level}`} key={`${finding.clause}-${finding.title}`}><span className="risk-icon">{finding.level === 'high' ? <AlertCircle /> : <TriangleAlert />}</span><div><span className="risk-label">{finding.level} risk · {finding.clause}</span><h3>{finding.title}</h3><p>{finding.detail}</p><details open={activeFinding === finding.title}><summary>Suggested review position <ArrowRight /></summary><p>{finding.fix}</p></details></div><button className="button button-light" onClick={() => setActiveFinding(activeFinding === finding.title ? '' : finding.title)}>{activeFinding === finding.title ? 'Close position' : 'Review position'}</button></article>)}</div></section>
        <aside className="contract-side"><article className="card obligation-card"><div className="card-title"><div><span className="section-label">Upcoming obligations</span><h2>Action map</h2></div><Gauge /></div><div>{analysis.upcoming.map((item, index) => <span key={`${item.owner}-${item.action}`}><i>{String(index + 1).padStart(2, '0')}</i><p><strong>{item.action}</strong><small>{item.owner} · {item.due}</small></p></span>)}</div></article><article className="card contract-guardrail"><ShieldCheck /><h2>Explainable by design</h2><p>Every risk names the relevant clause or topic. No document is changed or approved automatically.</p></article></aside></div>
    </div>}
  </div>
}
