import type { CaseRecord, DashboardStats, User } from '../types'

export const demoUsers: Record<'claimant' | 'paralegal' | 'lawyer', User> = {
  claimant: { id: 'user-amina', name: 'Amina Wanjiku', email: 'amina@demo.katibaos.ke', role: 'claimant', initials: 'AW' },
  paralegal: { id: 'user-njeri', name: 'Njeri Kamau', email: 'njeri@demo.katibaos.ke', role: 'paralegal', initials: 'NK' },
  lawyer: { id: 'user-david', name: 'David Mwangi', email: 'david@demo.katibaos.ke', role: 'lawyer', initials: 'DM' },
}

export const demoCase: CaseRecord = {
  id: 'case-amina',
  reference: 'KO-2026-0042',
  claimantName: 'Amina Wanjiku',
  respondentName: 'MetroBuild Supplies Ltd',
  amount: 86000,
  currency: 'KES',
  claimType: 'Unpaid goods supplied',
  story: 'I supplied salon fittings worth KES 111,000 to MetroBuild Supplies. They paid a KES 25,000 deposit by M-Pesa and promised to clear the balance after delivery. The goods were delivered and signed for, but the KES 86,000 balance remains unpaid despite follow-ups.',
  language: 'sw',
  courtStation: 'Milimani Small Claims Court',
  status: 'ready_review',
  completeness: 84,
  createdAt: '2026-07-14T09:20:00.000Z',
  updatedAt: '2026-07-18T08:42:00.000Z',
  aiMode: 'demo',
  summary: 'A contractual claim for KES 86,000 arising from goods supplied and accepted but not fully paid for.',
  nextAction: 'Add the respondent’s service address, then request paralegal review.',
  evidence: [
    { id: 'ev-invoice', name: 'Invoice_MB104.pdf', type: 'application/pdf', category: 'agreement', size: 184200, addedAt: '2026-07-14T09:31:00.000Z', verified: true },
    { id: 'ev-mpesa', name: 'MPESA_Deposit.png', type: 'image/png', category: 'payment', size: 248900, addedAt: '2026-07-14T09:33:00.000Z', verified: true },
    { id: 'ev-chat', name: 'WhatsApp_Promise.png', type: 'image/png', category: 'communication', size: 412100, addedAt: '2026-07-14T09:34:00.000Z', verified: true },
    { id: 'ev-delivery', name: 'Signed_Delivery_Note.pdf', type: 'application/pdf', category: 'delivery', size: 221500, addedAt: '2026-07-14T09:35:00.000Z', verified: true },
  ],
  timeline: [
    { id: 'tl-1', date: '2026-05-06', title: 'Invoice issued', detail: 'Invoice MB104 records salon fittings valued at KES 111,000.', evidenceIds: ['ev-invoice'], confidence: 97 },
    { id: 'tl-2', date: '2026-05-07', title: 'Deposit received', detail: 'M-Pesa deposit of KES 25,000 received from the respondent.', evidenceIds: ['ev-mpesa'], confidence: 99 },
    { id: 'tl-3', date: '2026-05-12', title: 'Goods delivered', detail: 'Delivery note signed on behalf of MetroBuild Supplies Ltd.', evidenceIds: ['ev-delivery'], confidence: 94 },
    { id: 'tl-4', date: '2026-05-20', title: 'Balance acknowledged', detail: 'Respondent promised in writing to clear the KES 86,000 balance.', evidenceIds: ['ev-chat'], confidence: 91 },
    { id: 'tl-5', date: '2026-06-02', title: 'Payment deadline passed', detail: 'No further payment appears in the submitted evidence.', evidenceIds: ['ev-chat'], confidence: 86 },
  ],
  issues: [
    { id: 'issue-1', severity: 'strength', title: 'Debt is acknowledged', detail: 'The written promise supports the existence and amount of the outstanding balance.' },
    { id: 'issue-2', severity: 'strength', title: 'Delivery is documented', detail: 'The signed delivery note connects the invoice to performance by the claimant.' },
    { id: 'issue-3', severity: 'missing', title: 'Service address missing', detail: 'A physical or reliable service address for the respondent has not been supplied.', action: 'Add respondent address' },
    { id: 'issue-4', severity: 'attention', title: 'Confirm company identity', detail: 'Confirm the respondent’s registered name before the filing pack is finalized.', action: 'Verify company details' },
  ],
  citations: [
    { id: 'cite-1', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 12(1)(a) and 12(3)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'The Court may hear claims relating to the sale and supply of goods up to KES 1,000,000.' },
    { id: 'cite-2', label: 'Small Claims Court Act', source: 'Kenya Law', section: 'Section 34(1)', url: 'https://new.kenyalaw.org/akn/ke/act/2016/2/eng@2021-03-30', proposition: 'Claims are intended to be heard and determined within sixty days of filing.' },
    { id: 'cite-3', label: 'Small Claims Court forms', source: 'Judiciary of Kenya', section: 'Official forms', url: 'https://judiciary.go.ke/download/small-claims-court-form/', proposition: 'The filing pack should use the prescribed court forms.' },
  ],
  audit: [
    { id: 'audit-1', action: 'Consent recorded', actor: 'Amina Wanjiku', createdAt: '2026-07-14T09:20:00.000Z', detail: 'Purpose-specific consent recorded for evidence analysis.' },
    { id: 'audit-2', action: 'Evidence analyzed', actor: 'Katiba AI', createdAt: '2026-07-14T09:36:00.000Z', detail: 'Four evidence items processed; originals left unchanged.' },
    { id: 'audit-3', action: 'Draft generated', actor: 'Katiba AI', createdAt: '2026-07-18T08:42:00.000Z', detail: 'Demand letter and claim summary drafted for human review.' },
  ],
}

export const demoStats: DashboardStats = {
  activeCases: 12,
  readyForReview: 4,
  evidenceItems: 47,
  averageReadiness: 78,
  casesByStatus: [
    { name: 'Intake', value: 3 },
    { name: 'Needs evidence', value: 5 },
    { name: 'Ready', value: 4 },
  ],
  impact: { peopleGuided: 128, packsCreated: 76, hoursSaved: 304 },
}
