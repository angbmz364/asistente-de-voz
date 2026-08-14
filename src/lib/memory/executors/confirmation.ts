/**
 * Patrones de confirmación por voz, evaluados sobre texto normalizado
 * (minúsculas, sin acentos, sin puntuación). El \b de JS es ASCII:
 * "sí" no matchea patterns con acentos, por eso se normaliza antes.
 */

export const normalizeTranscript = (text: string): string =>
  (text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "")
    .toLowerCase()
    .replace(/[¿?¡!,.;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Acepta un borrado con respuesta afirmativa o repetición del verbo. */
const DELETE_CONFIRM_PATTERN =
  /\b(si|confirmo|confirma|dale|ok|okey|claro|adelante|borra|elimina|quita|saca|sacalo|siguiente)\b/;

/** Continúa un listado paginado (siguiente grupo, más tareas). */
const LIST_CONTINUE_PATTERN =
  /\b(si|siguiente|siguientes|continua|continuar|sigue|adelante|ok|dale|claro)\b/;

export const isDeleteConfirmation = (transcript: string): boolean =>
  DELETE_CONFIRM_PATTERN.test(normalizeTranscript(transcript));

export const isListContinue = (transcript: string): boolean =>
  LIST_CONTINUE_PATTERN.test(normalizeTranscript(transcript));