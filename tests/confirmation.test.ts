import { isDeleteConfirmation, isListContinue } from "../src/lib/memory/executors/confirmation";
import { localSlots } from "../src/lib/router/slots";

let failures = 0;

const check = (name: string, actual: unknown, expected: unknown) => {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
};

// Confirmación de borrado: los acentos rompen \b de JS, deben normalizarse.
check('borrado: "sí"', isDeleteConfirmation("sí"), true);
check('borrado: "Sí, confirmo"', isDeleteConfirmation("Sí, confirmo"), true);
check('borrado: "si"', isDeleteConfirmation("si"), true);
check('borrado: "Si, borra todo"', isDeleteConfirmation("Si, borra todo"), true);
check('borrado: "confirmo"', isDeleteConfirmation("confirmo"), true);
check('borrado: "no"', isDeleteConfirmation("no"), false);
check('borrado: "no borres nada"', isDeleteConfirmation("no borres nada"), false);
check('borrado: "explícame la física"', isDeleteConfirmation("explícame la física"), false);

// Continuación de listado paginado.
check('listado: "siguiente"', isListContinue("siguiente"), true);
check('listado: "sí"', isListContinue("sí"), true);
check('listado: "diga el grupo siguiente"', isListContinue("diga el grupo siguiente"), true);
check('listado: "no"', isListContinue("no"), false);

// Extracción local de sujeto / tamaño / fechas.
check('slots: "dime los grupos de física" objetivo', localSlots("dime los grupos de física").objetivo, "fisica");
check('slots: "crea grupos de 5 para historia" tamaño', localSlots("crea grupos de 5 para historia").tamaño, 5);
check('slots: "crea grupos de 5 para historia" objetivo', localSlots("crea grupos de 5 para historia").objetivo, "historia");
check('slots: "elimina las tareas pendientes" objetivo', localSlots("elimina las tareas pendientes").objetivo, null);
check('slots: "no olvides la tarea de historia para mañana" objetivo', localSlots("no olvides la tarea de historia para mañana").objetivo, "historia");
check('slots: "no olvides la tarea de historia para mañana" fecha', localSlots("no olvides la tarea de historia para mañana").fecha, "manana");

if (failures > 0) {
  console.error(`\n${failures} checks fallaron`);
  process.exit(1);
}
console.log("\nTodas las comprobaciones OK");
