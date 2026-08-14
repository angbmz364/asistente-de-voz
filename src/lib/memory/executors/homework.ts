import {
  addHomework,
  getHomework,
} from "../../../components/services/database";
import { getState, setPendingAction } from "../stateStore";
import type { ExecutorContext, ExecutorResult } from "./types";

export async function addHomeworkExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const description = ctx.slots.objetivo;
  if (!description) {
    return { ok: true, summaryText: "No entendí qué tarea debo guardar. Dime la materia y la fecha." };
  }
  const homework = await addHomework(description, ctx.slots.fecha);
  const when = ctx.slots.fecha ? ` para ${ctx.slots.fecha}` : "";
  return {
    ok: true,
    summaryText: `Listo, guardé la tarea de ${description}${when}.`,
    importantItem: `tarea ${description}${when}`,
    entities: [{ kind: "homework", id: homework.id, label: description }],
  };
}

export async function removeHomeworkExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const target = ctx.slots.objetivo;
  const all = await getHomework();
  const candidates = target
    ? all.filter((h) => h.description.toLowerCase().includes(target.toLowerCase()))
    : all;

  if (candidates.length === 0) {
    const subject = target ? ` de ${target}` : "";
    return { ok: true, summaryText: `No tengo registrada una tarea${subject} para borrar.` };
  }

  // Sin materia concreta: borrado masivo de todas las pendientes.
  if (!target) {
    setPendingAction({
      action: "delete",
      target: `las ${candidates.length} tareas pendientes`,
      kind: "homework",
      scope: "all",
    });
    return {
      ok: true,
      summaryText: `¿Confirmo que borro las ${candidates.length} tareas pendientes?`,
      pendingAction: getState().pendingAction,
    };
  }

  const piece = candidates[0];
  setPendingAction({
    action: "delete",
    target: `tarea de ${piece.description}`,
    kind: "homework",
    entityId: piece.id,
    scope: "one",
  });
  return {
    ok: true,
    summaryText: `¿Confirmo que borro la tarea de ${piece.description}?`,
    pendingAction: getState().pendingAction,
  };
}

export async function listHomeworkExecutor(): Promise<ExecutorResult> {
  const items = await getHomework();
  if (items.length === 0) {
    return { ok: true, summaryText: "No tienes tareas pendientes." };
  }
  const shown = items.slice(0, 5);
  const list = shown
    .map((t) => `${t.description}${t.dueDate ? ` (para ${t.dueDate})` : ""}`)
    .join(", ");
  const tail = items.length > 5 ? ` y ${items.length - 5} más.` : "";
  return { ok: true, summaryText: `Tienes ${items.length} tareas: ${list}${tail}` };
}