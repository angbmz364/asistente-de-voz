interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'nova_conversation_v1'
const MAX_TURNS = 6

export function getHistory(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Message[]
  } catch {
    return []
  }
}

export function addMessage(role: Message['role'], content: string): void {
  const history = getHistory()
  history.push({ role, content })
  if (history.length > MAX_TURNS) {
    history.splice(0, history.length - MAX_TURNS)
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function clearHistory(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function buildContext(): string {
  const history = getHistory()
  if (history.length === 0) return ''
  const lines = history.map(m =>
    `${m.role === 'user' ? 'usuario' : 'asistente'}: ${m.content}`
  )
  return `Historial de la conversación:\n${lines.join('\n')}`
}
