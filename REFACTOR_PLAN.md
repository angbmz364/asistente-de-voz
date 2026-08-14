# NOVA — Plan de Refactor: RAG + Memoria

> Lenguaje del proyecto: **español**. Todo el código de intenciones, prototipos, regex, prompts y etiquetas de memoria debe escribirse en español.
> Invariante de arquitectura: **el LLM nunca muta la base de datos**. Solo los ejecutores locales escriben.
> Objetivo: interacción natural en voz (sin palabras clave), memoria persistente y fuerte, contexto delgado y relevante vía RAG.

---

## 1. Contexto

Nova es un asistente de voz educativo para el Colegio San Carlos. La lógica de aula (tareas, grupos, estudiantes, horario) se ejecuta localmente en SQLite (`sql.js` en el navegador, persistido en `localStorage`). El LLM (Gemini por defecto, Ollama opcional) solo redacta la respuesta hablada.

Estado actual del código:
- **Intención**: detección por regex de palabras clave en `src/components/services/instructionProcessor.ts`. Frágil: "no olvides la tarea de historia para mañana" no matchea el guard de guardado; "no quiero grupos de 3" **crea** grupos.
- **Memoria**: `src/components/services/conversationStore.ts` guarda máx 6 mensajes crudos en `sessionStorage` (muere al cerrar pestaña), se inyectan sin procesar, sin resumen ni largo plazo.
- **Prompt**: persona duplicada 3 veces (SYSTEM_PROMPT + texto de cada intención + sufijo que el provider vuelve a añadir en cada request).
- **Contexto**: inyección tipo "dump completo" de tablas, sin ranking por relevancia.
- **Datos de clase**: sembrados una sola vez (`class_info`, `students`); no existe ruta de escritura desde la conversación.

---

## 2. Problemas actuales (tabla de referencia)

| Área | Problema | Ubicación |
|---|---|---|
| System prompt | Persona duplicada 3× (SYSTEM_PROMPT + prompts por intención + sufijo del provider "Responde naturalmente...") | `src/components/services/gemini.ts:7,84,149` |
| Memoria | `sessionStorage`, tope 6 msgs, inyección cruda, muere al cerrar pestaña, sin resumen, sin largo plazo | `src/components/services/conversationStore.ts` |
| Intención | Solo regex por palabras clave. "no olvides la tarea de historia para mañana" no matchea. "no quiero grupos de 3" crea grupos | `src/components/services/instructionProcessor.ts:49-88` |
| Contexto | Dump completo de tablas (toda la tarea / todos los grupos), sin ranking | `src/components/services/instructionProcessor.ts:176-219` |
| Provider | Interfaz `LLMProvider` sin capacidad de embeddings | `src/lib/ai/providers.ts:25` |
| Datos de clase | `class_info`/`students` sembrados, cero ruta de escritura desde conversación | `src/components/services/database.ts:82-149` |

---

## 3. Principios invariantes

1. El LLM **nunca** muta la BD. Solo los ejecutores locales escriben.
2. Todo en español: intents, prototipos, regex, prompts, etiquetas de memoria, `SYSTEM_PROMPT`.
3. Offline-first: si embeddings o LLM no están disponibles, degradación controlada (BM25, parsers locales).
4. Toda persistencia reutiliza `persistDatabase` de `database.ts`; todo sobrevive a recarga en `localStorage`.
5. Mantener el contrato existente de streaming/TTS (`StreamingSpeech`, `askLLMStream`, `useStreamingContext`) intacto.

---

## 4. Arquitectura nueva

```
Transcripción STT
   ↓
[Router semántico]  coseno vs prototipos → (acción, entidad)
   ↓
[Slot filler]  llamada LLM compacta estructurada → {entidad, fecha, tamaño, objetivo}
   ↓
[RAG]  top-K docs por coseno(query, embeddings) + ventana corta + resumen
   ↓
[Ejecutor]  CRUD local determinista en SQLite
   ↓
[Context Builder]  presupuesto de tokens → prompt delgado (estado + docs + últimos turnos)
   ↓
[LLM stream] → TTS
```

---

## 5. Decisiones acordadas

1. **Embeddings**: provider-based (Gemini `embedContent` / Ollama `/api/embeddings`) + **fallback BM25** local para que la app nunca se rompa offline.
2. **Router**: semántico (coseno contra prototipos) + slot-filler LLM pequeño.
3. **Borrado**: confirmación por voz ("¿Borro la tarea de historia? ¿Confirmo?") antes de mutar.
4. **Memoria de trabajo**: snapshot compacto `stateStore` como memoria primaria inyectada, complementando (no reemplazando) los almacenes persistentes.

---

## 6. Módulos y archivos

### Nuevos

```
src/lib/rag/embeddings.ts      — embed(text): Promise<number[]>; Gemini/Ollama/fallback BM25
src/lib/rag/index.ts           — índice vectorial en SQLite (coseno, upsert/delete, cache)
src/lib/rag/retrieval.ts       — retrieve(query, k=5) → chunks rankeados
src/lib/router/intents.ts      — prototipos de intención + schemas (ES)
src/lib/router/router.ts       — coseno vs prototipos → acción + entidad
src/lib/router/slots.ts        — extracción de slots (LLM pequeño JSON; fallback parser local)
src/lib/memory/stateStore.ts   — snapshot de memoria de trabajo (localStorage + cache en memoria)
src/lib/memory/summarizer.ts   — resumen rodante de conversación vieja
src/lib/memory/facts.ts        — "pendientes"/recordatorios libres de forma, embebidos
src/lib/memory/executors/homework.ts   — CRUD tareas
src/lib/memory/executors/groups.ts     — CRUD grupos
src/lib/memory/executors/students.ts   — CRUD estudiantes
src/lib/memory/executors/classFacts.ts — CRUD hechos de clase
src/lib/ai/prompts.ts          — SYSTEM_PROMPT delgado centralizado
REFACTOR_PLAN.md
PLAN_PROGRESS.md
```

### Modificados

```
src/lib/ai/providers.ts        — añadir generateEmbedding(text) a la interfaz LLMProvider
src/lib/ai/gemini-provider.ts  — implementar embeddings; QUITAR sufijo duplicado (líneas 84 y 149)
src/lib/ai/ollama-provider.ts  — implementar embeddings
src/lib/ai/index.ts            — exportar helper de embeddings
src/components/services/database.ts     — migraciones + sync de documentos
src/components/services/instructionProcessor.ts — adaptador delgado → router + ejecutores
src/components/hooks/useControls.tsx    — pipeline nuevo + confirmación de borrado + updateState
src/components/services/conversationStore.ts — degradado a ventana cruda corta (2-4 turnos)
```

---

## 7. Migraciones SQL (en `database.ts`)

```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,          -- homework | group | student | class_info | fact | summary
  entity_id INTEGER,           -- referencia al registro fuente
  content TEXT NOT NULL,       -- texto del chunk
  embedding TEXT NOT NULL,     -- vector JSON
  created_at TEXT NOT NULL
);
```

- `documents` es la fuente de verdad RAG (proyecciones fragmentadas + embebidas de tareas, grupos, estudiantes y `class_info`).
- Toda escritura de ejecutor debe: insertar/actualizar el registro fuente → re-embebir/insertar/borrar su `documents` → `persistDatabase(db)`.
- Al cargar BD existente (sin las tablas nuevas), `initializeSchema` debe crearlas (CREATE TABLE IF NOT EXISTS) sin romper datos previos.

---

## 8. Memoria en 3 capas + snapshot

| Capa | Almacén | Contenido | Persistencia |
|---|---|---|---|
| Snapshot (`stateStore`) | `localStorage: nova_assistant_state_v1` + cache en memoria | tema, último mensaje, resumen última respuesta, `importantThings` (máx 8), `entitiesInPlay`, `pendingAction`, `recentIntents` | por sesión; reseteo a >30 min de inactividad |
| Corto plazo | tabla `conversations` (SQLite) / ventana de 2-4 turnos | turnos recientes crudos, para resolver pronombres | sobrevive recarga |
| Largo plazo | `facts` + `summaries` + tablas de aula | recordatorios, resúmenes rodantes, datos de clase embebidos | persistente |

### Esquema de `stateStore` (determinista, sin llamadas LLM extra)

```ts
type AssistantState = {
  topic: string | null              // tema actual de la conversación
  lastUserMessage: string
  lastAssistantSummary: string      // digesto de 1 línea de la última respuesta
  importantThings: string[]         // máx 8, derivadas de ejecutores, no de texto libre
  entitiesInPlay: { kind: 'homework' | 'group' | 'student' | 'fact'; id: number; label: string }[]
  pendingAction: { action: 'delete'; target: string } | null
  recentIntents: string[]           // últimas 5, para desambiguación
  sessionId: string
  updatedAt: string
}
```

Funciones a implementar en `stateStore.ts`:
- `getState(): AssistantState` — lee de cache o `localStorage` (JSON parse; `{}` por defecto si falla).
- `updateState(input: { intent: string; slots: unknown; executorResult?: unknown; response: string }): void` — se llama tras cada turno; deriva `topic`, `importantThings`, `entitiesInPlay`, `pendingAction`, `recentIntents`. **Sin llamadas LLM**.
- `resetState(): void` — en inicio de sesión o >30 min idle.
- `clearPendingAction(): void` — tras confirmar/descartar borrado.

Reglas:
- `importantThings`: tope 8; insertar al frente; descartar la más vieja al exceder; los borrados eliminan el ítem correspondiente.
- `pendingAction`: lo escribe el ejecutor de borrado; lo limpia el loop de confirmación.
- `topic`: se actualiza con la etiqueta del intent ganador del router (si cambia, se reinicia).

### Bloque de inyección (reemplaza el dump crudo de historial)

```
Estado actual:
- Tema: tareas
- Último usuario: "olvídate de la de historia"
- Cosas importantes: ["tarea historia para viernes", "grupos de 4 creados ayer"]
- En juego: [tarea#12]
- Pendiente: confirmar borrado de "tarea de historia"
[últimos 2 turnos sin procesar]
```

---

## 9. Pipeline detallado

1. **Router** (`router.ts`): `embed(transcript)` una sola vez; coseno contra prototipos de `intents.ts`. Umbral de coseno configurable; por debajo del umbral → intent genérico (explicar/responder).
2. **Slot filler** (`slots.ts`): una llamada LLM compacta con salida JSON `{ acción, entidad, objetivo, fecha, tamaño }`; fallback a parser local para fechas y números si el provider no responde.
3. **RAG** (`retrieval.ts`): `retrieve(query, k)` → coseno contra `documents.embedding`; devuelve texto y `kind` de los chunks.
4. **Ejecutor**: ejecuta la operación determinista en SQLite según `(acción, entidad, slots)`. Devuelve `{ ok, summaryText, pendingAction? }`.
5. **Seguridad de borrado**: si la acción es destructiva, el ejecutor **no muta**; guarda `pendingAction` y el pipeline responde "¿Borro X? ¿Confirmo?". En el siguiente turno: confirmación → ejecuta; denegación u otra cosa → descarta.
6. **Context Builder**: ensambla `SYSTEM_PROMPT` delgado + bloque de estado + ventana corta (2-4 turnos) + docs RAG (top-K), recortado por presupuesto de tokens:
   - Ollama (~200 tokens máx): 3 docs + 2 turnos.
   - Gemini (~800 tokens máx): 5 docs + resumen + 4 turnos.
7. **Respuesta**: `askLLMStream` (sin cambios de firma) → `StreamingSpeech` (sin cambios).

### Prototipos de intención (en español)

| Etiqueta | Frase de ejemplo |
|---|---|
| `ADD_HOMEWORK` | "no olvides la tarea de historia para mañana" |
| `REMOVE_HOMEWORK` | "olvídate de la tarea de matemática" |
| `LIST_HOMEWORK` | "qué tareas tengo pendientes" |
| `CREATE_GROUPS` | "haz grupos de 4" |
| `LIST_GROUPS` | "qué grupos hay formados" |
| `DELETE_GROUPS` | "borra los grupos" |
| `ADD_STUDENT` | "agrega a María al salón" |
| `REMOVE_STUDENT` | "Miguel ya no está en el salón" |
| `ASK_SCHEDULE` | "qué clases tenemos hoy" |
| `ASK_CLASS_INFO` | "quién es el tutor" / "cuál es la mascota" |
| `ASK_FACTS` | "qué tenía pendiente" |
| `EXPLAIN` | "explícame la fotosíntesis" |
| `GREETING` | "hola" |

---

## 10. Etapas de implementación (épocas)

Cada etapa termina con un commit único (convención de AGENTS.md) y el aviso de archivos cambiados. Un agente = una etapa.

| Etapa | Alcance | Criterio de aceptación |
|---|---|---|
| **0. Docs y scaffolding** | Escribir `REFACTOR_PLAN.md` y `PLAN_PROGRESS.md` | Ambos docs en raíz, commit `[docs: plan de refactor RAG+memoria]` |
| **1. Embeddings** | Interfaz `generateEmbedding` en `providers.ts`; impl Gemini (`embedContent`, modelo `text-embedding-004`); impl Ollama (`/api/embeddings`); fallback BM25 en `rag/embeddings.ts` | `npm run build` OK; helper devuelve vector `number[]` o scoring BM25 |
| **2. BD + documentos** | Migraciones §7 en `database.ts`; `syncDocument(kind, entityId, content)` y `removeDocument(entityId)`; invocar en escrituras existentes (`createGroupsBySize`, `addHomework`, `clearGroups`, `clearHomework`) | Tablas creadas; escrituras actualizan `documents`; datos sobreviven recarga |
| **3. RAG** | `rag/index.ts` (índice, upsert, delete, cache) y `rag/retrieval.ts` (coseno, top-K) | `retrieve` devuelve top-K correcto para queries ES de prueba (p. ej. "¿qué tarea dejó el profe de física?") |
| **4. Router + slots** | `router/intents.ts`, `router/router.ts`, `router/slots.ts` | Frases naturales ES → `(ACCIÓN, entidad)`; ejemplo objetivo: "no olvides la tarea de historia para mañana" → `(ADD_HOMEWORK, {entidad: 'historia', fecha: 'mañana'})` |
| **5. Memoria** | `stateStore`, rewrite de `conversationStore` (ventana corta), `summarizer`, `facts` | Snapshot correcto tras turnos; resumen a >8 turnos; reset por idle; recordatorios consultables |
| **6. Ejecutores + confirmación** | `executors/*` CRUD completo; loop de confirmación de borrado en `useControls` | "borra la tarea de historia" → pregunta → confirmación borra; denegación no borra |
| **7. Slim prompts + pipeline** | `ai/prompts.ts`; quitar sufijos duplicados de `gemini-provider.ts:84,149`; cablear pipeline en `useControls.tsx` | Sin duplicación de instrucciones; pipeline completo funcionando con streaming intacto |
| **8. Pruebas e integración** | `npm run lint`, `npm run build`; pruebas de voz manual en español | Lint y build limpios; flujo de voz completo OK (agregar, borrar, consultar, explicar) |

### Dependencias entre etapas
- 1 → 3 y 4 (embeddings primero).
- 2 → 3 (docs necesarios para índice).
- 4 → 6 (intents dirigen ejecutores).
- 5, 6, 7 convergen en 8.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Deriva / obsolescencia del snapshot | `updateState` determinista por turno + TTL (30 min idle) + tope de tamaño |
| Pronombres sin contexto | ventana cruda corta de 2-4 turnos conservada |
| Embeddings no disponibles | fallback BM25; la app nunca se rompe |
| Falsos positivos del router | confirmación de borrado + umbral de coseno configurable |
| BD previa sin tablas nuevas | `CREATE TABLE IF NOT EXISTS` en `initializeSchema` |
| Regresión de streaming/TTS | no tocar firmas de `askLLMStream`, `StreamingSpeech`, `StreamingContext` |

---

## 12. Fuera de alcance

Wake-word, multi-aula, dashboard de profesor, migración de BD de producción, embeddings 100% en navegador (sin provider), persistencia a archivo físico real.

---

## 13. Referencias de código

- `src/components/services/instructionProcessor.ts` — regex actuales a reemplazar.
- `src/components/services/conversationStore.ts` — memoria actual a degradar.
- `src/components/services/gemini.ts:7` — SYSTEM_PROMPT actual.
- `src/lib/ai/gemini-provider.ts` — endpoint y sufijos duplicados (líneas 84, 149).
- `src/lib/ai/providers.ts` — interfaz a extender con `generateEmbedding`.
- `src/components/services/database.ts` — `persistDatabase`, `initializeSchema`, seed.
- `src/components/hooks/useControls.tsx` — pipeline actual a re-cablear.
