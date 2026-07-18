import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, BookOpenCheck, Check, Database, FileSearch, Fingerprint, Gauge, Network, Scale, ScanText, ShieldCheck, Sparkles, Waypoints } from 'lucide-react'
import { PageHeader } from '../components/AppShell'

const engines = [
  { icon: Scale, name: 'Justice Engine', status: 'Live demo', className: 'live', copy: 'Multilingual intake, jurisdiction checks, evidence timelines, filing packs, and legal-aid review.', link: '/app', metric: '84% case readiness' },
  { icon: Fingerprint, name: 'Evidence Engine', status: 'Live demo', className: 'live', copy: 'Immutable originals, metadata extraction, confidence links, and a privilege-aware audit trail.', link: '/app/cases/case-amina?tab=evidence', metric: '4 sources linked' },
  { icon: ScanText, name: 'Contract Engine', status: 'Prototype', className: 'prototype', copy: 'Clause extraction, playbook deviation, obligation mapping, and explainable contract health.', link: '/app/contracts', metric: '3 risks detected' },
  { icon: Waypoints, name: 'Compliance Engine', status: 'Pilot next', className: 'planned', copy: 'Map business operations to Kenyan regulatory duties and produce an auditable control register.', link: '/app/security', metric: '8 core controls' },
]

export function PlatformPage() {
  return <div className="page platform-page">
    <PageHeader eyebrow="Unified legal infrastructure" title="One trusted core. Four operational engines." copy="Katiba OS structures legal work instead of hiding it inside a chatbot." action={<Link className="button button-primary" to="/app/cases/case-amina"><Sparkles size={17} /> Open flagship demo</Link>} />

    <section className="platform-hero">
      <div className="platform-orbit" aria-label="Katiba OS engine architecture">
        <div className="orbit-core"><span><Blocks /></span><strong>Katiba OS</strong><small>Identity · Data · AI · Audit</small></div>
        <span className="orbit-node node-one"><Scale /><b>Justice</b></span><span className="orbit-node node-two"><Fingerprint /><b>Evidence</b></span><span className="orbit-node node-three"><ScanText /><b>Contracts</b></span><span className="orbit-node node-four"><Waypoints /><b>Compliance</b></span>
      </div>
      <div className="platform-thesis"><span className="section-label">Strategic advantage</span><h2>Build the rails once. Launch workflows faster.</h2><p>Every engine shares role-based access, jurisdiction-aware retrieval, encrypted case data, explainable AI outputs, and append-only audit events. New legal workflows become configurations on a trustworthy platform—not isolated prototypes.</p><div><span><Check />Shared evidence graph</span><span><Check />Deterministic guardrails</span><span><Check />Human approval gates</span><span><Check />Offline-capable client</span></div></div>
    </section>

    <section className="engine-grid">{engines.map(({ icon: Icon, name, status, className, copy, link, metric }) => <article className="card engine-card" key={name}><div className="engine-card-head"><span className="engine-icon"><Icon /></span><span className={`engine-state ${className}`}><i />{status}</span></div><h2>{name}</h2><p>{copy}</p><div className="engine-metric"><Gauge /><span>{metric}</span></div><Link to={link} className="inline-link">Explore engine <ArrowRight /></Link></article>)}</section>

    <section className="card core-architecture"><div className="core-architecture-head"><div><span className="section-label">Technical control plane</span><h2>Decoupled for scale; coherent for users.</h2></div><span className="architecture-badge"><Network /> Event-driven core</span></div><div className="layer-diagram"><div className="layer"><span>Experience</span><p><b>Installable PWA</b><b>Reviewer portal</b><b>Future native shells</b></p></div><i><ArrowRight /></i><div className="layer"><span>Secure API</span><p><b>Authentication</b><b>RBAC</b><b>Rate limits</b></p></div><i><ArrowRight /></i><div className="layer highlight"><span>Legal engines</span><p><b>Justice</b><b>Contracts</b><b>Compliance</b></p></div><i><ArrowRight /></i><div className="layer"><span>Data fabric</span><p><b>Relational core</b><b>Evidence vault</b><b>Legal index</b></p></div></div></section>

    <section className="platform-principles"><article><span><BookOpenCheck /></span><h3>Grounded, not guessed</h3><p>Material outputs display the statute, section, source, and confidence that support them.</p></article><article><span><Database /></span><h3>Structured legal data</h3><p>Parties, claims, clauses, obligations, evidence, controls, and audit events remain queryable.</p></article><article><span><ShieldCheck /></span><h3>High-integrity automation</h3><p>AI prepares and recommends. Authorized humans make decisions with legal effects.</p></article><article><span><FileSearch /></span><h3>One evidence fabric</h3><p>The same verified fact can support a claim, contract review, or compliance control without duplication.</p></article></section>
  </div>
}
