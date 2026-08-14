import {
  addConversationMessage,
  clearConversations,
  getConversationMessages,
} from "./database";

/**
 * Ventana corta de conversación (2-4 turnos) persistida en la tabla
 * `conversations` de SQLite (sobrevive recargas). Mantiene una espejo
 * en memoria para mantener la interfaz síncrona que usan los callers.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_TURNS = 4;

let windowMessages: Message[] = [];
let hydrated = false;

const hydrate = async (): Promise<void> => {
  if (hydrated) return;
  hydrated = true;
  try {
    windowMessages = (await getConversationMessages(MAX_TURNS)).slice(-MAX_TURNS);
  } catch (error) {
    console.warn("conversationStore: no se pudo cargar la ventana:", error);
  }
};

export function getHistory(): Message[] {
  void hydrate();
  return [...windowMessages];
}

export function addMessage(role: Message["role"], content: string): void {
  windowMessages.push({ role, content });
  if (windowMessages.length > MAX_TURNS) {
    windowMessages.splice(0, windowMessages.length - MAX_TURNS);
  }
  void addConversationMessage(role, content);
}

export function clearHistory(): void {
  windowMessages = [];
  void clearConversations();
}

export function buildContext(): string {
  if (windowMessages.length === 0) return "";
  const lines = windowMessages.map((m) =>
    `${m.role === "user" ? "usuario" : "asistente"}: ${m.content}`
  );
  return `Historial de la conversación:\n${lines.join("\n")}`;
}