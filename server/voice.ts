import OpenAI, { toFile } from 'openai'

export class VoiceUnavailableError extends Error {}

function client() {
  if (!process.env.OPENAI_API_KEY) throw new VoiceUnavailableError('Voice requires OPENAI_API_KEY on the Katiba OS server.')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export function voiceStatus() {
  return {
    enabled: Boolean(process.env.OPENAI_API_KEY),
    transcriptionModel: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe',
    speechModel: process.env.OPENAI_TTS_MODEL ?? 'tts-1',
    voice: process.env.OPENAI_TTS_VOICE ?? 'alloy',
  }
}

export async function transcribeAudio(input: { buffer: Buffer; filename: string; mimeType: string; language?: string }) {
  const audioFile = await toFile(input.buffer, input.filename, { type: input.mimeType })
  const result = await client().audio.transcriptions.create({
    file: audioFile,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe',
    ...(input.language ? { language: input.language } : {}),
    prompt: 'Legal intake statement for Katiba OS. Preserve names, dates, amounts in Kenyan shillings, and the speaker\'s plain language. Do not add facts.',
  })
  return result.text
}

export async function synthesizeSpeech(text: string) {
  const response = await client().audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL ?? 'tts-1',
    voice: process.env.OPENAI_TTS_VOICE ?? 'alloy',
    input: text,
    response_format: 'mp3',
  })
  return Buffer.from(await response.arrayBuffer())
}
