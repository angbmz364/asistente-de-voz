# Nova &middot; School Assistant

Nova is an offline-first classroom voice assistant designed to support teachers and students in real educational environments.

Unlike a traditional chatbot, Nova separates classroom logic from language generation. Administrative tasks such as attendance, homework management, group creation, schedules, and student records are handled locally by the backend, while the language model focuses exclusively on understanding requests and generating natural responses.

The project is built with the goal of eventually operating completely offline inside a classroom.

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
Intent Detection
    ↓
Backend Logic
    ↓
SQLite Database
    ↓
Context Builder
    ↓
Gemma
    ↓
Natural Language Response
    ↓
Text-to-Speech
```

---

## Design Philosophy

Nova treats the language model as a language engine, not as the system itself.

### The Backend Handles

- Student management
- Homework management
- Group generation
- Scheduling
- Persistent memory
- Business logic

### The Language Model Handles

- Natural conversation
- Educational explanations
- Summaries
- Response generation

This approach improves:

- Reliability
- Speed
- Determinism
- Offline compatibility
- Lower inference costs

---

## Technology Stack

### Frontend

- React
- TypeScript
- Tailwind CSS

### Backend

- TypeScript

### Storage

- SQLite

### AI

- Ollama
- Gemma

### Voice

- Speech-to-Text (browser or local Faster-Whisper via `stt_server`)
- Text-to-Speech

---

## Database Structure

### Students

Stores classroom student information.

```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
```

### Homeworks

Stores homework assignments.

```sql
CREATE TABLE homeworks (
    id INTEGER PRIMARY KEY,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT
);
```

### Groups

Stores generated student groups.

```sql
CREATE TABLE groups (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Group Members

Stores students assigned to groups.

```sql
CREATE TABLE group_members (
    group_id INTEGER,
    student_id INTEGER
);
```

---

## Context Injection Strategy

Nova does not send the entire database to the language model.

Instead, the backend retrieves only the information needed for the current request.

Example:

User request:

```text
Nova, what homework do we have?
```

Backend query:

```sql
SELECT * FROM homeworks
ORDER BY id DESC
LIMIT 1;
```

Context sent to Gemma:

```text
Current homework:
Physics
Exercises 1-10
Due Friday
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
Nova, create groups of 5 students.
```

Backend:

1. Detects intent
2. Retrieves students
3. Generates groups
4. Stores groups
5. Builds response context

Gemma:

```text
The groups have been created successfully.
```

The language model never creates the groups itself.

---

## Goals

### Current

- Local database
- Persistent memory
- Educational assistant
- Classroom administration
- Local language model integration

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