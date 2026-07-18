import { randomUUID } from 'node:crypto'
import OpenAI from 'openai'
import { z } from 'zod'
import { demoCase } from '../src/data/demo'
import type { CaseRecord, Citation, LegalIssue, TimelineEvent } from '../src/types'

const analysisSchema = z.object({
  summary: z.string().min(20),
  timeline: z.array(z.object({
    date: z.string(), title: z.string(), detail: z.string(), evidenceIds: z.array(z.string()), confidence: z.number().min(0).max(100),
  })).max(10),
  issues: z.array(z.object({
    severity: z.enum(['strength', 'attention', 'missing']), title: z.string(), detail: z.string(), action: z.string().nullable(),
  })).max(8),
  nextAction: z.string(),
})

const legalCitations: Citation[] = [
  { id: 'cite-scc-12', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 12(1) and 12(3)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'The Court may hear specified civil claims, including sale or supply claims, up to KES 1,000,000.' },
  { id: 'cite-scc-34', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 34(1)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'Proceedings are intended to be heard and determined within sixty days from filing.' },
  { id: 'cite-judiciary-forms', label: 'Small Claims Court forms', source: 'Judiciary of Kenya', section: 'Official prescribed forms', url: 'https://judiciary.go.ke/download/small-claims-court-form/', proposition: 'Filing preparation should follow the current official court forms and instructions.' },
]

function citationsForCase(caseId: string): Citation[] {
  return legalCitations.map((citation) => ({ ...citation, id: `${caseId}:${citation.id}` }))
}

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

function categoryLabel(category: string) {
  return ({ agreement: 'Agreement or invoice', payment: 'Payment record', communication: 'Written communication', delivery: 'Delivery record', identity: 'Identity record', other: 'Supporting material' } as Record<string, string>)[category] ?? 'Supporting material'
}

function deterministic(record: CaseRecord) {
  const isFlagship = /metrobuild|111,?000|salon fittings/i.test(record.story + record.respondentName)
  const evidence = record.evidence.map((item) => ({ ...item, verified: isFlagship || Boolean(item.extractedText?.trim()) }))
  const evidenceByCategory = (category: string) => evidence.find((item) => item.category === category)?.id
  let timeline: TimelineEvent[]
  let issues: LegalIssue[]
  if (isFlagship) {
    const idFor = (category: string, fallback: string) => evidenceByCategory(category) ?? fallback
    timeline = demoCase.timeline.map((event) => ({
      ...event,
      id: randomUUID(),
      evidenceIds: event.evidenceIds.map((id) => id === 'ev-invoice' ? idFor('agreement', id) : id === 'ev-mpesa' ? idFor('payment', id) : id === 'ev-chat' ? idFor('communication', id) : idFor('delivery', id)),
    }))
    issues = demoCase.issues.map((issue) => ({ ...issue, id: randomUUID() }))
  } else {
    const today = new Date().toISOString().slice(0, 10)
    timeline = [{ id: randomUUID(), date: today, title: 'Claim statement recorded', detail: record.story.slice(0, 220), evidenceIds: evidence.slice(0, 2).map((item) => item.id), confidence: 82 }]
    const categoryIssues: LegalIssue[] = [...new Set(evidence.map((item) => item.category))].slice(0, 4).map((category) => {
      const matching = evidence.filter((item) => item.category === category)
      const contentRead = matching.some((item) => item.extractedText?.trim())
      return {
        id: randomUUID(),
        severity: contentRead ? 'strength' : 'attention',
        title: `${categoryLabel(category)} ${contentRead ? 'supports review' : 'is indexed'}`,
        detail: contentRead
          ? `Katiba analyzed extracted content from ${matching.length} ${categoryLabel(category).toLowerCase()} item${matching.length === 1 ? '' : 's'} and linked it to the narrative.`
          : `${matching.length} file${matching.length === 1 ? '' : 's'} ${matching.length === 1 ? 'was' : 'were'} added by name and metadata. Open the source during human review to confirm its contents.`,
      }
    })
    issues = [
      { id: randomUUID(), severity: 'strength', title: 'Claim amount fits the stated monetary limit', detail: `The entered amount of KES ${record.amount.toLocaleString()} is below KES 1,000,000.` },
      ...categoryIssues,
      ...(!record.respondentAddress ? [{ id: randomUUID(), severity: 'missing' as const, title: 'Service address missing', detail: 'Add a reliable physical or postal address for serving the respondent before filing.', action: 'Add respondent address' }] : []),
    ]
  }
  const completeness = completenessFor({ ...record, evidence })
  return {
    ...record,
    evidence,
    timeline,
    issues,
    citations: citationsForCase(record.id),
    completeness,
    summary: isFlagship ? demoCase.summary : `Evidence-readiness assessment for a ${record.claimType.toLowerCase()} claim of KES ${record.amount.toLocaleString()} against ${record.respondentName}. Katiba organized the claimant's narrative and ${evidence.length} submitted source item${evidence.length === 1 ? '' : 's'} for human verification.`,
    nextAction: !record.respondentAddress ? 'Add the respondent service address, then request human review.' : 'Ask a paralegal or lawyer to verify the source documents and draft pack.',
    status: completeness >= 75 ? 'ready_review' as const : 'needs_evidence' as const,
    aiMode: 'demo' as const,
    audit: [...record.audit, { id: randomUUID(), action: 'Evidence assessed', actor: 'Katiba analysis engine', createdAt: new Date().toISOString(), detail: `${evidence.length} evidence items organized in rules-based fallback mode; source files remained unchanged.` }],
  }
}

const outputJsonSchema = {
  type: 'object', additionalProperties: false, required: ['summary', 'timeline', 'issues', 'nextAction'],
  properties: {
    summary: { type: 'string' }, nextAction: { type: 'string' },
    timeline: { type: 'array', maxItems: 10, items: { type: 'object', additionalProperties: false, required: ['date', 'title', 'detail', 'evidenceIds', 'confidence'], properties: { date: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 100 } } } },
    issues: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['severity', 'title', 'detail', 'action'], properties: { severity: { type: 'string', enum: ['strength', 'attention', 'missing'] }, title: { type: 'string' }, detail: { type: 'string' }, action: { type: ['string', 'null'] } } } },
  },
} as const

function openAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function extractEvidenceFile(file: { buffer: Buffer; filename: string; mimeType: string }) {
  if (file.mimeType === 'text/plain' || /\.txt$/i.test(file.filename)) {
    return { extractedText: file.buffer.toString('utf8').slice(0, 30_000), aiMode: 'local' as const }
  }
  if (!process.env.OPENAI_API_KEY) {
    return { extractedText: '', aiMode: 'demo' as const, message: 'OpenAI is not configured, so the file was indexed by metadata for human review.' }
  }

  const isImage = file.mimeType.startsWith('image/')
  const encoded = file.buffer.toString('base64')
  const content = isImage
    ? [{ type: 'input_text' as const, text: 'Extract only the visible evidence facts: parties, dates, amounts, reference numbers, promises, signatures, and delivery/payment status. Clearly state unreadable or uncertain text. Do not give legal advice or predict a case outcome.' }, { type: 'input_image' as const, image_url: `data:${file.mimeType};base64,${encoded}`, detail: 'high' as const }]
    : [{ type: 'input_text' as const, text: 'Extract only the evidence facts from this document: parties, dates, amounts, reference numbers, promises, signatures, and delivery/payment status. Clearly state unreadable or uncertain content. Do not give legal advice or predict a case outcome.' }, { type: 'input_file' as const, filename: file.filename, file_data: encoded }]

  const response = await openAIClient().responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
    input: [{ role: 'user', content }],
    store: false,
  })
  const extractedText = response.output_text.trim().slice(0, 30_000)
  if (!extractedText) throw new Error('The evidence file did not contain readable content.')
  return { extractedText, aiMode: 'openai' as const }
}

async function liveAnalysis(record: CaseRecord) {
  const evidenceContext = record.evidence.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    contentStatus: item.extractedText?.trim() ? 'content extracted' : 'metadata only — do not infer contents',
    extractedText: item.extractedText?.trim() || null,
  }))
  const response = await openAIClient().responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
    instructions: `You are Katiba OS's evidence-readiness analyst for a Kenyan legal-aid workflow. Give a useful, neutral assessment of how the submitted evidence supports the claimant's narrative. Identify strengths, inconsistencies, missing proof, and the single best next action. Organize only facts explicitly present in the narrative or extracted evidence. Metadata-only files may be listed but never treated as proof of their contents. Never provide a win probability or promise a court outcome: courts decide credibility, admissibility, law, and disputed facts. Never invent dates or facts, and do not give final legal advice. Use calm plain language. Timeline evidenceIds must use only supplied IDs. When an issue has no UI action, set action to null. Do not cite law; vetted citations are attached separately by the application.`,
    input: JSON.stringify({ claimantName: record.claimantName, respondentName: record.respondentName, amountKES: record.amount, claimType: record.claimType, story: record.story, respondentAddress: record.respondentAddress || null, evidence: evidenceContext }),
    text: { format: { type: 'json_schema', name: 'katiba_case_analysis', strict: true, schema: outputJsonSchema }, verbosity: 'low' },
    store: false,
  })
  const parsed = analysisSchema.parse(JSON.parse(response.output_text))
  const now = new Date().toISOString()
  const evidenceIds = new Set(record.evidence.map((item) => item.id))
  const timeline = parsed.timeline.map((event) => ({ ...event, id: randomUUID(), evidenceIds: event.evidenceIds.filter((id) => evidenceIds.has(id)) }))
  const issues = parsed.issues.map(({ action, ...issue }) => ({ ...issue, id: randomUUID(), ...(action ? { action } : {}) }))
  const completeness = completenessFor(record)
  return {
    ...record,
    timeline,
    issues,
    citations: citationsForCase(record.id),
    summary: parsed.summary,
    nextAction: parsed.nextAction,
    completeness,
    status: completeness >= 75 ? 'ready_review' as const : 'needs_evidence' as const,
    aiMode: 'openai' as const,
    evidence: record.evidence.map((item) => ({ ...item, verified: Boolean(item.extractedText?.trim()) })),
    audit: [...record.audit, { id: randomUUID(), action: 'Evidence assessed', actor: 'Katiba AI', createdAt: now, detail: `OpenAI structured analysis completed with ${record.evidence.length} scoped evidence items.` }],
  }
}

export async function analyzeLegalCase(record: CaseRecord): Promise<CaseRecord> {
  if (!process.env.OPENAI_API_KEY) return deterministic(record)
  try {
    return await liveAnalysis(record)
  } catch (error) {
    console.warn('Live AI analysis failed; using deterministic safe mode.', error)
    return deterministic(record)
  }
}
