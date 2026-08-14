import { llmProvider } from "../ai";
import { getLatestSummary, saveSummary } from "../../components/services/database";

export type SummaryTurn = { role: "user" | "assistant"; content: string };

/**
 * Umbral de turnos a partir del cual se genera resumen rodante.
 */
export const SUMMARY_THRESHOLD = 8;

const SUMMARY_SYSTEM =
  "Eres el asistente NOVA. Resume conversaciones de aula en una sola línea, en español, conservando pendientes y datos importantes.";

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim().slice(0, 240);

/**
 * Resumen rodante: cuando los turnos acumulados superan el umbral,
 * genera/actualiza un resumen de una línea con el LLM y lo persiste
 * en `summaries`. Si el LLM no responde, conserva el resumen previo.
 *
 * @param turns turnos recientes (ventana corta)
 * @param previousCount turnos ya acumulados en sesiones previas
 */
export async function updateRollingSummary(
  turns: SummaryTurn[],
  previousCount = 0
): Promise<string | null> {
  if (turns.length + previousCount < SUMMARY_THRESHOLD) return null;

  const prior = await getLatestSummary();
  const conversation = turns
    .map((t) => `${t.role === "user" ? "usuario" : "asistente"}: ${t.content}`)
    .join("\n");

  try {
    const prompt = prior
      ? `Resumen previo: ${prior}\n\nNuevos turnos:\n${conversation}\n\nActualiza el resumen en una sola línea:`
      : `Resume estos turnos en una sola línea:\n${conversation}`;
    const response = await llmProvider.generateText(prompt, SUMMARY_SYSTEM);
    const summary = oneLine(response.text);
    if (summary) {
      await saveSummary(summary);
      return summary;
    }
  } catch (error) {
    console.warn("summarizer: falló el resumen rodante:", error);
  }

  return prior;
}