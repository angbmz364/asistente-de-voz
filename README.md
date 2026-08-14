# Nova &middot; School Assistant
Nova is an offline-first classroom voice assistant designed to support teachers and students in real educational environments.
Unlike a traditional chatbot, Nova separates classroom logic from language generation. Administrative tasks such as attendance, homework management, group creation, schedules, and student records are handled locally by the backend, while the language model focuses -exclusively on understanding requests and generating natural responses.
---

## Features

### Educational Assistant

- Answer academic questions
- Explain concepts in simple language
- Summarize topics
- Adapt explanations to student level
- Voice-first interaction

### Classroom Management

- Store students
- Create groups automatically
- Register homework assignments
- Retrieve homework reminders
- Manage schedules
- Persistent classroom memory

### Offline-First Architecture

- SQLite for local storage
- Local LLM support through Ollama
- No dependency on cloud services for classroom data
- Designed for future fully-offline deployments

---

## Architecture

Nova follows a layered architecture:

```text
Voice Input
    ↓
Speech-to-Text
    ↓
Semantic Router (cosine vs prototypes)
    ↓
Slot Filler (LLM JSON / local parser)
    ↓
RAG retrieval (top-K by cosine)
    ↓
Local Executor (CRUD on SQLite, with delete confirmation)
    ↓
Context Builder (state snapshot + docs + short window)
    ↓
LLM stream (Gemini / Ollama)
    ↓
Text-to-Speech
```

The LLM never mutates the database: only local executors write.

### Memory

- **Working memory**: deterministic snapshot (`stateStore`) persisted in `localStorage`: topic, important things (max 8), entities in play, pending deletion, recent intents.
- **Short-term**: last 2-4 turns persisted in the `conversations` table.
- **Long-term**: `facts` + rolling `summaries` + embedded classroom records (RAG).
- Idle reset after 30 minutes of inactivity.
- Destructive actions ask for voice confirmation before mutating.

---

## Tech Stack
* **Frontend** -- React + TailwindCSS (Vite)
* **Backend** -- Typescript
* **Storage** -- Local storage and SQLite
* **Speech-to-Text** -- Faster-Whisper

---

## Database Structure

SQLite via `sql.js`, persisted to `localStorage`.

- `students`, `class_info`, `groups`, `homework` — classroom records.
- `conversations` — short-term window (role, content).
- `summaries` — rolling conversation summaries.
- `facts` — free-form pendings / reminders.
- `documents` — **RAG source of truth**: fragmented, embedded projections of homework, groups, students, facts, summaries and class info, queried by cosine similarity.

### Homeworks

Stores homework assignments.

```sql
CREATE TABLE homework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    due_date TEXT,
    created_at TEXT NOT NULL
);
```

### Groups

Stores generated student groups.

```sql
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    members TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

### Documents (RAG)

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,      -- homework | group | student | class_info | fact | summary
    entity_id INTEGER,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at TEXT NOT NULL
);
```

---

## Context Injection Strategy (RAG)

Nova does not send the entire database to the language model.

Instead it embeds the transcript once and retrieves the top-K `documents`
by cosine similarity, then builds a thin prompt with a token budget:

- **Gemini**: up to 5 docs + rolling summary + 4 turns.
- **Ollama**: up to 3 docs + 2 turns.

Embeddings come from the provider (Gemini `embedContent` / Ollama
`/api/embeddings`); if unavailable, a local keyword (BM25-style) vector
keeps the app working offline.

Example:

User request:

```text
Nova, ¿qué tarea dejó el profe de física?
```

RAG top-K:

```text
Tarea: resolver ejercicios del libro de física. Fecha de entrega: viernes
```

This reduces:

- Context size
- RAM usage
- Inference time
- Hallucinations

---

## Example Workflow

Teacher:

```text
Nova, haz grupos de 4.
```

Pipeline:

1. Semantic router detects `CREATE_GROUPS`
2. Slot filler extracts group size (4)
3. Executor generates and stores groups locally
4. Nova answers directly, without the LLM

Deletions are confirmed by voice first:

```text
Nova, borra la tarea de historia.
Nova: ¿Confirmo que borro la tarea de historia?
Teacher: Sí, confirmo.
```
The language model never creates or mutates classroom data: only local executors do.

---

## Goals

### Current

- Local database (SQLite via sql.js, persisted in localStorage)
- Persistent memory (stateStore + conversations + summaries + facts)
- RAG context injection with offline BM25 fallback
- Semantic intent router in Spanish
- Educational assistant
- Classroom administration with voice confirmation for destructive actions
- Local and cloud language model integration

### Future

- Fully offline deployment
- Local speech recognition
- Wake-word detection
- Attendance management
- Multi-classroom support
- Teacher dashboard
- Classroom analytics

---

## Project Vision

Nova aims to become a practical classroom assistant that helps teachers manage routine tasks while helping students learn through natural voice interaction.

The objective is not to replace teachers, but to reduce repetitive administrative work and make educational support more accessible inside the classroom.

---

## License

This project is intended for educational and research purposes.