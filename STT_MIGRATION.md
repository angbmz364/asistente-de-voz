Offline Speech-to-Text Migration (Faster-Whisper)

Overview

Goal: Replace browser SpeechRecognition with a fully offline Faster-Whisper based STT while keeping the current app architecture and minimizing changes.

Summary of choices

- Approach: Local Python FastAPI service running `faster-whisper`.
- Reason: `faster-whisper` is a mature Python library with good offline accuracy and model options; easier to run server-side and integrate with frontend via simple HTTP.
- Frontend: Use `MediaRecorder` to capture audio and POST to local STT server; keep existing `startListening/stopListening` semantics.

Files added/changed

- `src/components/services/listen.ts` — extended to support `VITE_STT_PROVIDER=faster-whisper` (records audio and posts to the local server)
- `src/lib/stt/providers.ts` — STT provider interface
- `src/lib/stt/index.ts` — provider wrapper exposing existing listen functions
- `stt_server/main.py` — FastAPI server using `faster-whisper`
- `stt_server/requirements.txt` — Python deps
- `stt_server/README.md` — STT server setup guide
- `.env.example` — added `VITE_STT_PROVIDER` and `VITE_STT_SERVER_ENDPOINT`

Why Python FastAPI service?

- `faster-whisper` is Python-native; easiest to run reliably.
- FastAPI + uvicorn is lightweight and production-capable.
- Keeps browser code minimal (no heavy model code client-side).
- Allows using system `ffmpeg` for broad audio format support.

Installation (quick)

1. Install `ffmpeg` (required).

- macOS (Homebrew):
```bash
brew install ffmpeg
```

- Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

- Windows: download from https://ffmpeg.org/download.html and add to PATH

2. Python server

```bash
cd stt_server
python -m venv venv
# macOS/Linux
source venv/bin/activate
# Windows (PowerShell)
# venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Run server (default host 0.0.0.0:11435)
FW_MODEL=small FW_DEVICE=cpu python main.py
# or use uvicorn directly
python -m uvicorn main:app --host 0.0.0.0 --port 11435
```

3. Frontend

- Update `.env.local`:
```
VITE_STT_PROVIDER=faster-whisper
VITE_STT_SERVER_ENDPOINT=http://localhost:11435
```
- Start frontend
```bash
pnpm dev
```

Testing procedure

1. Start STT server and wait for first model load (may be slow).
2. Start frontend.
3. Click mic in UI to start recording, speak in Spanish, click again to stop.
4. Check browser console for `Speech → Text:` logs and that Nova responds.

Troubleshooting

- Server not reachable: verify STT server running and port matches `VITE_STT_SERVER_ENDPOINT`.
- CORS: ensure server origin (http://localhost:5173) is allowed in `stt_server/main.py`.
- ffmpeg missing: install ffmpeg; faster-whisper relies on it for some formats.
- Slow first response: model download/cache step — use a smaller model (e.g., `tiny` or `small`) for quick demos.
- Audio quality: use a clear microphone and moderate recording time; longer audio gives better context.

Demo checklist for Friday

- STT server running with `FW_MODEL=small` (or `tiny` for speed)
- Frontend configured with `VITE_STT_PROVIDER=faster-whisper`
- Test these scenarios:
  - "Hola, cómo te llamas" → Nova short reply
  - "Explícame la fotosíntesis" → educational reply
  - "Crea grupos de 3" → local DB group creation + confirmation
  - Noise robustness: speak at moderate volume

Notes & next steps

- Optionally implement silence detection on the frontend to auto-stop recording after pause (future improvement).
- Consider adding a health endpoint `/health` on the STT server for readiness checks.
- Monitor CPU/memory when running `small`/`medium` models; switch to `tiny` for low-resource demos.
