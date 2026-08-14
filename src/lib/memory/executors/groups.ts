import { createGroupsBySize, getGroups, getGroupSubjects } from "../../../components/services/database";
import { clearPendingAction, getState, setPendingAction } from "../stateStore";
import type { ExecutorContext, ExecutorResult } from "./types";

export async function createGroupsExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const state = getState();
  const pending = state.pendingAction?.action === "create_groups" ? state.pendingAction : null;
  const size = ctx.slots.tamaño ?? pending?.size;
  const subject = ctx.slots.objetivo;

  if (!size || size < 2) {
    return { ok: true, summaryText: "¿De cuántos integrantes formo los grupos?" };
  }

  // Falta el curso: preguntar y guardar el pendiente de creación.
  if (!subject) {
    setPendingAction({ action: "create_groups", target: "los grupos", kind: "group", size });
    return {
      ok: true,
      summaryText: `Creando grupos de ${size}. ¿Para qué curso?`,
      pendingAction: getState().pendingAction,
    };
  }

  const groups = await createGroupsBySize(size, subject);
  clearPendingAction();
  return {
    ok: true,
    summaryText: `Creé ${groups.length} grupos de ${size} integrantes para ${subject}.`,
    importantItem: `grupos de ${size} de ${subject} creados`,
    entities: groups.map((g) => ({ kind: "group" as const, id: g.id, label: g.name })),
  };
}

const groupName = (index: number, subject: string): string =>
  subject ? `Grupo ${index} de ${subject}` : `Grupo ${index}`;

async function startListing(subject: string): Promise<ExecutorResult> {
  const groups = await getGroups(subject);
  if (groups.length === 0) {
    return { ok: true, summaryText: `No hay grupos de ${subject}.` };
  }
  if (groups.length === 1) {
    return {
      ok: true,
      summaryText: `Solo hay un grupo de ${subject}: ${groups[0].members.join(", ")}.`,
    };
  }
  setPendingAction({
    action: "list_groups",
    target: `los grupos de ${subject}`,
    kind: "group",
    subject,
    groupIds: groups.map((g) => g.id),
    page: 1,
  });
  return {
    ok: true,
    summaryText: `Hay ${groups.length} grupos de ${subject}. ${groupName(1, subject)} formado por ${groups[0].members.join(", ")}. ¿Quieres que diga el grupo 2?`,
    pendingAction: getState().pendingAction,
  };
}

export async function listGroupsExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const state = getState();
  const pending = state.pendingAction?.action === "list_groups" ? state.pendingAction : null;

  // Continuación de un listado paginado.
  if (pending && ctx.confirmed) {
    const subject = pending.subject ?? "";
    const groups = await getGroups(subject);
    const nextPage = (pending.page ?? 1) + 1;

    if (nextPage <= groups.length) {
      const next = groups[nextPage - 1];
      setPendingAction({ ...pending, page: nextPage });
      const more = nextPage < groups.length;
      return {
        ok: true,
        summaryText: `${groupName(nextPage, subject)} formado por ${next.members.join(", ")}.${more ? ` ¿Quieres que diga el grupo ${nextPage + 1}?` : ""}`,
        pendingAction: getState().pendingAction,
      };
    }

    clearPendingAction();
    return { ok: true, summaryText: `Esos fueron todos los ${groups.length} grupos de ${subject}.` };
  }

  // Curso indicado: iniciar listado paginado de ese curso.
  const subject = ctx.slots.objetivo;
  if (subject) {
    return startListing(subject);
  }

  // Sin curso: preguntar.
  const subjects = await getGroupSubjects();
  if (subjects.length === 0) {
    return { ok: true, summaryText: "No hay grupos formados todavía." };
  }
  if (subjects.length === 1) {
    return startListing(subjects[0]);
  }
  return {
    ok: true,
    summaryText: `¿De qué curso? Hay grupos de ${subjects.join(", ")}.`,
  };
}

export async function deleteGroupsExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const subject = ctx.slots.objetivo;
  const groups = subject ? await getGroups(subject) : await getGroups();

  if (groups.length === 0) {
    const s = subject ? ` de ${subject}` : "";
    return { ok: true, summaryText: `No hay grupos${s} formados para borrar.` };
  }

  setPendingAction({
    action: "delete",
    target: subject ? `los ${groups.length} grupos de ${subject}` : "los grupos de trabajo",
    kind: "group",
    subject: subject ?? null,
    scope: "all",
  });
  return {
    ok: true,
    summaryText: subject
      ? `¿Confirmo que borro los ${groups.length} grupos de ${subject}?`
      : `¿Confirmo que borro los ${groups.length} grupos formados?`,
    pendingAction: getState().pendingAction,
  };
}