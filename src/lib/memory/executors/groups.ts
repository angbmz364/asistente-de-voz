import { clearGroups, createGroupsBySize, getGroups } from "../../../components/services/database";
import { clearPendingAction, getState, setPendingAction } from "../stateStore";
import type { ExecutorContext, ExecutorResult } from "./types";

export async function createGroupsExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const size = ctx.slots.tamaño;
  if (!size || size < 2) {
    return { ok: true, summaryText: "¿De cuántos integrantes formo los grupos?" };
  }
  const groups = await createGroupsBySize(size);
  return {
    ok: true,
    summaryText: `Creé ${groups.length} grupos de ${size} integrantes.`,
    importantItem: `grupos de ${size} creados`,
    entities: groups.map((g) => ({ kind: "group" as const, id: g.id, label: g.name })),
  };
}

export async function listGroupsExecutor(): Promise<ExecutorResult> {
  const groups = await getGroups();
  if (groups.length === 0) {
    return { ok: true, summaryText: "No hay grupos formados todavía." };
  }
  const list = groups
    .map((g) => `${g.name} (${g.members.join(", ")})`)
    .join("; ");
  return { ok: true, summaryText: `Hay ${groups.length} grupos: ${list}.` };
}

export async function deleteGroupsExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const groups = await getGroups();
  if (groups.length === 0) {
    return { ok: true, summaryText: "No hay grupos formados para borrar." };
  }

  if (!ctx.confirmed) {
    setPendingAction({ action: "delete", target: "los grupos de trabajo", kind: "group" });
    return {
      ok: true,
      summaryText: `¿Confirmo que borro los ${groups.length} grupos formados?`,
      pendingAction: getState().pendingAction,
    };
  }

  await clearGroups();
  clearPendingAction();
  return { ok: true, summaryText: "Borré los grupos de trabajo.", removedLabel: "los grupos" };
}