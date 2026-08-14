import { routeIntent } from "../src/lib/router/router";
import type { IntentId } from "../src/lib/router/intents";

type Expect = { transcript: string; intent: IntentId };

const CASES: Expect[] = [
  { transcript: "¿Cuándo comenzó la primera guerra mundial?", intent: "EXPLAIN" },
  { transcript: "cuando comenzo la primera guerra mundial", intent: "EXPLAIN" },
  { transcript: "en qué año terminó la segunda guerra mundial", intent: "EXPLAIN" },
  { transcript: "explícame la fotosíntesis", intent: "EXPLAIN" },
  { transcript: "qué es la gravedad", intent: "EXPLAIN" },
  { transcript: "no olvides la tarea de historia para mañana", intent: "ADD_HOMEWORK" },
  { transcript: "anota la tarea de matemática para el viernes", intent: "ADD_HOMEWORK" },
  { transcript: "borra la tarea de historia", intent: "REMOVE_HOMEWORK" },
  { transcript: "elimina las tareas pendientes", intent: "REMOVE_HOMEWORK" },
  { transcript: "borra todas las tareas", intent: "REMOVE_HOMEWORK" },
  { transcript: "olvídate de la tarea de matemática", intent: "REMOVE_HOMEWORK" },
  { transcript: "qué tareas tengo pendientes", intent: "LIST_HOMEWORK" },
  { transcript: "muéstrame las tareas del curso", intent: "LIST_HOMEWORK" },
  { transcript: "haz grupos de 4", intent: "CREATE_GROUPS" },
  { transcript: "crea grupos de 5 para física", intent: "CREATE_GROUPS" },
  { transcript: "qué grupos hay formados", intent: "LIST_GROUPS" },
  { transcript: "dime los grupos de física", intent: "LIST_GROUPS" },
  { transcript: "borra los grupos", intent: "DELETE_GROUPS" },
  { transcript: "agrega a María al salón", intent: "ADD_STUDENT" },
  { transcript: "quita a Ana de la clase", intent: "REMOVE_STUDENT" },
  { transcript: "qué clases tenemos hoy", intent: "ASK_SCHEDULE" },
  { transcript: "quién es el tutor", intent: "ASK_CLASS_INFO" },
  { transcript: "qué tenía pendiente", intent: "ASK_FACTS" },
  { transcript: "hola", intent: "GREETING" },
];

let failures = 0;

for (const { transcript, intent } of CASES) {
  const result = await routeIntent(transcript);
  const pass = result.intent.id === intent;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  "${transcript}" -> ${result.intent.id} (esperado ${intent}, score ${result.score.toFixed(3)})`
  );
}

if (failures > 0) {
  console.error(`\n${failures}/${CASES.length} casos fallaron`);
  process.exit(1);
}
console.log(`\nTodos los ${CASES.length} casos OK`);
