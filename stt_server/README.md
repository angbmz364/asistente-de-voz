Faster-Whisper STT Server

This small FastAPI server accepts an audio file and returns a transcription using Faster-Whisper.

Prerequisites

- Python 3.10+
- ffmpeg installed and available on PATH

Quick setup

```bash
python -m venv venv
# macOS / Linux
source venv/bin/activate
# Windows PowerShell
venv\Scripts\Activate.ps1
# Windows cmd.exe
venv\Scripts\activate.bat

pip install -r requirements.txt
```

Run

```bash
# macOS / Linux
FW_MODEL=small FW_DEVICE=cpu python main.py
# Windows PowerShell
$env:FW_MODEL = "small"
$env:FW_DEVICE = "cpu"
python main.py
# Windows cmd.exe
set FW_MODEL=small
set FW_DEVICE=cpu
python main.py

# or run uvicorn directly:
python -m uvicorn main:app --host 0.0.0.0 --port 11435
```

Usage

Send a multipart POST to `/transcribe` with form field `file` containing audio (webm, wav, mp3). The server will return JSON: `{ "transcript": "...", "language": "es" }`.

Notes

- For Spanish, `small` or `medium` models are recommended for a balance of accuracy and speed.
- Ensure `ffmpeg` is installed to allow conversion of common audio containers.
- The first request will download and cache the model, which may take time and disk space.
- On first startup, Faster-Whisper may print a Hugging Face warning such as:
  - `Warning: You are sending unauthenticated requests to the HF Hub...`
  This is normal during model download.
- After the model finishes downloading, the server should start and be reachable at `http://localhost:11435/`.
- To reduce download throttling, optionally set `HF_TOKEN` before starting:
  - PowerShell: `$env:HF_TOKEN = "your_token_here"`
  - cmd.exe: `set HF_TOKEN=your_token_here`
