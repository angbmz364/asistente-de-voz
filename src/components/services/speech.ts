const SENTENCE_END = /[.!?¡¿\n](?=\s|$)/g
const MIN_CHUNK_SIZE = 80
const FIRST_CHUNK_SIZE = 40
const UTTERANCE_TIMEOUT_MS = 12000

function selectVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return voices.find(v => v.lang.startsWith('es')) ?? voices[0] ?? null
}

function extractSentenceChunks(
  buffer: string,
  minChunkSize: number = MIN_CHUNK_SIZE
): { chunks: string[]; remainder: string } {
  if (buffer.length < minChunkSize) {
    return { chunks: [], remainder: buffer }
  }

  const chunks: string[] = []
  let remaining = buffer
  SENTENCE_END.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = SENTENCE_END.exec(remaining)) !== null) {
    const endIdx = match.index + 1
    const chunk = remaining.slice(0, endIdx).trim()
    if (chunk) chunks.push(chunk)
    remaining = remaining.slice(endIdx).trimStart()
    if (remaining.length < minChunkSize) break
  }

  if (chunks.length === 0 && remaining.length >= minChunkSize) {
    const lastSpace = remaining.lastIndexOf(' ', Math.min(remaining.length, 150))
    if (lastSpace > minChunkSize / 2) {
      const chunk = remaining.slice(0, lastSpace).trim()
      chunks.push(chunk)
      remaining = remaining.slice(lastSpace).trimStart()
    }
  }

  return { chunks, remainder: remaining }
}

export type SpeakingChangeCallback = (speaking: boolean) => void

export class StreamingSpeech {
  private utteranceQueue: string[] = []
  private buffer = ''
  private speaking = false
  private voice: SpeechSynthesisVoice | null = null
  private onSpeakingChange: SpeakingChangeCallback | null = null
  private speakTimer: ReturnType<typeof setTimeout> | null = null
  private cancelled = false
  private hasSpoken = false

  constructor(onSpeakingChange?: SpeakingChangeCallback) {
    this.onSpeakingChange = onSpeakingChange ?? null
    if (typeof window !== 'undefined') {
      if (window.speechSynthesis.getVoices().length > 0) {
        this.voice = selectVoice()
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          this.voice = selectVoice()
        }
      }
    }
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  appendText(text: string): void {
    if (!this.isSupported()) return
    if (this.cancelled) return

    this.buffer += text
    const minSize = this.hasSpoken ? MIN_CHUNK_SIZE : FIRST_CHUNK_SIZE
    const { chunks, remainder } = extractSentenceChunks(this.buffer, minSize)
    this.buffer = remainder
    if (chunks.length > 0) {
      this.hasSpoken = true
      this.utteranceQueue.push(...chunks)
      this.processQueue()
    }
  }

  flush(): void {
    if (!this.isSupported()) return
    if (this.cancelled) return

    if (this.buffer) {
      const trimmed = this.buffer.trim()
      if (trimmed) {
        this.utteranceQueue.push(trimmed)
      }
      this.buffer = ''
    }
    this.processQueue()
  }

  cancel(): void {
    this.clearTimer()
    this.cancelled = true
    if (this.isSupported()) {
      window.speechSynthesis.cancel()
    }
    this.utteranceQueue = []
    this.buffer = ''
    this.hasSpoken = false
    this.speaking = false
    this.onSpeakingChange?.(false)
  }

  private clearTimer(): void {
    if (this.speakTimer !== null) {
      clearTimeout(this.speakTimer)
      this.speakTimer = null
    }
  }

  private processQueue(): void {
    if (this.speaking || this.utteranceQueue.length === 0) return
    if (this.cancelled) return

    const text = this.utteranceQueue.shift()!
    this.speaking = true
    this.onSpeakingChange?.(true)

    const utterance = new SpeechSynthesisUtterance(text)
    if (this.voice) utterance.voice = this.voice
    utterance.lang = this.voice?.lang ?? 'es-ES'
    utterance.rate = 1
    utterance.pitch = 1

    this.speakTimer = setTimeout(() => {
      this.speaking = false
      this.onSpeakingChange?.(false)
      this.processQueue()
    }, UTTERANCE_TIMEOUT_MS)

    utterance.onend = () => {
      this.clearTimer()
      if (this.cancelled) return
      this.speaking = false
      this.onSpeakingChange?.(false)
      this.processQueue()
    }

    utterance.onerror = () => {
      this.clearTimer()
      if (this.cancelled) return
      this.speaking = false
      this.onSpeakingChange?.(false)
      this.processQueue()
    }

    window.speechSynthesis.speak(utterance)
  }
}
