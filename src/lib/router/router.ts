import { embed } from "../rag/embeddings";
import { cosineSimilarity } from "../rag/cosine";
import { INTENTS, type IntentId, type Intent } from "./intents";

export type RoutedIntent = {
  intent: Intent;
  score: number;
};

/**
 * Umbral de coseno para aceptar una intención. Configurable con
 * VITE_ROUTER_THRESHOLD; por debajo se responde genérico (EXPLAIN).
 */
const ROUTER_THRESHOLD = Number(import.meta.env?.VITE_ROUTER_THRESHOLD ?? 0.22);

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
 * Normaliza a minúsculas sin acentos ni puntuación, para el gate léxico.
 */
const normalize = (text: string): string =>
  (text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "")
    .toLowerCase()
    .replace(/[¿?¡!,.;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Intenciones que mutan la BD; nunca deben dispararse por preguntas. */
const MUTATING: IntentId[] = [
  "ADD_HOMEWORK",
  "REMOVE_HOMEWORK",
  "CREATE_GROUPS",
  "DELETE_GROUPS",
  "ADD_STUDENT",
  "REMOVE_STUDENT",
];

const QUESTION_PREFIX =
  /^(cuando|cuantos|cuantas|cuanto|cual|cuales|que|quien|por que|para que|a que hora|donde|como|en que (ano|fecha|momento))\b/;

const DESTRUCTIVE_VERB =
  /\b(borra|borre|borrar|elimina|eliminar|quita|quitar|olvida|olvidate|saca|sacalo|retira|deshaz|borro)\b/;

const HOMEWORK_ADD_VERB =
  /\b(anota|apunta|guarda|deja|anotame|no olvides|no te olvides|recuerda|agrega|anadir|anade|apuntalo|apuntame)\b/;

const STUDENT_ADD_VERB =
  /\b(agrega|anade|anadi|matricula|inscribe)\b/;

const HOMEWORK_TOKEN = /\btareas?\b/;

/**
 * Gate léxico determinista: complementa el coseno para evitar falsos
 * positivos. Una pregunta jamás dispara una mutación; un borrado exige
 * verbo destructivo; agregar tarea exige verbo de tarea + "tarea".
 * Devuelve la intención vetada o null si la acepta.
 */
const vetoedIntent = (id: IntentId, plain: string): Intent | null => {
  const generic = INTENTS.find((i) => i.id === "EXPLAIN")!;

  if (MUTATING.includes(id) && QUESTION_PREFIX.test(plain)) {
    return generic;
  }

  switch (id) {
    case "REMOVE_HOMEWORK":
    case "DELETE_GROUPS":
    case "REMOVE_STUDENT":
      if (!DESTRUCTIVE_VERB.test(plain)) return generic;
      break;
    case "ADD_HOMEWORK":
      if (!HOMEWORK_TOKEN.test(plain) && !HOMEWORK_ADD_VERB.test(plain)) return generic;
      if (HOMEWORK_ADD_VERB.test(plain) && DESTRUCTIVE_VERB.test(plain)) return generic;
      break;
    case "ADD_STUDENT":
      if (!STUDENT_ADD_VERB.test(plain)) return generic;
      break;
    default:
      break;
  }

  return null;
};

/**
 * Router semántico: embebe la transcripción una sola vez, toma el
 * mejor coseno contra los prototipos y aplica el gate léxico. Debajo
 * del umbral o vetada → EXPLAIN.
 */
export async function routeIntent(transcript: string): Promise<RoutedIntent> {
  const plain = normalize(transcript);
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

  const generic = INTENTS.find((i) => i.id === "EXPLAIN")!;
  const fallback: RoutedIntent = { intent: generic, score: 0 };

  if (!best || best.score < ROUTER_THRESHOLD) {
    return fallback;
  }

  const vetoed = vetoedIntent(best.intent.id, plain);
  if (vetoed) {
    return { intent: vetoed, score: best.score };
  }

  return best;
}

export type { IntentId };