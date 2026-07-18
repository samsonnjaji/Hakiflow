import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { analyzeLegalCase } from './ai'
import { canAccessCase, createCase as createNewCase, getCaseById, getStats, getUserByRole, listCases, recordAudit, saveAnalysis, updateStatus } from './db'
import { buildCasePack } from './pdf'
import { synthesizeSpeech, transcribeAudio, VoiceUnavailableError, voiceStatus } from './voice'
import type { User } from '../src/types'

const sessionSecret = process.env.SESSION_SECRET ?? 'katiba-os-demo-secret-change-before-production'
const allowedStatuses = ['draft', 'analyzing', 'needs_evidence', 'ready_review', 'approved'] as const
const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
const voiceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25_000_000, files: 1 } })

interface SessionPayload { userId: string; role: 'claimant' | 'paralegal' | 'lawyer'; exp: number }
interface AuthedRequest extends Request { session?: SessionPayload; user?: User }

function signToken(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', sessionSecret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

function verifyToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  const expected = createHmac('sha256', sessionSecret).update(encoded).digest()
  const received = Buffer.from(signature, 'base64url')
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload
    return payload.exp > Date.now() ? payload : null
  } catch { return null }
}

function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const token = headerToken || (typeof req.query.token === 'string' ? req.query.token : '')
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ message: 'Your secure session has expired. Re-enter the demo.' })
  const row = getUserByRole(payload.role)
  if (!row || row.id !== payload.userId) return res.status(401).json({ message: 'Session user could not be verified.' })
  req.session = payload
  req.user = { id: row.id, name: row.name, email: row.email, role: row.role as User['role'], initials: row.initials }
  next()
}

const intakeSchema = z.object({
  claimantName: z.string().trim().min(2).max(120), respondentName: z.string().trim().min(2).max(160), respondentAddress: z.string().trim().max(240).optional(),
  amount: z.number().positive().max(1_000_000), claimType: z.string().min(3).max(120), story: z.string().min(40).max(10_000), language: z.enum(['en', 'sw']), courtStation: z.string().min(2).max(150), consent: z.literal(true),
  evidence: z.array(z.object({ name: z.string().min(1).max(255), type: z.string().max(100), size: z.number().nonnegative().max(25_000_000), category: z.enum(['payment', 'agreement', 'communication', 'delivery', 'identity', 'other']), extractedText: z.string().max(30_000).optional() })).min(1).max(20),
})

export const app = express()
app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || localOrigin.test(origin) || configuredOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Origin is not allowed by Katiba OS.'))
  },
  credentials: false,
}))
app.use(express.json({ limit: '1mb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()')
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.openai.com; script-src 'self';")
  next()
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', product: 'Katiba OS', mode: process.env.OPENAI_API_KEY ? 'live-ai' : 'safe-demo', timestamp: new Date().toISOString() }))

app.post('/api/auth/demo', (req, res) => {
  const role = z.enum(['claimant', 'paralegal', 'lawyer']).safeParse(req.body?.role)
  if (!role.success) return res.status(400).json({ message: 'Choose a valid demo role.' })
  const row = getUserByRole(role.data)
  if (!row) return res.status(500).json({ message: 'Demo user is unavailable.' })
  const token = signToken({ userId: row.id, role: role.data, exp: Date.now() + 8 * 60 * 60 * 1000 })
  res.json({ token, user: { id: row.id, name: row.name, email: row.email, role: row.role, initials: row.initials } })
})

app.use('/api', authenticate)

app.get('/api/session', (req: AuthedRequest, res) => res.json({ user: req.user }))
app.get('/api/cases', (req: AuthedRequest, res) => res.json(listCases(req.user!.id, req.user!.role)))
app.get('/api/cases/:id', (req: AuthedRequest, res) => {
  const record = getCaseById(req.params.id)
  if (!record) return res.status(404).json({ message: 'Case not found.' })
  if (!canAccessCase(record.id, req.user!.id, req.user!.role)) return res.status(403).json({ message: 'This case is outside your workspace.' })
  res.json(record)
})

app.post('/api/cases', (req: AuthedRequest, res) => {
  if (req.user!.role !== 'claimant') return res.status(403).json({ message: 'Only a claimant can start this intake flow.' })
  const parsed = intakeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Check the intake details.' })
  const now = new Date().toISOString()
  const evidence = parsed.data.evidence.map((item) => ({ ...item, id: randomUUID(), addedAt: now, verified: false }))
  const record = createNewCase(req.user!.id, {
    claimantName: parsed.data.claimantName, respondentName: parsed.data.respondentName, respondentAddress: parsed.data.respondentAddress || undefined,
    amount: parsed.data.amount, currency: 'KES', claimType: parsed.data.claimType, story: parsed.data.story, language: parsed.data.language,
    courtStation: parsed.data.courtStation, status: 'draft', completeness: 25, aiMode: 'demo', summary: 'Awaiting evidence analysis.', nextAction: 'Run the evidence analysis.',
    evidence, timeline: [], issues: [], citations: [], audit: [{ id: randomUUID(), action: 'Consent recorded', actor: req.user!.name, createdAt: now, detail: 'Purpose-specific consent recorded for this case analysis.' }],
  })
  res.status(201).json(record)
})

app.post('/api/cases/:id/analyze', async (req: AuthedRequest, res, next) => {
  try {
    const record = getCaseById(req.params.id)
    if (!record) return res.status(404).json({ message: 'Case not found.' })
    if (!canAccessCase(record.id, req.user!.id, req.user!.role)) return res.status(403).json({ message: 'This case is outside your workspace.' })
    res.json(saveAnalysis(await analyzeLegalCase(record)))
  } catch (error) { next(error) }
})

app.patch('/api/cases/:id/status', (req: AuthedRequest, res) => {
  if (req.user!.role === 'claimant') return res.status(403).json({ message: 'A legal professional role is required.' })
  const parsed = z.enum(allowedStatuses).safeParse(req.body?.status)
  if (!parsed.success) return res.status(400).json({ message: 'Choose a valid case status.' })
  const record = updateStatus(req.params.id, parsed.data, req.user!.name)
  if (!record) return res.status(404).json({ message: 'Case not found.' })
  res.json(record)
})

app.get('/api/cases/:id/pack', async (req: AuthedRequest, res, next) => {
  try {
    const record = getCaseById(req.params.id)
    if (!record) return res.status(404).json({ message: 'Case not found.' })
    if (!canAccessCase(record.id, req.user!.id, req.user!.role)) return res.status(403).json({ message: 'This case is outside your workspace.' })
    const pdf = await buildCasePack(record)
    recordAudit(record.id, 'Preparation pack generated', req.user!.name, 'A PDF preparation pack was generated from the current case record. It was not filed automatically.')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${record.reference}-Katiba-OS-pack.pdf"`)
    res.send(Buffer.from(pdf))
  } catch (error) { next(error) }
})

app.get('/api/stats', (_req, res) => res.json(getStats()))
app.get('/api/contracts/demo', (_req, res) => res.json({
  id: 'contract-metrobuild', name: 'MetroBuild_Supplier_Agreement.pdf', health: 64, clauses: 28, obligations: 9, risks: 3,
  mode: process.env.OPENAI_API_KEY ? 'openai-ready' : 'deterministic-demo',
  summary: 'Commercially usable, but liability and data terms need revision.',
  findings: [
    { level: 'high', clause: '11.2', title: 'Unlimited indemnity', detail: 'The supplier indemnifies all losses without a financial cap or exclusion for indirect loss.' },
    { level: 'medium', clause: '14.1', title: 'One-sided termination', detail: 'The customer may terminate on seven days notice, while the supplier has no equivalent right.' },
    { level: 'medium', clause: '8', title: 'Data-processing gap', detail: 'Personal data is referenced without defining controller and processor roles or breach notice timing.' },
  ],
  upcoming: [
    { owner: 'Supplier', action: 'Provide implementation plan', due: 'Within 5 days' },
    { owner: 'Customer', action: 'Pay onboarding fee', due: 'KES 120,000' },
    { owner: 'Both parties', action: 'Appoint data contacts', due: 'Before processing' },
  ],
}))

app.get('/api/voice/status', (_req, res) => res.json(voiceStatus()))

app.post('/api/voice/transcribe', voiceUpload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Attach one audio file.' })
    const language = z.enum(['en', 'sw']).optional().safeParse(req.body?.language)
    if (!language.success) return res.status(400).json({ message: 'Choose English or Kiswahili for transcription.' })
    const text = await transcribeAudio({ buffer: req.file.buffer, filename: req.file.originalname, mimeType: req.file.mimetype, language: language.data })
    res.json({ text, model: voiceStatus().transcriptionModel })
  } catch (error) {
    if (error instanceof VoiceUnavailableError) return res.status(503).json({ message: error.message })
    next(error)
  }
})

app.post('/api/voice/speak', async (req, res, next) => {
  try {
    const parsed = z.object({ text: z.string().trim().min(1).max(4096) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Provide between 1 and 4,096 characters for speech.' })
    const audio = await synthesizeSpeech(parsed.data.text)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(audio)
  } catch (error) {
    if (error instanceof VoiceUnavailableError) return res.status(503).json({ message: error.message })
    next(error)
  }
})

app.get('/api/platform', (_req, res) => res.json({
  product: 'Katiba OS',
  clients: ['web-pwa', 'flutter-android', 'flutter-ios', 'flutter-web', 'flutter-desktop'],
  engines: ['justice', 'contract', 'compliance', 'evidence'],
  trust: ['signed sessions', 'role-based access', 'case-level authorization', 'audit log', 'evidence checksums', 'human approval'],
}))

const distPath = resolve(process.cwd(), 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*path', (_req, res) => res.sendFile(resolve(distPath, 'index.html')))
}

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }))
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ message: 'Katiba OS could not complete that request. No data was lost.' })
})
