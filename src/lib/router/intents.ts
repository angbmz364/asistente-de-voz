/**
 * Prototipos de intención del router semántico.
 * Todo en español: el LLM nunca interpreta intenciones, solo estas
 * frases de referencia embebidas.
 */

export type IntentId =
  | "ADD_HOMEWORK"
  | "REMOVE_HOMEWORK"
  | "LIST_HOMEWORK"
  | "CREATE_GROUPS"
  | "LIST_GROUPS"
  | "DELETE_GROUPS"
  | "ADD_STUDENT"
  | "REMOVE_STUDENT"
  | "ASK_SCHEDULE"
  | "ASK_CLASS_INFO"
  | "ASK_FACTS"
  | "EXPLAIN"
  | "GREETING";

export type Intent = {
  id: IntentId;
  label: string;
  action: string;
  entity: string;
  examples: string[];
};

export const INTENTS: Intent[] = [
  {
    id: "ADD_HOMEWORK",
    label: "agregar tarea",
    action: "add",
    entity: "homework",
    examples: [
      "no olvides la tarea de historia para mañana",
      "anota la tarea de matemática para el viernes",
      "agrega la tarea de física",
      "deja la tarea de química para el lunes",
      "recuerda la tarea de biología para la próxima semana",
    ],
  },
  {
    id: "REMOVE_HOMEWORK",
    label: "quitar tarea",
    action: "remove",
    entity: "homework",
    examples: [
      "olvídate de la tarea de matemática",
      "borra la tarea de historia",
      "elimina la tarea de química",
      "ya no dejes la tarea de física",
      "elimina las tareas pendientes",
      "borra todas las tareas",
      "quita las tareas de física",
      "olvídate de las tareas",
    ],
  },
  {
    id: "LIST_HOMEWORK",
    label: "listar tareas",
    action: "list",
    entity: "homework",
    examples: [
      "qué tareas tengo pendientes",
      "cuáles son las tareas",
      "muéstrame las tareas del curso",
      "qué tarea dejó el profe",
    ],
  },
  {
    id: "CREATE_GROUPS",
    label: "crear grupos",
    action: "create",
    entity: "group",
    examples: [
      "haz grupos de 4",
      "forma grupos de trabajo",
      "crea grupos de 3 integrantes",
      "organiza grupos para el proyecto",
      "haz grupos de 5 para física",
      "crea grupos de 4 para historia",
    ],
  },
  {
    id: "LIST_GROUPS",
    label: "listar grupos",
    action: "list",
    entity: "group",
    examples: [
      "qué grupos hay formados",
      "muéstrame los grupos de trabajo",
      "cuáles son los grupos actuales",
      "dime los grupos de física",
      "qué grupos hay en física",
    ],
  },
  {
    id: "DELETE_GROUPS",
    label: "borrar grupos",
    action: "delete",
    entity: "group",
    examples: [
      "borra los grupos",
      "elimina todos los grupos",
      "quita los grupos de trabajo",
    ],
  },
  {
    id: "ADD_STUDENT",
    label: "agregar estudiante",
    action: "add",
    entity: "student",
    examples: [
      "agrega a María al salón",
      "añade a Pedro a la clase",
      "inscribe a un estudiante nuevo",
    ],
  },
  {
    id: "REMOVE_STUDENT",
    label: "quitar estudiante",
    action: "remove",
    entity: "student",
    examples: [
      "Miguel ya no está en el salón",
      "quita a Ana de la clase",
      "retira a un estudiante",
    ],
  },
  {
    id: "ASK_SCHEDULE",
    label: "consultar horario",
    action: "ask",
    entity: "schedule",
    examples: [
      "qué clases tenemos hoy",
      "cuál es el horario de mañana",
      "qué asignatura sigue después del recreo",
    ],
  },
  {
    id: "ASK_CLASS_INFO",
    label: "consultar datos de clase",
    action: "ask",
    entity: "class_info",
    examples: [
      "quién es el tutor",
      "cuál es la mascota",
      "cómo se llama la escuela",
      "qué nivel es este salón",
    ],
  },
  {
    id: "ASK_FACTS",
    label: "consultar pendientes",
    action: "ask",
    entity: "facts",
    examples: [
      "qué tenía pendiente",
      "recuérdame mis pendientes",
      "qué debía hacer",
      "cuáles son mis recordatorios",
    ],
  },
  {
    id: "EXPLAIN",
    label: "explicar tema",
    action: "explain",
    entity: "topic",
    examples: [
      "explícame la fotosíntesis",
      "qué es la gravedad",
      "cuéntame sobre la revolución industrial",
      "cómo funciona el sistema solar",
      "cuándo comenzó la primera guerra mundial",
      "en qué año terminó la segunda guerra mundial",
      "cuándo pasó la revolución francesa",
      "qué causó la independencia del perú",
      "cuándo se descubrió américa",
    ],
  },
  {
    id: "GREETING",
    label: "saludo",
    action: "greet",
    entity: "none",
    examples: ["hola", "buenos días", "qué tal", "hey nova"],
  },
];