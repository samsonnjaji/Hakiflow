import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Camera, Check, FileImage, FileText, LockKeyhole, Mic2, Paperclip, Sparkles, UploadCloud, X } from 'lucide-react'
import { analyzeCase, createCase, transcribeVoice } from '../api'
import { PageHeader } from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import type { Evidence, IntakePayload } from '../types'

type Draft = Omit<IntakePayload, 'evidence'> & { evidence: IntakePayload['evidence'] }
const initialDraft: Draft = {
  claimantName: '', respondentName: '', respondentAddress: '', amount: 0,
  claimType: 'Unpaid goods or services', story: '', language: 'en',
  courtStation: 'Milimani Small Claims Court', evidence: [], consent: false,
}

const demoStory = 'I supplied salon fittings worth KES 111,000 to MetroBuild Supplies. They paid a KES 25,000 deposit by M-Pesa and promised to clear the balance after delivery. The goods were delivered and signed for on 12 May, but the KES 86,000 balance remains unpaid despite my follow-ups.'

function inferCategory(name: string): Evidence['category'] {
  const lower = name.toLowerCase()
  if (lower.includes('mpesa') || lower.includes('receipt') || lower.includes('payment')) return 'payment'
  if (lower.includes('chat') || lower.includes('whatsapp') || lower.includes('message')) return 'communication'
  if (lower.includes('deliver')) return 'delivery'
  if (lower.includes('invoice') || lower.includes('contract') || lower.includes('agreement')) return 'agreement'
  return 'other'
}

export function IntakePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [step, setStep] = useState(1)
  const [analyzing, setAnalyzing] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = localStorage.getItem('katiba_os_intake_draft')
    return saved ? JSON.parse(saved) as Draft : { ...initialDraft, claimantName: user?.name ?? '' }
  })

  useEffect(() => { localStorage.setItem('katiba_os_intake_draft', JSON.stringify(draft)) }, [draft])
  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])
  const progress = step * 25
  const canContinue = useMemo(() => {
    if (step === 1) return draft.story.trim().length >= 40
    if (step === 2) return !!draft.respondentName && draft.amount > 0 && draft.amount <= 1_000_000
    if (step === 3) return draft.evidence.length > 0
    return draft.consent
  }, [draft, step])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })) }

  function loadDemo() {
    setDraft({
      claimantName: user?.name ?? 'Amina Wanjiku', respondentName: 'MetroBuild Supplies Ltd', respondentAddress: '', amount: 86000,
      claimType: 'Unpaid goods or services', story: demoStory, language: 'sw', courtStation: 'Milimani Small Claims Court',
      consent: false, evidence: [
        { name: 'Invoice_MB104.pdf', type: 'application/pdf', size: 184200, category: 'agreement' },
        { name: 'MPESA_Deposit.png', type: 'image/png', size: 248900, category: 'payment' },
        { name: 'WhatsApp_Promise.png', type: 'image/png', size: 412100, category: 'communication' },
        { name: 'Signed_Delivery_Note.pdf', type: 'application/pdf', size: 221500, category: 'delivery' },
      ],
    })
  }

  async function toggleVoice() {
    if (listening) {
      mediaRecorderRef.current?.stop()
      return
    }

    setVoiceError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('This browser does not support microphone recording. You can still type or use the Flutter app.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioChunksRef.current = []
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
        setListening(false)
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (!audio.size) {
          setVoiceError('No audio was captured. Please try again.')
          return
        }
        setTranscribing(true)
        try {
          const transcript = await transcribeVoice(audio, draft.language)
          setDraft((current) => ({
            ...current,
            story: [current.story.trim(), transcript].filter(Boolean).join('\n\n'),
          }))
        } catch (reason) {
          setVoiceError(reason instanceof Error ? reason.message : 'The recording could not be transcribed.')
        } finally {
          setTranscribing(false)
        }
      }
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop())
        setListening(false)
        setVoiceError('Microphone recording stopped unexpectedly. Please try again.')
      }
      recorder.start(250)
      setListening(true)
    } catch (reason) {
      setVoiceError(reason instanceof DOMException && reason.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow access in your browser, then try again.'
        : 'The microphone could not be started. Please check your device settings.')
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const next = Array.from(files).map((file) => ({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, category: inferCategory(file.name) }))
    update('evidence', [...draft.evidence, ...next])
  }

  async function finish() {
    if (!canContinue) return
    setAnalyzing(true); setError('')
    try {
      const created = await createCase(draft)
      const analyzed = await analyzeCase(created.id)
      localStorage.removeItem('katiba_os_intake_draft')
      navigate(`/app/cases/${analyzed.id}?new=1`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Analysis could not be completed. Try again.')
      setAnalyzing(false)
    }
  }

  return (
    <div className="page intake-page">
      <PageHeader eyebrow="Guided claim intake" title="Let’s turn your story into a clear case." copy="Your draft saves automatically and can be completed offline." action={<button className="button button-quiet" onClick={loadDemo}><Sparkles size={17} /> Load demo scenario</button>} />

      <div className="intake-layout">
        <aside className="intake-steps" aria-label="Intake progress">
          <div className="progress-summary"><span>{progress}%</span><i><b style={{ width: `${progress}%` }} /></i></div>
          {['Tell your story', 'Claim details', 'Add evidence', 'Review & consent'].map((label, index) => {
            const number = index + 1
            return <button key={label} className={`${number === step ? 'active' : ''} ${number < step ? 'done' : ''}`} onClick={() => number < step && setStep(number)} disabled={number > step}>
              <span>{number < step ? <Check size={16} /> : number}</span><div><strong>{label}</strong><small>{number < step ? 'Complete' : number === step ? 'In progress' : 'Next'}</small></div>
            </button>
          })}
          <div className="intake-security"><LockKeyhole size={18} /><p><strong>Private workspace</strong><small>Nothing is submitted to a court automatically.</small></p></div>
        </aside>

        <section className="card intake-card" aria-live="polite">
          {step === 1 && <div className="step-panel">
            <span className="step-eyebrow">Step 1 of 4</span><h2>What happened?</h2><p>Use your own words. Dates and exact legal terms are not required yet.</p>
            <div className="language-toggle" aria-label="Input language"><button className={draft.language === 'en' ? 'active' : ''} onClick={() => update('language', 'en')}>English</button><button className={draft.language === 'sw' ? 'active' : ''} onClick={() => update('language', 'sw')}>Kiswahili</button></div>
            <label className="field"><span>Your story <b>*</b></span><textarea rows={9} value={draft.story} onChange={(e) => update('story', e.target.value)} placeholder="For example: I supplied goods in May, but the buyer has not paid the remaining balance..." /><small>{draft.story.length} characters · minimum 40</small></label>
            <div className="voice-row"><button className={`voice-button ${listening ? 'listening' : ''}`} onClick={toggleVoice} disabled={transcribing} aria-pressed={listening}><span><Mic2 /></span><div><strong>{transcribing ? 'Transcribing…' : listening ? 'Stop and transcribe' : 'Speak instead'}</strong><small>{listening ? 'Recording securely — tap when finished' : transcribing ? 'Turning speech into editable text' : 'English or Kiswahili voice intake'}</small></div>{(listening || transcribing) && <i />}</button><p>Voice is transcribed for your review. You can edit every word.</p></div>
            {voiceError && <div className="inline-error" role="alert">{voiceError}</div>}
          </div>}

          {step === 2 && <div className="step-panel">
            <span className="step-eyebrow">Step 2 of 4</span><h2>Who and how much?</h2><p>These details help check whether the Small Claims Court is the right path.</p>
            <div className="form-grid two-cols">
              <label className="field"><span>Your full name <b>*</b></span><input value={draft.claimantName} onChange={(e) => update('claimantName', e.target.value)} autoComplete="name" /></label>
              <label className="field"><span>Who owes you? <b>*</b></span><input value={draft.respondentName} onChange={(e) => update('respondentName', e.target.value)} placeholder="Person or registered business" /></label>
              <label className="field"><span>Amount outstanding (KES) <b>*</b></span><input type="number" inputMode="numeric" value={draft.amount || ''} onChange={(e) => update('amount', Number(e.target.value))} max={1_000_000} /><small>Small Claims Court limit: KES 1,000,000</small></label>
              <label className="field"><span>Type of claim</span><select value={draft.claimType} onChange={(e) => update('claimType', e.target.value)}><option>Unpaid goods or services</option><option>Money lent or held</option><option>Property damage</option><option>Personal injury compensation</option><option>Recovery of movable property</option></select></label>
              <label className="field full"><span>Respondent’s service address</span><input value={draft.respondentAddress} onChange={(e) => update('respondentAddress', e.target.value)} placeholder="Building, street, town — you can add this later" /><small>Helpful for service, but not required to continue this draft.</small></label>
              <label className="field full"><span>Likely court station</span><select value={draft.courtStation} onChange={(e) => update('courtStation', e.target.value)}><option>Milimani Small Claims Court</option><option>Kiambu Small Claims Court</option><option>Thika Small Claims Court</option><option>Mombasa Small Claims Court</option><option>Not sure yet</option></select></label>
            </div>
            {draft.amount > 1_000_000 && <div className="inline-error" role="alert">This amount is above the current KES 1,000,000 Small Claims Court limit. Katiba OS can still organize your evidence, but a different court path may apply.</div>}
          </div>}

          {step === 3 && <div className="step-panel">
            <span className="step-eyebrow">Step 3 of 4</span><h2>Add what supports your story.</h2><p>Useful evidence includes invoices, M-Pesa records, chats, receipts, and signed delivery notes.</p>
            <input ref={fileRef} className="visually-hidden" type="file" multiple accept="image/*,.pdf,.txt" onChange={(e) => addFiles(e.target.files)} />
            <button className="upload-zone" onClick={() => fileRef.current?.click()}><span><UploadCloud /></span><strong>Choose evidence files</strong><small>PDF, PNG, JPG, or TXT · files remain unchanged</small><div><span><Camera size={17} /> Use camera</span><span><Paperclip size={17} /> Browse files</span></div></button>
            <div className="evidence-upload-list">
              {draft.evidence.map((item, index) => <div key={`${item.name}-${index}`}>
                <span className="file-icon">{item.type.includes('image') ? <FileImage /> : <FileText />}</span>
                <p><strong>{item.name}</strong><small>{item.category} · {(item.size / 1024).toFixed(0)} KB</small></p>
                <span className="scan-complete"><Sparkles size={14} /> Ready</span>
                <button className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => update('evidence', draft.evidence.filter((_, i) => i !== index))}><X /></button>
              </div>)}
              {!draft.evidence.length && <div className="empty-upload"><FileText /><p><strong>No evidence added yet</strong><small>Add at least one item to continue.</small></p></div>}
            </div>
          </div>}

          {step === 4 && <div className="step-panel review-step">
            <span className="step-eyebrow">Step 4 of 4</span><h2>Ready for the evidence check.</h2><p>Katiba AI will organize facts and identify gaps. It will not decide your case or submit anything.</p>
            <div className="review-summary">
              <div><small>Claimant</small><strong>{draft.claimantName}</strong></div><div><small>Respondent</small><strong>{draft.respondentName}</strong></div><div><small>Amount</small><strong>KES {draft.amount.toLocaleString()}</strong></div><div><small>Evidence</small><strong>{draft.evidence.length} items</strong></div>
            </div>
            <div className="ai-will-do"><div><Sparkles /></div><p><strong>What the AI will do</strong><span>Extract dates, amounts, parties, and promises</span><span>Build an evidence-linked timeline</span><span>Check basic Small Claims Court eligibility</span><span>Show its sources and confidence</span></p></div>
            <label className="consent-check"><input type="checkbox" checked={draft.consent} onChange={(e) => update('consent', e.target.checked)} /><span><Check /></span><p><strong>I consent to this evidence being analyzed for this claim.</strong><small>I understand the result is guidance and a draft for human review, not legal representation or a court decision.</small></p></label>
            {error && <div className="inline-error" role="alert">{error}</div>}
          </div>}

          <footer className="step-footer">
            <button className="button button-quiet" onClick={() => step > 1 ? setStep(step - 1) : navigate('/app')}><ArrowLeft size={18} /> {step > 1 ? 'Back' : 'Cancel'}</button>
            {step < 4 ? <button className="button button-primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={18} /></button> : <button className="button button-primary analyze-button" disabled={!canContinue || analyzing} onClick={finish}>{analyzing ? <><span className="spinner" /> Building evidence graph…</> : <><Sparkles size={18} /> Analyze my case</>}</button>}
          </footer>
        </section>
      </div>
    </div>
  )
}
