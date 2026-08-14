import { addFact, listFactsText, removeFactById } from "../facts";
import { clearPendingAction, getState, setPendingAction } from "../stateStore";
import type { ExecutorContext, ExecutorResult } from "./types";

/** Deriva el contenido de un hecho desde la transcripción, sin materia. */
const factContentFromTranscript = (transcript: string): string => {
  const cleaned = transcript
    .replace(/novel?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 240 ? cleaned.slice(0, 240) : cleaned;
};

export async function addFactExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const content = factContentFromTranscript(ctx.transcript);
  if (!content) {
    return { ok: true, summaryText: "¿Qué debo recordar?" };
  }
  const fact = await addFact(content);
  return {
    ok: true,
    summaryText: "Te lo recordaré.",
    importantItem: content,
    entities: [{ kind: "fact", id: fact.id, label: content.slice(0, 60) }],
  };
}

export async function listFactsExecutor(): Promise<ExecutorResult> {
  const text = await listFactsText();
  if (!text) {
    return { ok: true, summaryText: "No tengo pendientes guardados." };
  }
  return { ok: true, summaryText: text };
}

export async function removeFactExecutor(ctx: ExecutorContext): Promise<ExecutorResult> {
  const { getFacts } = await import("../facts");
  const facts = await getFacts();
  const target = ctx.slots.objetivo?.toLowerCase();
  const candidates = target
    ? facts.filter((f) => f.content.toLowerCase().includes(target))
    : [];
  if (candidates.length === 0) {
    return { ok: true, summaryText: "No tengo un pendiente así." };
  }

  const fact = candidates[0];
  if (!ctx.confirmed) {
    setPendingAction({
      action: "delete",
      target: `pendiente "${fact.content.slice(0, 50)}"`,
      kind: "fact",
      entityId: fact.id,
    });
    return {
      ok: true,
      summaryText: `¿Confirmo que borro el pendiente "${fact.content.slice(0, 50)}"?`,
      pendingAction: getState().pendingAction,
    };
  }

  await removeFactById(fact.id);
  clearPendingAction();
  return { ok: true, summaryText: "Borré ese pendiente.", removedLabel: fact.content };
}