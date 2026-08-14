import { embed } from "../rag/embeddings";
import { cosineSimilarity } from "../rag/index";
import { INTENTS, type Intent } from "./intents";

export type RoutedIntent = {
  intent: Intent;
  score: number;
};

/**
 * Umbral de coseno para aceptar una intención. Configurable con
 * VITE_ROUTER_THRESHOLD; por debajo se responde genérico (EXPLAIN).
 */
const ROUTER_THRESHOLD = Number(import.meta.env.VITE_ROUTER_THRESHOLD ?? 0.22);

/**
 * Vectores de los prototipos, cacheados por sesión. Se embeben con el
 * mismo método que la consulta (provider o BM25) para que dimensión y
 * espacio vectorial coincidan.
 */
const prototypeCache = new Map<string, number[]>();

const getPrototypeVector = async (example: string): Promise<number[]> => {
  const cached = prototypeCache.get(example);
  if (cached) return cached;

  const vector = await embed(example);
  prototypeCache.set(example, vector);
  return vector;
};

/**
 * Router semántico: embebe la transcripción una sola vez y toma el
 * mejor coseno contra los prototipos. Debajo del umbral → EXPLAIN.
 */
export async function routeIntent(transcript: string): Promise<RoutedIntent> {
  const queryVector = await embed(transcript);
  let best: RoutedIntent | null = null;

  for (const intent of INTENTS) {
    for (const example of intent.examples) {
      const prototype = await getPrototypeVector(example);
      const score = cosineSimilarity(queryVector, prototype);
      if (!best || score > best.score) {
        best = { intent, score };
      }
    }
  }

  if (!best) {
    const fallback = INTENTS.find((i) => i.id === "EXPLAIN")!;
    return { intent: fallback, score: 0 };
  }

  if (best.score < ROUTER_THRESHOLD) {
    const generic = INTENTS.find((i) => i.id === "EXPLAIN")!;
    return { intent: generic, score: best.score };
  }

  return best;
}