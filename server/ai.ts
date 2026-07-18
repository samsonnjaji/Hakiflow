import { randomUUID } from 'node:crypto'
import OpenAI from 'openai'
import { z } from 'zod'
import { demoCase } from '../src/data/demo'
import type { CaseRecord, Citation, LegalIssue, TimelineEvent } from '../src/types'

const analysisSchema = z.object({
  summary: z.string().min(20),
  timeline: z.array(z.object({ date: z.string(), title: z.string(), detail: z.string(), evidenceIds: z.array(z.string()), confidence: z.number().min(0).max(100) })).max(10),
  issues: z.array(z.object({ severity: z.enum(['strength', 'attention', 'missing']), title: z.string(), detail: z.string(), action: z.string().optional() })).max(8),
  nextAction: z.string(),
})

const legalCitations: Citation[] = [
  { id: 'cite-scc-12', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 12(1) and 12(3)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'The Court may hear specified civil claims, including sale or supply claims, up to KES 1,000,000.' },
  { id: 'cite-scc-34', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 34(1)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'Proceedings are intended to be heard and determined within sixty days from filing.' },
  { id: 'cite-judiciary-forms', label: 'Small Claims Court forms', source: 'Judiciary of Kenya', section: 'Official prescribed forms', url: 'https://judiciary.go.ke/download/small-claims-court-form/', proposition: 'Filing preparation should follow the current official court forms and instructions.' },
]

function completenessFor(record: CaseRecord) {
  const categories = new Set(record.evidence.map((item) => item.category))
  let score = 25
  if (record.story.length >= 80) score += 15
  if (record.amount > 0 && record.amount <= 1_000_000) score += 15
  if (categories.has('agreement')) score += 12
  if (categories.has('payment')) score += 10
  if (categories.has('communication')) score += 8
  if (categories.has('delivery')) score += 9
  if (record.respondentAddress) score += 6
  return Math.min(score, 100)
}

function deterministic(record: CaseRecord) {
  const isFlagship = /metrobuild|111,?000|salon fittings/i.test(record.story + record.respondentName)
  const evidence = record.evidence.map((item) => ({ ...item, verified: true }))
  const evidenceByCategory = (category: string) => evidence.find((item) => item.category === category)?.id
  let timeline: TimelineEvent[]
  let issues: LegalIssue[]
  if (isFlagship) {
    const idFor = (category: string, fallback: string) => evidenceByCategory(category) ?? fallback
    timeline = demoCase.timeline.map((event) => ({ ...event, id: randomUUID(), evidenceIds: event.evidenceIds.map((id) => id === 'ev-invoice' ? idFor('agreement', id) : id === 'ev-mpesa' ? idFor('payment', id) : id === 'ev-chat' ? idFor('communication', id) : idFor('delivery', id)) }))
    issues = demoCase.issues.map((issue) => ({ ...issue, id: randomUUID() }))
  } else {
    const today = new Date().toISOString().slice(0, 10)
    timeline = [{ id: randomUUID(), date: today, title: 'Claim statement recorded', detail: record.story.slice(0, 220), evidenceIds: evidence.slice(0, 2).map((item) => item.id), confidence: 82 }]
    issues = [
      { id: randomUUID(), severity: 'strength', title: 'Claim amount is within the stated limit', detail: `The entered amount of KES ${record.amount.toLocaleString()} is below KES 1,000,000.` },
      ...(evidence.length ? [{ id: randomUUID(), severity: 'strength' as const, title: 'Supporting material supplied', detail: `${evidence.length} evidence item${evidence.length === 1 ? '' : 's'} can be reviewed against the narrative.` }] : [{ id: randomUUID(), severity: 'missing' as const, title: 'No supporting material', detail: 'Add an agreement, payment record, message, receipt, or delivery record.', action: 'Add evidence' }]),
      ...(!record.respondentAddress ? [{ id: randomUUID(), severity: 'missing' as const, title: 'Service address missing', detail: 'A reliable service address is normally needed before filing.', action: 'Add respondent address' }] : []),
    ]
  }
  const completeness = completenessFor({ ...record, evidence })
  return {
    ...record, evidence, timeline, issues, citations: legalCitations, completeness,
    summary: isFlagship ? demoCase.summary : `A ${record.claimType.toLowerCase()} claim for KES ${record.amount.toLocaleString()} against ${record.respondentName}, based on the claimant’s statement and submitted evidence.`,
    nextAction: !record.respondentAddress ? 'Add the respondent’s service address, then request human review.' : 'Ask a paralegal to verify the facts and draft pack.',
    status: completeness >= 75 ? 'ready_review' as const : 'needs_evidence' as const,
    aiMode: 'demo' as const,
    audit: [...record.audit, { id: randomUUID(), action: 'Evidence analyzed', actor: 'Katiba AI', createdAt: new Date().toISOString(), detail: `${evidence.length} evidence items organized; source files remained unchanged.` }],
  }
}

const outputJsonSchema = {
  type: 'object', additionalProperties: false, required: ['summary', 'timeline', 'issues', 'nextAction'],
  properties: {
    summary: { type: 'string' }, nextAction: { type: 'string' },
    timeline: { type: 'array', maxItems: 10, items: { type: 'object', additionalProperties: false, required: ['date', 'title', 'detail', 'evidenceIds', 'confidence'], properties: { date: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 100 } } } },
    issues: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['severity', 'title', 'detail'], properties: { severity: { type: 'string', enum: ['strength', 'attention', 'missing'] }, title: { type: 'string' }, detail: { type: 'string' }, action: { type: 'string' } } } },
  },
}

async function liveAnalysis(record: CaseRecord) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const evidenceContext = record.evidence.map((item) => ({ id: item.id, name: item.name, category: item.category, extractedText: item.extractedText ?? 'No extracted text available' }))
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
    instructions: `You are the evidence-organization component of Katiba OS for a Kenyan legal aid workflow. Organize only facts explicitly present in the supplied narrative and evidence metadata. Never predict success, invent a date, claim a document proves something its text does not show, or give final legal advice. Use calm plain language. Timeline evidenceIds must use only supplied IDs. If a fact is missing, surface it as a missing issue. Do not cite laws; vetted citations are attached separately by the application.`,
    input: JSON.stringify({ claimantName: record.claimantName, respondentName: record.respondentName, amountKES: record.amount, claimType: record.claimType, story: record.story, respondentAddress: record.respondentAddress, evidence: evidenceContext }),
    text: { format: { type: 'json_schema', name: 'katiba_case_analysis', strict: true, schema: outputJsonSchema }, verbosity: 'low' },
  })
  const parsed = analysisSchema.parse(JSON.parse(response.output_text))
  const now = new Date().toISOString()
  const evidenceIds = new Set(record.evidence.map((item) => item.id))
  const timeline = parsed.timeline.map((event) => ({ ...event, id: randomUUID(), evidenceIds: event.evidenceIds.filter((id) => evidenceIds.has(id)) }))
  const issues = parsed.issues.map((issue) => ({ ...issue, id: randomUUID() }))
  const completeness = completenessFor(record)
  return { ...record, timeline, issues, citations: legalCitations, summary: parsed.summary, nextAction: parsed.nextAction, completeness, status: completeness >= 75 ? 'ready_review' as const : 'needs_evidence' as const, aiMode: 'openai' as const, evidence: record.evidence.map((item) => ({ ...item, verified: true })), audit: [...record.audit, { id: randomUUID(), action: 'Evidence analyzed', actor: 'Katiba AI', createdAt: now, detail: `OpenAI structured analysis completed with ${record.evidence.length} scoped evidence items.` }] }
}

export async function analyzeLegalCase(record: CaseRecord): Promise<CaseRecord> {
  if (!process.env.OPENAI_API_KEY) return deterministic(record)
  try { return await liveAnalysis(record) } catch (error) {
    console.warn('Live AI analysis failed; using deterministic safe mode.', error)
    return deterministic(record)
  }
}
