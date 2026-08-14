/**
 * Memoria de trabajo (snapshot) de Nova.
 * Determinista: sin llamadas LLM. Persistida en localStorage y
 * cacheada en memoria. Se resetea con >30 min de inactividad.
 */

export type StateEntityKind = "homework" | "group" | "student" | "fact";

export type StateEntity = {
  kind: StateEntityKind;
  id: number;
  label: string;
};

export type AssistantState = {
  topic: string | null;
  lastUserMessage: string;
  lastAssistantSummary: string;
  importantThings: string[];
  entitiesInPlay: StateEntity[];
  pendingAction: { action: "delete"; target: string } | null;
  recentIntents: string[];
  sessionId: string;
  updatedAt: string;
};

export type UpdateStateInput = {
  userMessage: string;
  intent: string;
  slots?: Record<string, unknown>;
  executorResult?: {
    kind?: StateEntityKind;
    itemLabel?: string;
    removedLabel?: string;
    entities?: StateEntity[];
  };
  response?: string;
};

const STORAGE_KEY = "nova_assistant_state_v1";
const IDLE_RESET_MS = 30 * 60 * 1000;
const MAX_IMPORTANT = 8;
const MAX_RECENT_INTENTS = 5;

let cache: AssistantState | null = null;

const newSessionId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const defaultState = (): AssistantState => ({
  topic: null,
  lastUserMessage: "",
  lastAssistantSummary: "",
  importantThings: [],
  entitiesInPlay: [],
  pendingAction: null,
  recentIntents: [],
  sessionId: newSessionId(),
  updatedAt: new Date().toISOString(),
});

const persist = (state: AssistantState): void => {
  cache = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("stateStore: fallo al persistir el snapshot:", error);
  }
};

const isStale = (state: AssistantState): boolean => {
  const updated = Date.parse(state.updatedAt);
  if (!Number.isFinite(updated)) return true;
  return Date.now() - updated > IDLE_RESET_MS;
};

/** Devuelve el snapshot actual; resetea si lleva >30 min sin actividad. */
export function getState(): AssistantState {
  if (!cache) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as AssistantState) : defaultState();
    } catch {
      cache = defaultState();
    }
    if (!cache || typeof cache !== "object") {
      cache = defaultState();
    }
  }

  if (isStale(cache)) {
    resetState();
  }

  return cache!;
}

const oneLine = (text: string): string =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .split(/[.¿?;]/)[0]
    .slice(0, 160);

/** Actualiza el snapshot tras cada turno. Determinista, sin LLM. */
export function updateState(input: UpdateStateInput): void {
  const state = getState();

  state.lastUserMessage = input.userMessage;
  state.lastAssistantSummary = input.response ? oneLine(input.response) : state.lastAssistantSummary;

  if (state.topic !== input.intent) {
    state.recentIntents = [];
  }
  state.topic = input.intent;

  if (!state.recentIntents.includes(input.intent)) {
    state.recentIntents.unshift(input.intent);
    if (state.recentIntents.length > MAX_RECENT_INTENTS) {
      state.recentIntents.length = MAX_RECENT_INTENTS;
    }
  }

  const result = input.executorResult;
  if (result) {
    if (result.itemLabel) {
      state.importantThings.unshift(result.itemLabel);
      if (state.importantThings.length > MAX_IMPORTANT) {
        state.importantThings.length = MAX_IMPORTANT;
      }
    }
    if (result.removedLabel) {
      state.importantThings = state.importantThings.filter(
        (item) => !item.toLowerCase().includes(result.removedLabel!.toLowerCase())
      );
    }
    if (result.entities) {
      state.entitiesInPlay = result.entities;
    }
  }

  state.updatedAt = new Date().toISOString();
  persist(state);
}

export function clearPendingAction(): void {
  const state = getState();
  state.pendingAction = null;
  state.updatedAt = new Date().toISOString();
  persist(state);
}

export function resetState(): void {
  persist(defaultState());
}