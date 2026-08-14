import {
  addStudent,
  getStudentByName,
} from "../../../components/services/database";
import { getState, setPendingAction } from "../stateStore";
import type { ExecutorContext, ExecutorResult } from "./types";

export async function addStudentExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const name = ctx.slots.objetivo;
  if (!name) {
    return { ok: true, summaryText: "¿A qué estudiante agrego al salón?" };
  }
  const student = await addStudent(name);
  return {
    ok: true,
    summaryText: `Agregué a ${name} al salón.`,
    importantItem: `estudiante ${name}`,
    entities: [{ kind: "student", id: student.id, label: name }],
  };
}

export async function removeStudentExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const name = ctx.slots.objetivo;
  if (!name) {
    return { ok: true, summaryText: "¿A qué estudiante debo quitar?" };
  }
  const student = await getStudentByName(name);
  if (!student) {
    return { ok: true, summaryText: `No encuentro a ${name} en el salón.` };
  }

  setPendingAction({
    action: "delete",
    target: `a ${name} del salón`,
    kind: "student",
    entityId: student.id,
    scope: "one",
  });
  return {
    ok: true,
    summaryText: `¿Confirmo que saco a ${name} del salón?`,
    pendingAction: getState().pendingAction,
  };
}