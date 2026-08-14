from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn
import tempfile
import os

MODEL_NAME = os.getenv('FW_MODEL', 'tiny')
DEVICE = os.getenv('FW_DEVICE', 'cpu')
COMPUTE_TYPE = os.getenv('FW_COMPUTE_TYPE', None)  # e.g., 'int8'

# Initialize model (will download/model cache as needed)
model_kwargs = {}
if COMPUTE_TYPE:
    model_kwargs['compute_type'] = COMPUTE_TYPE

model = WhisperModel(MODEL_NAME, device=DEVICE, **model_kwargs)

app = FastAPI()

# Allow only localhost origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = "es"):
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        contents = await file.read()
        tmp.write(contents)

    try:
        segments, info = model.transcribe(tmp_path, language=language)
        text = " ".join([seg.text for seg in segments]).strip()
        return {"transcript": text, "language": info.language}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=11435)
