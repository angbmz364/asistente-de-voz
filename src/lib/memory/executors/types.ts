import type { PendingAction, StateEntity } from "../stateStore";

/**
 * Resultado de un ejecutor local. `ok:false` y `summaryText` vacío
 * significa "sin acción local: el LLM responde".
 */
export type ExecutorResult = {
  ok: boolean;
  summaryText: string;
  pendingAction?: PendingAction | null;
  importantItem?: string;
  removedLabel?: string;
  entities?: StateEntity[];
};

export type ExecutorContext = {
  transcript: string;
  slots: { objetivo: string | null; fecha: string | null; tamaño: number | null };
  confirmed?: boolean;
};