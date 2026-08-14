import {
  clearGroups,
  clearHomework,
  deleteHomeworkById,
  deleteStudentById,
  openDatabase,
  persistDatabase,
} from "../../../components/services/database";
import { removeFactById } from "../facts";
import { clearPendingAction, getState, type PendingAction } from "../stateStore";
import { isDeleteConfirmation, isListContinue, normalizeTranscript } from "./confirmation";
import type { IntentId } from "../../router/intents";
import type { Slots } from "../../router/slots";
import { addHomeworkExecutor, listHomeworkExecutor, removeHomeworkExecutor } from "./homework";
import { createGroupsExecutor, deleteGroupsExecutor, listGroupsExecutor } from "./groups";
import { addStudentExecutor, removeStudentExecutor } from "./students";
import { listFactsExecutor } from "./classFacts";
import type { ExecutorContext, ExecutorResult } from "./types";

export type DispatchInput = {
  intent: IntentId;
  transcript: string;
  slots: Slots;
};

const notLocal: ExecutorResult = { ok: false, summaryText: "" };

/**
 * Despacha la instrucción al ejecutor correcto según la intención.
 * Antes de mutar, un borrado queda en `pendingAction` y pide
 * confirmación por voz; el siguiente turno la confirma o la cancela.
 * Un pendiente de creación/listado también se resuelve aquí.
 */
export async function dispatchInstruction(input: DispatchInput): Promise<ExecutorResult> {
  const state = getState();

  if (state.pendingAction) {
    const resolved = await resolvePending(state.pendingAction, input);
    if (resolved) return resolved;
  }

  const ctx: ExecutorContext = { transcript: input.transcript, slots: input.slots };

  switch (input.intent) {
    case "ADD_HOMEWORK":
      return addHomeworkExecutor(ctx);
    case "REMOVE_HOMEWORK":
      return removeHomeworkExecutor(ctx);
    case "LIST_HOMEWORK":
      return listHomeworkExecutor();
    case "CREATE_GROUPS":
      return createGroupsExecutor(ctx);
    case "LIST_GROUPS":
      return listGroupsExecutor(ctx);
    case "DELETE_GROUPS":
      return deleteGroupsExecutor(ctx);
    case "ADD_STUDENT":
      return addStudentExecutor(ctx);
    case "REMOVE_STUDENT":
      return removeStudentExecutor(ctx);
    case "ASK_FACTS":
      return listFactsExecutor();
    default:
      return notLocal;
  }
}

/**
 * Atiende un `pendingAction` si el turno actual lo continúa
 * (confirmar borrado, dar el curso al crear, avanzar listado).
 * Devuelve null si el turno NO era continuación y el flujo normal
 * debe seguir (en ese caso descarta el pendiente).
 */
async function resolvePending(action: PendingAction, input: DispatchInput): Promise<ExecutorResult | null> {
  const plain = normalizeTranscript(input.transcript);
  const ctx: ExecutorContext = { transcript: input.transcript, slots: input.slots };

  switch (action.action) {
    case "delete":
      if (isDeleteConfirmation(plain)) {
        const confirmed = await confirmPending(action);
        clearPendingAction();
        return confirmed;
      }
      clearPendingAction();
      return null;
    case "create_groups":
      if (ctx.slots.objetivo) {
        return createGroupsExecutor({ ...ctx, confirmed: true });
      }
      return { ok: true, summaryText: action.size ? `¿Y para qué curso formo los grupos de ${action.size}?` : "¿De cuántos integrantes y para qué curso formo los grupos?" };
    case "list_groups":
      if (isListContinue(plain)) {
        return listGroupsExecutor({ ...ctx, confirmed: true });
      }
      clearPendingAction();
      return null;
    default:
      clearPendingAction();
      return null;
  }
}

/** Ejecuta el borrado ya confirmado, con la entidad resuelta. Persiste. */
async function confirmPending(action: PendingAction): Promise<ExecutorResult> {
  switch (action.kind) {
    case "homework": {
      if (action.scope === "all") {
        await clearHomework();
      } else if (typeof action.entityId === "number") {
        await deleteHomeworkById(action.entityId);
        persistDatabase(await openDatabase());
      }
      return { ok: true, summaryText: `Borré ${action.target}.`, removedLabel: action.target };
    }
    case "group": {
      await clearGroups(action.subject ?? null);
      return { ok: true, summaryText: action.subject ? `Borré los grupos de ${action.subject}.` : "Borré los grupos de trabajo.", removedLabel: "los grupos" };
    }
    case "student": {
      if (typeof action.entityId === "number") {
        await deleteStudentById(action.entityId);
        persistDatabase(await openDatabase());
      }
      return { ok: true, summaryText: `Quité ${action.target}.`, removedLabel: action.target };
    }
    case "fact": {
      if (typeof action.entityId === "number") {
        await removeFactById(action.entityId);
      }
      return { ok: true, summaryText: "Borré ese pendiente.", removedLabel: action.target };
    }
    default:
      return notLocal;
  }
}