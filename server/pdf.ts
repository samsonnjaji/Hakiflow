import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CaseRecord } from '../src/types'

const colors = {
  ink: rgb(0.08, 0.14, 0.12), muted: rgb(0.35, 0.42, 0.39), green: rgb(0.18, 0.47, 0.36),
  pale: rgb(0.93, 0.96, 0.94), cream: rgb(0.97, 0.96, 0.92), border: rgb(0.84, 0.86, 0.83), white: rgb(1, 1, 1),
}

function pdfText(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, '?')
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfText(text).replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) { lines.push(current); current = word } else current = next
  }
  if (current) lines.push(current)
  return lines
}

function drawParagraph(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size = 10, lineHeight = 15, color = colors.muted) {
  const lines = wrap(text, font, size, width)
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, font, size, color }))
  return y - lines.length * lineHeight
}

export async function buildCasePack(record: CaseRecord) {
  const doc = await PDFDocument.create()
  doc.setTitle(`${record.reference} Katiba OS preparation pack`)
  doc.setAuthor('Katiba OS')
  doc.setSubject('Human-review legal preparation pack')
  const body = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold)

  function addPage(title: string, kicker: string) {
    const page = doc.addPage([595.28, 841.89])
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: colors.cream })
    page.drawRectangle({ x: 0, y: 765, width: 595.28, height: 77, color: rgb(0.07, 0.18, 0.15) })
    page.drawText('KATIBA OS', { x: 42, y: 808, font: bold, size: 12, color: colors.white })
    page.drawText('JUSTICE ENGINE', { x: 42, y: 790, font: body, size: 7, color: rgb(0.55, 0.82, 0.68) })
    page.drawText(pdfText(record.reference), { x: 474, y: 801, font: bold, size: 8, color: colors.white })
    page.drawText(kicker.toUpperCase(), { x: 42, y: 729, font: bold, size: 7, color: colors.green })
    page.drawText(title, { x: 42, y: 696, font: serif, size: 25, color: colors.ink })
    page.drawLine({ start: { x: 42, y: 677 }, end: { x: 553, y: 677 }, thickness: 1, color: colors.border })
    page.drawText('Preparation aid - requires human review - not proof of court filing', { x: 42, y: 28, font: body, size: 7, color: colors.muted })
    page.drawText(`Generated ${new Date().toLocaleDateString('en-KE')}`, { x: 455, y: 28, font: body, size: 7, color: colors.muted })
    return page
  }

  const summary = addPage('Claim preparation summary', 'Case overview')
  summary.drawText('PARTIES AND VALUE', { x: 42, y: 644, font: bold, size: 7, color: colors.muted })
  summary.drawRectangle({ x: 42, y: 540, width: 511, height: 88, color: colors.pale, borderColor: colors.border, borderWidth: .7 })
  summary.drawText('CLAIMANT', { x: 57, y: 604, font: bold, size: 6.5, color: colors.muted })
  summary.drawText(pdfText(record.claimantName), { x: 57, y: 583, font: bold, size: 11, color: colors.ink })
  summary.drawText('RESPONDENT', { x: 233, y: 604, font: bold, size: 6.5, color: colors.muted })
  summary.drawText(pdfText(record.respondentName).slice(0, 38), { x: 233, y: 583, font: bold, size: 11, color: colors.ink })
  summary.drawText('AMOUNT CLAIMED', { x: 421, y: 604, font: bold, size: 6.5, color: colors.muted })
  summary.drawText(`KES ${record.amount.toLocaleString()}`, { x: 421, y: 582, font: serif, size: 15, color: colors.green })
  summary.drawText(pdfText(record.courtStation), { x: 57, y: 556, font: body, size: 7.5, color: colors.muted })
  summary.drawText('CASE IN PLAIN LANGUAGE', { x: 42, y: 507, font: bold, size: 7, color: colors.muted })
  let y = drawParagraph(summary, record.summary, 42, 480, 511, body, 11, 17, colors.ink)
  y -= 16
  summary.drawText('CLAIMANT STATEMENT', { x: 42, y, font: bold, size: 7, color: colors.muted })
  y = drawParagraph(summary, record.story, 42, y - 26, 511, body, 9.5, 15)
  y -= 14
  summary.drawText('NEXT REVIEW ACTION', { x: 42, y, font: bold, size: 7, color: colors.green })
  summary.drawRectangle({ x: 42, y: y - 59, width: 511, height: 45, color: colors.pale, borderColor: colors.green, borderWidth: .7 })
  drawParagraph(summary, record.nextAction, 57, y - 36, 480, bold, 9.5, 14, colors.ink)

  const demand = addPage('Draft demand letter', 'Pre-filing communication')
  demand.drawText(pdfText(new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })), { x: 42, y: 642, font: body, size: 9, color: colors.muted })
  demand.drawText(pdfText(record.respondentName), { x: 42, y: 612, font: bold, size: 10, color: colors.ink })
  drawParagraph(demand, record.respondentAddress || '[Respondent service address to be confirmed]', 42, 595, 511, body, 9, 14)
  demand.drawText(`RE: DEMAND FOR PAYMENT OF KES ${record.amount.toLocaleString()}`, { x: 42, y: 536, font: bold, size: 10, color: colors.ink })
  let demandY = drawParagraph(demand, `I, ${record.claimantName}, write concerning ${record.claimType.toLowerCase()}. The current claim record states that KES ${record.amount.toLocaleString()} remains outstanding.`, 42, 505, 511, body, 10, 16, colors.ink)
  demandY = drawParagraph(demand, record.summary, 42, demandY - 18, 511, body, 10, 16, colors.ink)
  demandY = drawParagraph(demand, 'Please pay the outstanding amount or provide a written response within seven days of receiving this letter. If the matter is not resolved, I may consider the appropriate Small Claims Court process after professional review.', 42, demandY - 18, 511, body, 10, 16, colors.ink)
  demand.drawRectangle({ x: 42, y: demandY - 92, width: 511, height: 72, color: colors.pale, borderColor: colors.green, borderWidth: .7 })
  demand.drawText('DRAFT - REVIEW BEFORE SENDING', { x: 57, y: demandY - 45, font: bold, size: 7, color: colors.green })
  drawParagraph(demand, 'Confirm the respondent identity, service address, amount, deadline, and supporting records. Sending this draft is a human decision.', 57, demandY - 63, 475, body, 8, 12, colors.ink)

  const evidence = addPage('Evidence index and chronology', 'Evidence engine')
  evidence.drawText(`${record.evidence.length} SOURCE ITEMS`, { x: 42, y: 646, font: bold, size: 7, color: colors.muted })
  let evidenceY = 620
  record.evidence.slice(0, 7).forEach((item, index) => {
    evidence.drawRectangle({ x: 42, y: evidenceY - 48, width: 511, height: 46, color: index % 2 ? colors.cream : colors.pale })
    evidence.drawText(`E${index + 1}`, { x: 55, y: evidenceY - 21, font: bold, size: 8, color: colors.green })
    evidence.drawText(pdfText(item.name).slice(0, 58), { x: 92, y: evidenceY - 19, font: bold, size: 8.5, color: colors.ink })
    evidence.drawText(`${item.category.toUpperCase()}  |  ${(item.size / 1024).toFixed(0)} KB  |  checksum recorded`, { x: 92, y: evidenceY - 34, font: body, size: 6.5, color: colors.muted })
    evidenceY -= 52
  })
  evidenceY -= 12
  evidence.drawText('EVIDENCE-LINKED CHRONOLOGY', { x: 42, y: evidenceY, font: bold, size: 7, color: colors.muted })
  evidenceY -= 27
  record.timeline.slice(0, 6).forEach((event) => {
    evidence.drawCircle({ x: 52, y: evidenceY + 2, size: 4, color: colors.green })
    evidence.drawText(new Date(event.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }), { x: 68, y: evidenceY, font: bold, size: 7, color: colors.green })
    evidence.drawText(pdfText(event.title), { x: 158, y: evidenceY, font: bold, size: 8.5, color: colors.ink })
    evidenceY = drawParagraph(evidence, event.detail, 158, evidenceY - 14, 375, body, 7.5, 11) - 13
  })

  const review = addPage('Filing checklist and AI findings', 'Explainable human review')
  review.drawText(`READINESS ${record.completeness}%`, { x: 42, y: 645, font: bold, size: 7, color: colors.green })
  let issueY = 615
  record.issues.slice(0, 5).forEach((issue) => {
    const accent = issue.severity === 'strength' ? colors.green : issue.severity === 'missing' ? rgb(.65,.25,.25) : rgb(.72,.48,.16)
    review.drawRectangle({ x: 42, y: issueY - 60, width: 511, height: 56, color: colors.pale, borderColor: accent, borderWidth: .8 })
    review.drawText(issue.severity.toUpperCase(), { x: 56, y: issueY - 22, font: bold, size: 6, color: accent })
    review.drawText(pdfText(issue.title).slice(0, 58), { x: 130, y: issueY - 22, font: bold, size: 8.5, color: colors.ink })
    drawParagraph(review, issue.detail, 56, issueY - 39, 475, body, 7, 10)
    issueY -= 66
  })
  issueY -= 8
  review.drawText('VETTED LEGAL SOURCES', { x: 42, y: issueY, font: bold, size: 7, color: colors.muted })
  issueY -= 23
  record.citations.forEach((citation, index) => {
    review.drawText(pdfText(`${index + 1}. ${citation.label} - ${citation.section}`), { x: 49, y: issueY, font: bold, size: 7.5, color: colors.ink })
    issueY = drawParagraph(review, citation.proposition, 64, issueY - 13, 470, body, 7, 10) - 8
  })
  review.drawRectangle({ x: 42, y: 67, width: 511, height: 80, color: colors.pale, borderColor: colors.green, borderWidth: .7 })
  review.drawText('HUMAN REVIEW GATE', { x: 57, y: 127, font: bold, size: 7, color: colors.green })
  drawParagraph(review, 'Confirm party identities, service address, figures, source documents, current Judiciary forms, and the appropriate filing path before this pack is used.', 57, 108, 478, body, 8, 12, colors.ink)

  return doc.save()
}
