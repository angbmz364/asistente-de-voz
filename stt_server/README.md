Faster-Whisper STT Server

This small FastAPI server accepts an audio file and returns a transcription using Faster-Whisper.

Prerequisites

- Python 3.10+
- ffmpeg installed and available on PATH

Quick setup

```bash
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Run

```bash
# Optional env vars: FW_MODEL (tiny, base, small, medium, large-v2), FW_DEVICE (cpu, cuda), FW_COMPUTE_TYPE (int8, int8_float16)
FW_MODEL=small FW_DEVICE=cpu python main.py
# or
python -m uvicorn main:app --host 0.0.0.0 --port 11435
```

Usage

Send a multipart POST to `/transcribe` with form field `file` containing audio (webm, wav, mp3). The server will return JSON: `{ "transcript": "...", "language": "es" }`.

Notes

- For Spanish, `small` or `medium` models are recommended for a balance of accuracy and speed.
- Ensure `ffmpeg` is installed to allow conversion of common audio containers.
- The first request will download and cache the model, which may take time and disk space.
