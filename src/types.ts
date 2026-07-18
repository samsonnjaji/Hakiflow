export type Role = 'claimant' | 'paralegal' | 'lawyer'
export type CaseStatus = 'draft' | 'analyzing' | 'needs_evidence' | 'ready_review' | 'approved'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  initials: string
}

export interface Evidence {
  id: string
  name: string
  type: string
  category: 'payment' | 'agreement' | 'communication' | 'delivery' | 'identity' | 'other'
  size: number
  addedAt: string
  extractedText?: string
  verified: boolean
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  detail: string
  evidenceIds: string[]
  confidence: number
}

export interface LegalIssue {
  id: string
  severity: 'strength' | 'attention' | 'missing'
  title: string
  detail: string
  action?: string
}

export interface Citation {
  id: string
  label: string
  source: string
  section: string
  url: string
  proposition: string
}

export interface AuditEntry {
  id: string
  action: string
  actor: string
  createdAt: string
  detail: string
}

export interface CaseRecord {
  id: string
  reference: string
  claimantName: string
  respondentName: string
  respondentAddress?: string
  amount: number
  currency: 'KES'
  claimType: string
  story: string
  language: 'en' | 'sw'
  courtStation: string
  status: CaseStatus
  completeness: number
  createdAt: string
  updatedAt: string
  evidence: Evidence[]
  timeline: TimelineEvent[]
  issues: LegalIssue[]
  citations: Citation[]
  audit: AuditEntry[]
  aiMode: 'demo' | 'openai'
  summary: string
  nextAction: string
}

export interface DashboardStats {
  activeCases: number
  readyForReview: number
  evidenceItems: number
  averageReadiness: number
  casesByStatus: Array<{ name: string; value: number }>
  impact: { peopleGuided: number; packsCreated: number; hoursSaved: number }
}

export interface IntakePayload {
  claimantName: string
  respondentName: string
  respondentAddress?: string
  amount: number
  claimType: string
  story: string
  language: 'en' | 'sw'
  courtStation: string
  evidence: Array<Pick<Evidence, 'name' | 'type' | 'size' | 'category'> & { extractedText?: string }>
  consent: boolean
}
