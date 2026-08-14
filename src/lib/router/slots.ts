import { llmProvider } from "../ai";

export type Slots = {
  accion: string | null;
  entidad: string | null;
  objetivo: string | null;
  fecha: string | null;
  tamaño: number | null;
};

const EMPTY_SLOTS: Slots = {
  accion: null,
  entidad: null,
  objetivo: null,
  fecha: null,
  tamaño: null,
};

const SUBJECTS = [
  "razonamiento matematico",
  "razonamiento verbal",
  "ciencias sociales",
  "educacion fisica",
  "artes creativas",
  "plan lector",
  "matematica",
  "trigonometria",
  "geometria",
  "aritmetica",
  "algebra",
  "fisica",
  "quimica",
  "biologia",
  "ecologia",
  "computacion",
  "literatura",
  "lenguaje",
  "historia",
  "ingles",
];

const DATE_TOKENS = [
  "pasado manana",
  "manana",
  "hoy",
  "esta noche",
  "esta semana",
  "proxima semana",
  "fin de semana",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

/** Normaliza a minúsculas sin acentos para hacer match. */
const normalize = (text: string): string =>
  (text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "").toLowerCase();

/**
 * Parser local determinista (fallback sin LLM): extrae sujeto,
 * fecha y tamaño con regex sobre el transcript.
 */
export function localSlots(transcript: string): Slots {
  const plain = normalize(transcript);
  const slots: Slots = { ...EMPTY_SLOTS };

  for (const subject of SUBJECTS) {
    if (plain.includes(subject)) {
      slots.objetivo = subject;
      break;
    }
  }

  for (const token of DATE_TOKENS) {
    if (plain.includes(token)) {
      slots.fecha = token;
      break;
    }
  }

  const sizeMatch =
    plain.match(/(?:de|a|para)\s+(\d+)\s*(personas|integrantes|miembros|alumnos|estudiantes)?/) ??
    plain.match(/(\d+)\s*(personas|integrantes|miembros|alumnos|estudiantes)/);
  if (sizeMatch) {
    slots.tamaño = Number(sizeMatch[1]);
  }

  if (!slots.objetivo) {
    const afterTask = plain.match(/tarea de\s+([a-záéíóúñ]+)/);
    if (afterTask) {
      slots.objetivo = afterTask[1];
    } else {
      const afterGroups = plain.match(/grupos de\s+([a-záéíóúñ]+)/);
      if (afterGroups) {
        slots.objetivo = afterGroups[1];
      } else {
        const afterName = plain.match(
          /(?:agrega|añade|añadí|quita|retira|inscribe)\s+a\s+([a-záéíóúñ]+)/
        );
        if (afterName) slots.objetivo = afterName[1];
      }
    }
  }

  return slots;
}

const parseJsonResponse = (text: string): Partial<Slots> | null => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (parsed && typeof parsed === "object") return parsed as Partial<Slots>;
  } catch {
    return null;
  }
  return null;
};

const sanitizeSlots = (raw: Partial<Slots>): Slots => {
  const toStr = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const toNum = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };

  return {
    accion: toStr(raw.accion),
    entidad: toStr(raw.entidad),
    objetivo: toStr(raw.objetivo),
    fecha: toStr(raw.fecha),
    tamaño: toNum(raw.tamaño),
  };
};

const SLOTS_SYSTEM = "Eres un extractor de datos. Responde solo con JSON válido, sin texto extra.";

const slotsPrompt = (transcript: string): string =>
  `Extrae de esta petición de profesor: "${transcript}" estos campos: ` +
  `accion (add, remove, list, create, delete, ask, explain o greet), ` +
  `entidad (homework, group, student, schedule, class_info, facts, topic o null), ` +
  `objetivo (tema o sujeto, ej. "historia", o null), fecha (día o fecha, ej. "mañana", o null), ` +
  `tamaño (número entero positivo o null). ` +
  `Responde solo JSON: {"accion": "...", "entidad": "...", "objetivo": "...", "fecha": "...", "tamaño": null}`;

/**
 * Slot filler: intenta una llamada LLM compacta con salida JSON;
 * si el provider no responde o el JSON es inválido, degrada al
 * parser local (fechas, números y sujetos).
 */
export async function extractSlots(transcript: string): Promise<Slots> {
  try {
    const response = await llmProvider.generateText(slotsPrompt(transcript), SLOTS_SYSTEM);
    const parsed = parseJsonResponse(response.text);
    if (parsed) {
      return sanitizeSlots(parsed);
    }
  } catch {
    // degradación controlada
  }
  return localSlots(transcript);
}