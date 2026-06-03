# NOVA - ASISTENTE DE VOZ ESCOLAR

## Architecture requirements
* Use a local SQLite database to store students, class context, and generated groups.
* Process user speech locally first: parse the command, fetch students, create groups or resolve class data.
* After local processing completes, send only the needed data and the original user prompt to the AI.
* The AI should never fetch additional data on its own; it must answer using the supplied context only.

## Features (Soporte al docente)
* Pasar lista
* Formar grupos de X cantidad
* Dejar tarea
* Preguntar por grupos, integrantes, o tareas dejadas
* Acceso a la hora
* Offline