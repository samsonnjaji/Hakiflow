import { demoCase, demoStats, demoUsers } from './data/demo'
import type { CaseRecord, DashboardStats, IntakePayload, Role, User } from './types'

const API = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api`

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('katiba_os_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Request failed')
  return response.json() as Promise<T>
}

export async function login(role: Role): Promise<{ token: string; user: User }> {
  try { return await request('/auth/demo', { method: 'POST', body: JSON.stringify({ role }) }) }
  catch { return { token: `offline-${role}`, user: demoUsers[role] } }
}

export async function getCases(): Promise<CaseRecord[]> {
  try { return await request('/cases') } catch { return [demoCase] }
}

export async function getCase(id: string): Promise<CaseRecord> {
  try { return await request(`/cases/${id}`) } catch { return { ...demoCase, id } }
}

export async function getStats(): Promise<DashboardStats> {
  try { return await request('/stats') } catch { return demoStats }
}

export async function createCase(payload: IntakePayload): Promise<CaseRecord> {
  try { return await request('/cases', { method: 'POST', body: JSON.stringify(payload) }) }
  catch {
    const now = new Date().toISOString()
    const offline: CaseRecord = { ...demoCase, id: `offline-${Date.now()}`, reference: 'KO-OFFLINE-DRAFT', ...payload, evidence: payload.evidence.map((item, index) => ({ ...item, id: `offline-evidence-${index}`, addedAt: now, verified: false })), status: 'draft' }
    localStorage.setItem('katiba_os_offline_case', JSON.stringify(offline))
    return offline
  }
}

export async function analyzeCase(id: string): Promise<CaseRecord> {
  try { return await request(`/cases/${id}/analyze`, { method: 'POST' }) }
  catch { return { ...demoCase, id } }
}

export async function updateCaseStatus(id: string, status: string): Promise<CaseRecord> {
  return request(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function voiceRequest(path: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers)
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))
  const response = await fetch(`${API}${path}`, { ...options, headers })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? 'Voice service is temporarily unavailable')
  }
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

export function packUrl(id: string) {
  const token = localStorage.getItem('katiba_os_token') ?? ''
  return `${API}/cases/${id}/pack?token=${encodeURIComponent(token)}`
}
