import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_PATH = ':memory:'
process.env.SESSION_SECRET = 'test-session-secret'

let app: Awaited<typeof import('./app')>['app']
let claimantToken = ''
let lawyerToken = ''

beforeAll(async () => {
  app = (await import('./app')).app
  claimantToken = (await request(app).post('/api/auth/demo').send({ role: 'claimant' })).body.token
  lawyerToken = (await request(app).post('/api/auth/demo').send({ role: 'lawyer' })).body.token
})

describe('Katiba OS API', () => {
  it('reports safe demo AI mode', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.product).toBe('Katiba OS')
    expect(response.body.mode).toBe('safe-demo')
  })

  it('allows the production Workers frontend and rejects unknown origins cleanly', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'https://katibaos.njajisamson.workers.dev')
    expect(allowed.status).toBe(200)
    expect(allowed.headers['access-control-allow-origin']).toBe('https://katibaos.njajisamson.workers.dev')

    const rejected = await request(app).get('/api/health').set('Origin', 'https://untrusted.example')
    expect(rejected.status).toBe(403)
    expect(rejected.body.message).toBe('This frontend origin is not authorized.')
  })

  it('authenticates each legal workflow role', async () => {
    const response = await request(app).get('/api/session').set('Authorization', `Bearer ${lawyerToken}`)
    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe('lawyer')
  })

  it('rejects a tampered bearer token', async () => {
    const response = await request(app).get('/api/session').set('Authorization', `Bearer ${lawyerToken}tampered`)
    expect(response.status).toBe(401)
  })

  it('creates and analyzes a consented claim', async () => {
    const created = await request(app).post('/api/cases').set('Authorization', `Bearer ${claimantToken}`).send({
      claimantName: 'Amina Wanjiku', respondentName: 'MetroBuild Supplies Ltd', amount: 86000,
      claimType: 'Unpaid goods or services', story: 'I supplied salon fittings worth KES 111,000. A KES 25,000 deposit was paid, but the KES 86,000 balance remains unpaid after delivery.',
      language: 'en', courtStation: 'Milimani Small Claims Court', consent: true,
      evidence: [{ name: 'Invoice.pdf', type: 'application/pdf', size: 12000, category: 'agreement' }],
    })
    expect(created.status).toBe(201)
    const analyzed = await request(app).post(`/api/cases/${created.body.id}/analyze`).set('Authorization', `Bearer ${claimantToken}`)
    expect(analyzed.status).toBe(200)
    expect(analyzed.body.citations.length).toBeGreaterThan(0)
    expect(analyzed.body.issues.length).toBeGreaterThan(0)
  })

  it('analyzes multiple claims without reusing citation identifiers', async () => {
    const created = await request(app).post('/api/cases').set('Authorization', `Bearer ${claimantToken}`).send({
      claimantName: 'Amina Wanjiku', respondentName: 'Second Demo Respondent', respondentAddress: 'Demo House, Nairobi', amount: 42000,
      claimType: 'Unpaid goods or services', story: 'I supplied goods after receiving a written order. The respondent accepted delivery but did not pay after two written follow ups.',
      language: 'en', courtStation: 'Milimani Small Claims Court', consent: true,
      evidence: [{ name: 'Second-Invoice.txt', type: 'text/plain', size: 128, category: 'agreement', extractedText: 'Invoice DEMO-42 for KES 42,000.' }],
    })
    const analyzed = await request(app).post(`/api/cases/${created.body.id}/analyze`).set('Authorization', `Bearer ${claimantToken}`)
    expect(analyzed.status).toBe(200)
    expect(analyzed.body.timeline.length).toBeGreaterThan(0)
    expect(analyzed.body.citations.every((citation: { id: string }) => citation.id.startsWith(`${created.body.id}:`))).toBe(true)
  })

  it('prevents a citizen from performing professional sign-off', async () => {
    const response = await request(app).patch('/api/cases/case-amina/status').set('Authorization', `Bearer ${claimantToken}`).send({ status: 'approved' })
    expect(response.status).toBe(403)
  })

  it('allows a lawyer to sign off and records the result', async () => {
    const response = await request(app).patch('/api/cases/case-amina/status').set('Authorization', `Bearer ${lawyerToken}`).send({ status: 'approved' })
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('approved')
    expect(response.body.audit.some((entry: { actor: string }) => entry.actor === 'David Mwangi')).toBe(true)
  })

  it('returns 404 instead of corrupting the audit log for a missing case', async () => {
    const response = await request(app).patch('/api/cases/not-a-case/status').set('Authorization', `Bearer ${lawyerToken}`).send({ status: 'approved' })
    expect(response.status).toBe(404)
  })

  it('serves detailed contract findings and the cross-platform capability manifest', async () => {
    const contract = await request(app).get('/api/contracts/demo').set('Authorization', `Bearer ${lawyerToken}`)
    expect(contract.status).toBe(200)
    expect(contract.body.findings).toHaveLength(3)
    const platform = await request(app).get('/api/platform').set('Authorization', `Bearer ${lawyerToken}`)
    expect(platform.status).toBe(200)
    expect(platform.body.clients).toContain('flutter-android')
  })

  it('accepts a real lawyer contract upload and returns labeled analysis', async () => {
    const response = await request(app)
      .post('/api/contracts/analyze')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .attach('document', Buffer.from('Supplier agreement with payment, termination, liability and data-processing clauses.'), { filename: 'Supplier-Agreement.txt', contentType: 'text/plain' })
    expect(response.status).toBe(200)
    expect(response.body.name).toBe('Supplier-Agreement.txt')
    expect(response.body.mode).toBe('rules-fallback')
    expect(response.body.findings.length).toBeGreaterThan(0)
  })

  it('reports voice configuration without exposing an API key', async () => {
    const response = await request(app).get('/api/voice/status').set('Authorization', `Bearer ${lawyerToken}`)
    expect(response.status).toBe(200)
    expect(response.body.enabled).toBe(false)
    expect(JSON.stringify(response.body)).not.toContain('OPENAI_API_KEY')
  })

  it('fails voice requests safely when the server key is absent', async () => {
    const response = await request(app).post('/api/voice/speak').set('Authorization', `Bearer ${lawyerToken}`).send({ text: 'Your case is ready for review.' })
    expect(response.status).toBe(503)
    expect(response.body.message).toContain('OPENAI_API_KEY')
  })

  it('generates a real PDF preparation pack', async () => {
    const response = await request(app).get('/api/cases/case-amina/pack').set('Authorization', `Bearer ${lawyerToken}`)
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF')
    const stats = await request(app).get('/api/stats').set('Authorization', `Bearer ${lawyerToken}`)
    expect(stats.body.activeCases).toBeGreaterThan(0)
    expect(stats.body.impact.packsCreated).toBeGreaterThan(0)
  })
})
