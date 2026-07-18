import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { demoCase, demoUsers } from '../src/data/demo'
import type { AuditEntry, CaseRecord, Citation, DashboardStats, Evidence, LegalIssue, TimelineEvent } from '../src/types'

function openDatabase() {
  const requestedPath = process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data', 'katiba-os-v2.db')
  try {
    mkdirSync(dirname(requestedPath), { recursive: true })
    return new DatabaseSync(requestedPath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (!['EACCES', 'EROFS'].includes(code ?? '')) throw error

    const fallbackPath = resolve(tmpdir(), 'katiba-os.db')
    console.warn(`Database path ${requestedPath} is not writable; using temporary storage at ${fallbackPath}.`)
    mkdirSync(dirname(fallbackPath), { recursive: true })
    return new DatabaseSync(fallbackPath)
  }
}

export const db = openDatabase()
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('claimant','paralegal','lawyer')),
    initials TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    claimant_name TEXT NOT NULL,
    respondent_name TEXT NOT NULL,
    respondent_address TEXT,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'KES',
    claim_type TEXT NOT NULL,
    story TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en','sw')),
    court_station TEXT NOT NULL,
    status TEXT NOT NULL,
    completeness INTEGER NOT NULL DEFAULT 0,
    ai_mode TEXT NOT NULL DEFAULT 'demo',
    summary TEXT NOT NULL DEFAULT '',
    next_action TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    extracted_text TEXT,
    checksum_sha256 TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    event_date TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    evidence_ids TEXT NOT NULL DEFAULT '[]',
    confidence INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS legal_issues (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    action TEXT
  );
  CREATE TABLE IF NOT EXISTS citations (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    source TEXT NOT NULL,
    section TEXT NOT NULL,
    url TEXT NOT NULL,
    proposition TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id);
  CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
  CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_log(case_id);
`)

function seed() {
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id,name,email,role,initials) VALUES (?,?,?,?,?)')
  Object.values(demoUsers).forEach((user) => insertUser.run(user.id, user.name, user.email, user.role, user.initials))
  const exists = db.prepare('SELECT id FROM cases WHERE id = ?').get(demoCase.id)
  if (exists) return
  db.prepare(`INSERT INTO cases (id,reference,user_id,claimant_name,respondent_name,respondent_address,amount,currency,claim_type,story,language,court_station,status,completeness,ai_mode,summary,next_action,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    demoCase.id, demoCase.reference, demoUsers.claimant.id, demoCase.claimantName, demoCase.respondentName,
    demoCase.respondentAddress ?? null, demoCase.amount, demoCase.currency, demoCase.claimType, demoCase.story,
    demoCase.language, demoCase.courtStation, demoCase.status, demoCase.completeness, demoCase.aiMode,
    demoCase.summary, demoCase.nextAction, demoCase.createdAt, demoCase.updatedAt,
  )
  replaceChildren(demoCase)
}

function checksum(input: string) { return createHash('sha256').update(input).digest('hex') }

function writeChildren(record: CaseRecord) {
  const caseId = record.id
  for (const table of ['evidence', 'timeline_events', 'legal_issues', 'citations', 'audit_log']) db.prepare(`DELETE FROM ${table} WHERE case_id = ?`).run(caseId)
  const evidenceStatement = db.prepare('INSERT INTO evidence (id,case_id,name,mime_type,category,byte_size,extracted_text,checksum_sha256,verified,added_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
  record.evidence.forEach((item) => evidenceStatement.run(item.id, caseId, item.name, item.type, item.category, item.size, item.extractedText ?? null, checksum(`${item.name}:${item.size}:${item.type}`), item.verified ? 1 : 0, item.addedAt))
  const eventStatement = db.prepare('INSERT INTO timeline_events (id,case_id,event_date,title,detail,evidence_ids,confidence) VALUES (?,?,?,?,?,?,?)')
  record.timeline.forEach((item) => eventStatement.run(item.id, caseId, item.date, item.title, item.detail, JSON.stringify(item.evidenceIds), item.confidence))
  const issueStatement = db.prepare('INSERT INTO legal_issues (id,case_id,severity,title,detail,action) VALUES (?,?,?,?,?,?)')
  record.issues.forEach((item) => issueStatement.run(item.id, caseId, item.severity, item.title, item.detail, item.action ?? null))
  const citationStatement = db.prepare('INSERT INTO citations (id,case_id,label,source,section,url,proposition) VALUES (?,?,?,?,?,?,?)')
  record.citations.forEach((item) => citationStatement.run(item.id, caseId, item.label, item.source, item.section, item.url, item.proposition))
  const auditStatement = db.prepare('INSERT INTO audit_log (id,case_id,action,actor,detail,created_at) VALUES (?,?,?,?,?,?)')
  record.audit.forEach((item) => auditStatement.run(item.id, caseId, item.action, item.actor, item.detail, item.createdAt))
}

function replaceChildren(record: CaseRecord) {
  db.exec('BEGIN')
  try { writeChildren(record); db.exec('COMMIT') } catch (error) { db.exec('ROLLBACK'); throw error }
}

seed()

type Row = Record<string, string | number | null>
function rows(sql: string, value: string): Row[] { return db.prepare(sql).all(value) as Row[] }

export function getUserByRole(role: string) {
  return db.prepare('SELECT id,name,email,role,initials FROM users WHERE role = ?').get(role) as Record<string, string> | undefined
}

export function getCaseById(id: string): CaseRecord | null {
  const item = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as Row | undefined
  if (!item) return null
  const evidence: Evidence[] = rows('SELECT * FROM evidence WHERE case_id = ? ORDER BY added_at', id).map((row) => ({ id: String(row.id), name: String(row.name), type: String(row.mime_type), category: String(row.category) as Evidence['category'], size: Number(row.byte_size), addedAt: String(row.added_at), extractedText: row.extracted_text ? String(row.extracted_text) : undefined, verified: Boolean(row.verified) }))
  const timeline: TimelineEvent[] = rows('SELECT * FROM timeline_events WHERE case_id = ? ORDER BY event_date', id).map((row) => ({ id: String(row.id), date: String(row.event_date), title: String(row.title), detail: String(row.detail), evidenceIds: JSON.parse(String(row.evidence_ids)) as string[], confidence: Number(row.confidence) }))
  const issues: LegalIssue[] = rows('SELECT * FROM legal_issues WHERE case_id = ?', id).map((row) => ({ id: String(row.id), severity: String(row.severity) as LegalIssue['severity'], title: String(row.title), detail: String(row.detail), action: row.action ? String(row.action) : undefined }))
  const citations: Citation[] = rows('SELECT * FROM citations WHERE case_id = ?', id).map((row) => ({ id: String(row.id), label: String(row.label), source: String(row.source), section: String(row.section), url: String(row.url), proposition: String(row.proposition) }))
  const audit: AuditEntry[] = rows('SELECT * FROM audit_log WHERE case_id = ? ORDER BY created_at DESC', id).map((row) => ({ id: String(row.id), action: String(row.action), actor: String(row.actor), detail: String(row.detail), createdAt: String(row.created_at) }))
  return {
    id: String(item.id), reference: String(item.reference), claimantName: String(item.claimant_name), respondentName: String(item.respondent_name), respondentAddress: item.respondent_address ? String(item.respondent_address) : undefined,
    amount: Number(item.amount), currency: 'KES', claimType: String(item.claim_type), story: String(item.story), language: String(item.language) as 'en' | 'sw', courtStation: String(item.court_station), status: String(item.status) as CaseRecord['status'],
    completeness: Number(item.completeness), aiMode: String(item.ai_mode) as 'demo' | 'openai', summary: String(item.summary), nextAction: String(item.next_action), createdAt: String(item.created_at), updatedAt: String(item.updated_at), evidence, timeline, issues, citations, audit,
  }
}

export function canAccessCase(id: string, userId: string, role: string) {
  const owner = db.prepare('SELECT user_id FROM cases WHERE id = ?').get(id) as { user_id: string } | undefined
  return Boolean(owner && (role !== 'claimant' || owner.user_id === userId))
}

export function listCases(userId: string, role: string) {
  const caseRows = role !== 'claimant' ? db.prepare('SELECT id FROM cases ORDER BY updated_at DESC').all() as Row[] : db.prepare('SELECT id FROM cases WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as Row[]
  return caseRows.map((row) => getCaseById(String(row.id))).filter(Boolean) as CaseRecord[]
}

export function createCase(userId: string, payload: Omit<CaseRecord, 'id' | 'reference' | 'createdAt' | 'updatedAt'>) {
  const id = randomUUID()
  const now = new Date().toISOString()
  const sequence = Number((db.prepare('SELECT COUNT(*) AS count FROM cases').get() as { count: number }).count) + 43
  const reference = `KO-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`
  db.prepare(`INSERT INTO cases (id,reference,user_id,claimant_name,respondent_name,respondent_address,amount,currency,claim_type,story,language,court_station,status,completeness,ai_mode,summary,next_action,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, reference, userId, payload.claimantName, payload.respondentName, payload.respondentAddress ?? null, payload.amount, 'KES', payload.claimType, payload.story, payload.language, payload.courtStation, payload.status, payload.completeness, payload.aiMode, payload.summary, payload.nextAction, now, now,
  )
  const record: CaseRecord = { ...payload, id, reference, createdAt: now, updatedAt: now }
  replaceChildren(record)
  return getCaseById(id)!
}

export function saveAnalysis(record: CaseRecord) {
  const now = new Date().toISOString()
  db.exec('BEGIN')
  try {
    db.prepare('UPDATE cases SET status=?,completeness=?,ai_mode=?,summary=?,next_action=?,updated_at=? WHERE id=?').run(record.status, record.completeness, record.aiMode, record.summary, record.nextAction, now, record.id)
    writeChildren({ ...record, updatedAt: now })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getCaseById(record.id)!
}

export function updateCaseDetails(id: string, details: { respondentAddress: string }, actor: string) {
  const now = new Date().toISOString()
  const changed = db.prepare('UPDATE cases SET respondent_address=?,updated_at=? WHERE id=?').run(details.respondentAddress, now, id)
  if (changed.changes === 0) return null
  db.prepare('INSERT INTO audit_log (id,case_id,action,actor,detail,created_at) VALUES (?,?,?,?,?,?)').run(
    randomUUID(), id, 'Respondent service address updated', actor, 'The service address was added to the draft and will be included in the next evidence assessment.', now,
  )
  return getCaseById(id)
}

export function updateStatus(id: string, status: CaseRecord['status'], actor: string) {
  const now = new Date().toISOString()
  const changed = db.prepare('UPDATE cases SET status=?,updated_at=? WHERE id=?').run(status, now, id)
  if (changed.changes === 0) return null
  db.prepare('INSERT INTO audit_log (id,case_id,action,actor,detail,created_at) VALUES (?,?,?,?,?,?)').run(randomUUID(), id, `Status changed to ${status}`, actor, 'A named reviewer recorded this workflow decision.', now)
  return getCaseById(id)
}

export function recordAudit(id: string, action: string, actor: string, detail: string) {
  const now = new Date().toISOString()
  const exists = db.prepare('SELECT id FROM cases WHERE id = ?').get(id)
  if (!exists) return false
  db.prepare('INSERT INTO audit_log (id,case_id,action,actor,detail,created_at) VALUES (?,?,?,?,?,?)').run(randomUUID(), id, action, actor, detail, now)
  return true
}

export function getStats(): DashboardStats {
  const counts = db.prepare(`SELECT COUNT(*) AS activeCases, SUM(CASE WHEN status='ready_review' THEN 1 ELSE 0 END) AS readyForReview, AVG(completeness) AS averageReadiness FROM cases`).get() as Record<string, number>
  const evidenceItems = (db.prepare('SELECT COUNT(*) AS count FROM evidence').get() as { count: number }).count
  const statusRows = db.prepare('SELECT status AS name, COUNT(*) AS value FROM cases GROUP BY status ORDER BY status').all() as Array<{ name: string; value: number }>
  const peopleGuided = (db.prepare('SELECT COUNT(DISTINCT user_id) AS count FROM cases').get() as { count: number }).count
  const packsCreated = (db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action = 'Preparation pack generated'").get() as { count: number }).count
  return {
    activeCases: counts.activeCases,
    readyForReview: counts.readyForReview ?? 0,
    evidenceItems,
    averageReadiness: Math.round(counts.averageReadiness || 0),
    casesByStatus: statusRows,
    impact: { peopleGuided, packsCreated, hoursSaved: 0 },
  }
}
