import { routeIntent } from "../../lib/router/router";
import { extractSlots, localSlots, type Slots } from "../../lib/router/slots";
import { dispatchInstruction, type DispatchInput } from "../../lib/memory/executors";
import type { ExecutorResult } from "../../lib/memory/executors/types";
import { getState } from "../../lib/memory/stateStore";
import { retrieve, type RetrievedChunk } from "../../lib/rag/retrieval";
import { getConversationMessages } from "./database";
import { getLatestSummary } from "./database";
import { buildUserPrompt, getPromptBudget, type TurnInput } from "../../lib/ai/prompts";

export type ProcessedInstruction = {
  /** Prompt listo para el LLM (estado + RAG + ventana). Vacío si responde local. */
  prompt: string;
  contextText: string;
  /** Respuesta local del ejecutor (sin LLM), o null si va al LLM. */
  localResponse: string | null;
  executorResult?: ExecutorResult;
  intent: string;
};

import type { IntentId } from "../../lib/router/intents";

/** Intenciones que necesitan slot-filler LLM; el resto usa el parser local. */
const SLOT_NEEDING_INTENTS: IntentId[] = [
  "ADD_HOMEWORK",
  "REMOVE_HOMEWORK",
  "CREATE_GROUPS",
  "ADD_STUDENT",
  "REMOVE_STUDENT",
];

export const processUserInstruction = async (
  transcript: string
): Promise<ProcessedInstruction> => {
  const sanitized = transcript.trim();
  const routed = await routeIntent(sanitized);

  const slots: Slots = SLOT_NEEDING_INTENTS.includes(routed.intent.id)
    ? await extractSlots(sanitized)
    : localSlots(sanitized);

  const dispatchInput: DispatchInput = {
    intent: routed.intent.id,
    transcript: sanitized,
    slots,
  };
  const result = await dispatchInstruction(dispatchInput);

  const intentLabel = routed.intent.label;

  if (result.ok && result.summaryText) {
    return {
      prompt: "",
      contextText: result.summaryText,
      localResponse: result.summaryText,
      executorResult: result,
      intent: intentLabel,
    };
  }

  const budget = getPromptBudget();
  const docs: RetrievedChunk[] = await retrieve(sanitized, budget.docs);
  const turns: TurnInput[] = await getConversationMessages(budget.turns);
  const summary = await getLatestSummary();
  const state = getState();

  const prompt = buildUserPrompt({
    transcript: sanitized,
    state,
    docs,
    turns,
    summary,
    budget,
  });

  const contextText = docs.map((d) => d.content).join(". ");

  return { prompt, contextText, localResponse: null, intent: intentLabel };
};

export type { ProcessedInstruction as InstructionResult };