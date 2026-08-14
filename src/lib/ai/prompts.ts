import type { AssistantState } from "../memory/stateStore";
import type { RetrievedChunk } from "../rag/retrieval";

/**
 * Persona de Nova, centralizada y delgada.
 * Se inyecta UNA vez como systemPrompt del provider; los prompts de
 * usuario llevan solo estado y contexto, sin instrucciones repetidas.
 */
export const SYSTEM_PROMPT = `Eres Nova, un asistente de voz educativo en español del Colegio San Carlos.
Ayudas al docente con tareas, grupos, estudiantes, pendientes, recordatorios y horario, y explicas temas académicos a los estudiantes.
Responde de forma corta, hablada y natural, sin listas, viñetas ni markdown. Responde siempre en español.
Usa la información provista; si algo no está en el contexto, admite que no lo sabes y no inventes datos.`;

const LARGE_DOCS = 5;
const LARGE_TURNS = 4;
const SMALL_DOCS = 3;
const SMALL_TURNS = 2;

/** Ollama y modelos chicos: presupuesto reducido de contexto. */
export const isSmallBudget = (): boolean =>
  (import.meta.env.VITE_LLM_PROVIDER ?? "gemini").toLowerCase() === "ollama";

export const getPromptBudget = (): { docs: number; turns: number } =>
  isSmallBudget() ? { docs: SMALL_DOCS, turns: SMALL_TURNS } : { docs: LARGE_DOCS, turns: LARGE_TURNS };

export type TurnInput = { role: "user" | "assistant"; content: string };

export function buildTurnsBlock(turns: TurnInput[]): string {
  if (turns.length === 0) return "";
  const lines = turns.map((t) => `${t.role === "user" ? "usuario" : "asistente"}: ${t.content}`);
  return `Últimos turnos:\n${lines.join("\n")}`;
}

export function buildStateBlock(state: AssistantState): string {
  const important =
    state.importantThings.length > 0 ? state.importantThings.join("; ") : "ninguna";
  const inPlay =
    state.entitiesInPlay.length > 0
      ? state.entitiesInPlay.map((e) => `${e.kind}#${e.id} (${e.label})`).join("; ")
      : "ninguna";
  const pending = state.pendingAction
    ? `confirmar borrado de ${state.pendingAction.target}`
    : "nada";

  return [
    "Estado actual:",
    `- Tema: ${state.topic ?? "ninguno"}`,
    `- Último usuario: ${state.lastUserMessage || "—"}`,
    `- Cosas importantes: ${important}`,
    `- En juego: ${inPlay}`,
    `- Pendiente: ${pending}`,
  ].join("\n");
}

export function buildDocsBlock(docs: RetrievedChunk[]): string {
  if (docs.length === 0) return "";
  const lines = docs.map((d) => `- ${d.content}`);
  return `Contexto recuperado:\n${lines.join("\n")}`;
}

/**
 * Ensambla el prompt de usuario con el presupuesto de tokens.
 * El bloque de estado y la ventana corta van SIEMPRE; los docs RAG
 * se recortan según presupuesto (Gemini amplio, Ollama reducido).
 */
export function buildUserPrompt(input: {
  transcript: string;
  state: AssistantState;
  docs: RetrievedChunk[];
  turns: TurnInput[];
  summary: string | null;
  budget: { docs: number; turns: number };
}): string {
  const { transcript, state, docs, turns, summary, budget } = input;

  const parts: string[] = [`El usuario dijo: "${transcript}"`];
  parts.push(buildStateBlock(state));

  if (docs.length > 0) {
    parts.push(buildDocsBlock(docs.slice(0, budget.docs)));
  }
  if (summary) {
    parts.push(`Resumen de sesiones previas: ${summary}`);
  }
  const windowTurns = turns.slice(-budget.turns);
  const turnsBlock = buildTurnsBlock(windowTurns);
  if (turnsBlock) {
    parts.push(turnsBlock);
  }

  return parts.join("\n\n");
}