import type { CaseRecord, DashboardStats, IntakePayload, Role, User } from './types'

const apiBase = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')
const API = `${apiBase}/api`

export const SESSION_EXPIRED_EVENT = 'katiba:session-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('katiba_os_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function responseError(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string } | null
  const message = payload?.message ?? `Request failed (${response.status})`
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: message }))
  }
  return new ApiError(message, response.status)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<T>
}

export async function login(role: Role): Promise<{ token: string; user: User }> {
  return request('/auth/demo', { method: 'POST', body: JSON.stringify({ role }) })
}

export async function getSession(): Promise<{ token?: string; user: User }> {
  return request('/session')
}

export async function getCases(): Promise<CaseRecord[]> {
  return request('/cases')
}

export async function getCase(id: string): Promise<CaseRecord> {
  return request(`/cases/${id}`)
}

export async function getStats(): Promise<DashboardStats> {
  return request('/stats')
}

export async function createCase(payload: IntakePayload): Promise<CaseRecord> {
  return request('/cases', { method: 'POST', body: JSON.stringify(payload) })
}

export async function analyzeCase(id: string): Promise<CaseRecord> {
  return request(`/cases/${id}/analyze`, { method: 'POST' })
}

export async function extractEvidence(file: File): Promise<{ extractedText: string; aiMode: 'openai' | 'local' | 'demo'; message?: string }> {
  const form = new FormData()
  form.append('evidence', file, file.name)
  return request('/evidence/extract', { method: 'POST', body: form })
}

export async function updateCaseDetails(id: string, details: { respondentAddress: string }): Promise<CaseRecord> {
  return request(`/cases/${id}/details`, { method: 'PATCH', body: JSON.stringify(details) })
}

export async function updateCaseStatus(id: string, status: string): Promise<CaseRecord> {
  return request(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function voiceRequest(path: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers)
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' })
  if (!response.ok) throw await responseError(response)
  return response
}

export async function transcribeVoice(audio: Blob, language: 'en' | 'sw'): Promise<string> {
  const form = new FormData()
  const extension = audio.type.includes('webm') ? 'webm' : audio.type.includes('mp4') ? 'm4a' : 'wav'
  form.append('audio', audio, `katiba-intake.${extension}`)
  form.append('language', language)
  const response = await voiceRequest('/voice/transcribe', { method: 'POST', body: form })
  const payload = await response.json() as { text?: string }
  if (!payload.text?.trim()) throw new Error('No speech was detected. Please try again.')
  return payload.text.trim()
}

export async function speakText(text: string): Promise<Blob> {
  const response = await voiceRequest('/voice/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  return response.blob()
}

async function fetchCasePack(id: string) {
  const response = await fetch(`${API}/cases/${id}/pack`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!response.ok) throw await responseError(response)
  const blob = await response.blob()
  if (!blob.type.includes('pdf')) throw new Error('The server did not return a valid PDF pack.')
  return blob
}

export async function openCasePack(id: string, page = 1) {
  const preview = window.open('about:blank', '_blank')
  if (preview) {
    preview.opener = null
    preview.document.title = 'Opening Katiba OS PDF pack…'
    preview.document.body.textContent = 'Preparing your secure PDF pack…'
  }
  try {
    const blob = await fetchCasePack(id)
    const url = URL.createObjectURL(blob)
    if (preview) preview.location.replace(`${url}#page=${page}`)
    else {
      const link = document.createElement('a')
      link.href = url
      link.download = `Katiba-OS-${id}-pack.pdf`
      link.click()
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
  } catch (error) {
    preview?.close()
    throw error
  }
}

export async function downloadCasePack(id: string) {
  const blob = await fetchCasePack(id)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Katiba-OS-${id}-pack.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
