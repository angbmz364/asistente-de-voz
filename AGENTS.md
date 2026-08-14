# NOVA
Nova is a voice assitant designed for schools, it's main purpose is help teachers with: schedule homeworks, take attendance, form groups, remember pendings, remember groups, and also Nova can answer questions and explain study related topics to students.

## Tech Stack
* **Languages** -- Python & TypeScript
* **Frontend:** -- React + TailwindCSS using Vite
* **Speech-to-Text:** -- Python Backend using Faster Whisper
* **Storage** -- Local database with SQLite

## Features
* Offline support
* API and Local model support
* Dynamic system prompt injection
* Text streaming
* Local Database
* Reminders

## Conventions
* Use camelCase.
* reuse components.
* minimal style.
* tailwindcss for styling.
* priorize performance.
* Use pnpm as package manager and run scripts

## Clock-Out
* Run tests `pnpm run tests` and linter `pnpm run lint`
* If tests and lint passes, write a commit

## Workflow 
* Only work at one task/feature at time
* After finish a task/feature follow the clock-out instructions.

## Commits structure
* conventional commits `git commit -m "feat: add a feature"`