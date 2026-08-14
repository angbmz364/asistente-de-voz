import { clearGroups, deleteHomeworkById, deleteStudentById } from "../../../components/services/database";
import { removeFactById } from "../facts";
import { clearPendingAction, getState, type PendingAction } from "../stateStore";
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

const CONFIRMATION_PATTERN =
  /\b(si|sí|confirmo|confirma|dale|ok|okey|claro|adelante|borra|elimina|quita|sácalo|sacalo)\b/i;

/**
 * Despacha la instrucción al ejecutor correcto según la intención.
 * Antes de mutar, un borrado queda en `pendingAction` y pide
 * confirmación por voz; el siguiente turno la confirma o la cancela.
 */
export async function dispatchInstruction(input: DispatchInput): Promise<ExecutorResult> {
  const state = getState();

  if (state.pendingAction) {
    if (CONFIRMATION_PATTERN.test(input.transcript)) {
      return confirmPending(state.pendingAction);
    }
    clearPendingAction();
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
      return listGroupsExecutor();
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

/** Ejecuta el borrado ya confirmado, con la entidad resuelta. */
async function confirmPending(action: PendingAction): Promise<ExecutorResult> {
  switch (action.kind) {
    case "homework": {
      if (typeof action.entityId === "number") {
        await deleteHomeworkById(action.entityId);
      }
      clearPendingAction();
      return { ok: true, summaryText: `Borré ${action.target}.`, removedLabel: action.target };
    }
    case "group": {
      await clearGroups();
      clearPendingAction();
      return { ok: true, summaryText: "Borré los grupos de trabajo.", removedLabel: "los grupos" };
    }
    case "student": {
      if (typeof action.entityId === "number") {
        await deleteStudentById(action.entityId);
      }
      clearPendingAction();
      return { ok: true, summaryText: `Quité ${action.target}.`, removedLabel: action.target };
    }
    case "fact": {
      if (typeof action.entityId === "number") {
        await removeFactById(action.entityId);
      }
      clearPendingAction();
      return { ok: true, summaryText: "Borré ese pendiente.", removedLabel: action.target };
    }
    default:
      clearPendingAction();
      return notLocal;
  }
}