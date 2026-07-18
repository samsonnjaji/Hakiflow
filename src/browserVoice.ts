export function browserSpeechAvailable() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speakWithBrowser(text: string, language: 'en' | 'sw' = 'en') {
  return new Promise<void>((resolve, reject) => {
    if (!browserSpeechAvailable()) {
      reject(new Error('Speech playback is not supported by this browser.'))
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'sw' ? 'sw-KE' : 'en-KE'
    utterance.rate = 0.96
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const languagePrefix = language === 'sw' ? 'sw' : 'en'
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix)) ?? null
    utterance.onend = () => resolve()
    utterance.onerror = () => reject(new Error('The browser could not play the spoken summary.'))
    window.speechSynthesis.speak(utterance)
  })
}

export function stopBrowserSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
