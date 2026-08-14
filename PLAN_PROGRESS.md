# NOVA — Progreso del Refactor (RAG + Memoria)

> Guía de ejecución: un agente = una etapa. Cada etapa termina con commit único (convención AGENTS.md) y actualización de este archivo (marcar la etapa como COMPLETADA y anotar el commit en el registro). Antes de empezar una etapa, leer `REFACTOR_PLAN.md` completo.
> Lenguaje del proyecto: **español**.

## Estado general

| Ítem | Estado |
|---|---|
| Plan | **APROBADO** (`REFACTOR_PLAN.md`) |
| Implementación | **EN CURSO** (etapa 2: BD + documentos) |

## Etapas

| Etapa | Descripción | Estado | Criterio de aceptación |
|---|---|---|---|
| 0 | Docs y scaffolding (`REFACTOR_PLAN.md`, `PLAN_PROGRESS.md`) | **COMPLETADA** | Docs en raíz; commit `fdf270a` |
| 1 | Embeddings (interfaz + Gemini + Ollama + BM25) | **COMPLETADA** | `npm run build` OK; lint verde |
| 2 | BD: migraciones + sync `documents` | PENDIENTE | Tablas creadas; escrituras actualizan docs |
| 3 | RAG: índice vectorial + retrieval | PENDIENTE | `retrieve` devuelve top-K correcto |
| 4 | Router semántico + slot filler | PENDIENTE | Frases naturales ES → (ACCIÓN, entidad) |
| 5 | Memoria: stateStore, ventana corta, summarizer, facts | PENDIENTE | Snapshot correcto; resumen a >8 turnos |
| 6 | Ejecutores CRUD + confirmación de borrado | PENDIENTE | Confirmación borra/deniega correctamente |
| 7 | Slim prompts + pipeline `useControls` | PENDIENTE | Sin duplicación de instrucciones |
| 8 | Pruebas: lint, build, voz manual ES | PENDIENTE | Lint y build limpios |

## Registro de actividad

| Fecha | Etapa | Cambio | Commit | Archivos |
|---|---|---|---|---|
| — | 0 | Creación del plan de refactor y del seguimiento | `fdf270a` | `REFACTOR_PLAN.md`, `PLAN_PROGRESS.md` |
| 2026-08-13 | 1 | Embeddings: interfaz `generateEmbedding`, Gemini `text-embedding-004`, Ollama `/api/embeddings`, fallback BM25 en `rag/embeddings.ts`, helper en `ai/index.ts`. Bonus: se arreglaron 11 errores de lint pre-existentes para dejar lint verde | — | `src/lib/ai/providers.ts`, `gemini-provider.ts`, `ollama-provider.ts`, `index.ts`, `src/lib/rag/embeddings.ts`, `.env.example`, `STREAMING_VERIFICATION.ts`, `StreamingContext.tsx`, `useControlsStreaming.tsx`, `listen.ts`, `vite-env.d.ts` |

## Check-list por etapa

### Etapa 0 — Docs y scaffolding
- [x] `REFACTOR_PLAN.md` escrito con arquitectura, módulos, migraciones y etapas
- [x] `PLAN_PROGRESS.md` creado con estado y registro
- [x] Commit `[docs]` (`fdf270a`)

### Etapa 1 — Embeddings
- [x] Añadir `generateEmbedding(text): Promise<number[]>` a `LLMProvider` (`src/lib/ai/providers.ts`)
- [x] Implementar en `gemini-provider.ts` (endpoint `embedContent`, modelo `text-embedding-004`)
- [x] Implementar en `ollama-provider.ts` (`POST {endpoint}/api/embeddings`)
- [x] Fallback BM25 en `src/lib/rag/embeddings.ts` (embebido por palabras clave cuando no hay provider)
- [x] Exportar helper en `src/lib/ai/index.ts`
- [x] `npm run build` OK (y lint verde; se arregló deuda de lint pre-existente)
- [x] Commit `[feat]`

### Etapa 2 — BD + documentos
- [ ] Migraciones §7 en `database.ts` (tablas `conversations`, `summaries`, `facts`, `documents`)
- [ ] `syncDocument(kind, entityId, content)` y `removeDocument(entityId)` (insert/update + borrado de proyección)
- [ ] Invocar sync en `createGroupsBySize`, `addHomework`, `clearGroups`, `clearHomework`
- [ ] `persistDatabase` tras cada escritura
- [ ] Verificar supervivencia a recarga
- [ ] Commit `[feat]`

### Etapa 3 — RAG
- [ ] `src/lib/rag/index.ts`: índice vectorial (upsert, delete, cache en memoria)
- [ ] `src/lib/rag/retrieval.ts`: coseno + top-K
- [ ] Prueba manual: `retrieve("¿qué tarea dejó el profe de física?")` devuelve la tarea de física
- [ ] Commit `[feat]`

### Etapa 4 — Router semántico + slot filler
- [ ] `src/lib/router/intents.ts`: prototipos (ver §9 del plan) con vectores de referencia ES
- [ ] `src/lib/router/router.ts`: coseno query vs prototipos, umbral configurable
- [ ] `src/lib/router/slots.ts`: salida JSON LLM `{acción, entidad, objetivo, fecha, tamaño}` + fallback parser local
- [ ] Test: "no olvides la tarea de historia para mañana" → `(ADD_HOMEWORK, {entidad: historia, fecha: mañana})`
- [ ] Commit `[feat]`

### Etapa 5 — Memoria
- [ ] `src/lib/memory/stateStore.ts` (`getState`, `updateState`, `resetState`, `clearPendingAction`)
- [ ] Rewrite `conversationStore.ts` → ventana corta 2-4 turnos, persistida en `conversations`
- [ ] `src/lib/memory/summarizer.ts` (resumen rodante a >8 turnos)
- [ ] `src/lib/memory/facts.ts` (pendientes/recordatorios embebidos)
- [ ] Reset por >30 min de inactividad
- [ ] Commit `[feat]`

### Etapa 6 — Ejecutores + confirmación
- [ ] `executors/homework.ts`, `groups.ts`, `students.ts`, `classFacts.ts` (CRUD completo ES)
- [ ] Loop de confirmación de borrado (estado `pendingAction`)
- [ ] Test voz: "borra la tarea de historia" → pregunta → confirmar borra / denegar no borra
- [ ] Commit `[feat]`

### Etapa 7 — Slim prompts + pipeline
- [ ] `src/lib/ai/prompts.ts` (SYSTEM_PROMPT delgado centralizado)
- [ ] Quitar sufijos duplicados en `gemini-provider.ts:84,149`
- [ ] Cablear router → RAG → ejecutor → context builder en `useControls.tsx`
- [ ] Sin duplicación de instrucciones; streaming intacto
- [ ] Commit `[refactor]`

### Etapa 8 — Pruebas e integración
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Prueba manual voz ES: agregar, borrar, consultar, explicar
- [ ] Actualizar `README.md` si procede
- [ ] Commit final `[chore]`
