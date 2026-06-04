# Nova LLM Setup Guide

This guide explains how to configure Nova to use different language model providers.

## Quick Start

### Using Gemini API (Default)

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

3. Add your API key to `.env.local`:
```
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
pnpm dev
```

### Using Ollama (Local Inference)

1. **Install Ollama** from [ollama.ai](https://ollama.ai)

2. **Pull the Gemma 3 4B model**:
```bash
ollama pull gemma3:4b
```

3. **Start Ollama** (in a separate terminal):
```bash
ollama serve
```

4. Update `.env.local`:
```
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=gemma3:4b
VITE_OLLAMA_MAX_TOKENS=200
```

5. Start Nova:
```bash
pnpm dev
```

## Offline Speech-to-Text (Faster-Whisper)

To use the local STT backend instead of browser speech recognition, run the Python server in `stt_server`.

1. Create and activate the virtual environment:
```powershell
cd stt_server
python -m venv venv
venv\Scripts\Activate.ps1
```

2. Install dependencies:
```powershell
pip install -r requirements.txt
```

3. Start the server with environment variables:
```powershell
$env:FW_MODEL = "small"
$env:FW_DEVICE = "cpu"
python main.py
```

4. The first run may show a Hugging Face warning while the model downloads. This is expected; wait until the server prints the Uvicorn startup message.

5. Verify the server is running by opening:
```text
http://localhost:11435/
```

6. Optional: set `HF_TOKEN` to speed downloads and avoid unauthenticated rate limits.

## Provider Comparison

| Feature | Gemini | Ollama |
|---------|--------|--------|
| **Cost** | Free tier available | Free (local) |
| **Latency** | Network-dependent | Depends on hardware |
| **Privacy** | Cloud-based | 100% local |
| **Offline** | No | Yes |
| **Hardware Required** | None | 4GB+ RAM |
| **GPU Support** | N/A | Yes (NVIDIA/AMD) |

## Environment Variables

### LLM Provider Selection
```
VITE_LLM_PROVIDER=gemini    # or 'ollama'
```

### Gemini Configuration
```
VITE_GEMINI_API_KEY=xxx           # Required for Gemini
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_GEMINI_MAX_TOKENS=800
```

### Ollama Configuration
```
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=gemma3:4b
VITE_OLLAMA_MAX_TOKENS=200        # Keep small for voice responses
```

## Troubleshooting

### "Failed to connect to Ollama"
- Make sure Ollama is running: `ollama serve`
- Check endpoint is correct: `curl http://localhost:11434/api/tags`

### "Model not found on Ollama"
- Pull the model: `ollama pull gemma3:4b`
- List available models: `ollama list`

### Slow Gemini responses
- Reduce `VITE_GEMINI_MAX_TOKENS` to 400-600
- Check internet connection

### Slow Ollama responses
- Model is loading for first time (normal)
- Consider GPU acceleration: `ollama gpu` (if supported)
- Reduce `VITE_OLLAMA_MAX_TOKENS` to 100-150
- Check available RAM: `free -h` or Task Manager

## Architecture

Nova uses a provider abstraction pattern:

```
┌──────────────────────┐
│   User Instruction   │
└──────────────┬───────┘
               │
┌──────────────▼────────────────┐
│  Instruction Processor        │
│  (Intent Detection, Context)  │
└──────────────┬────────────────┘
               │
┌──────────────▼──────────────────┐
│     LLM Provider Interface       │
│  (Abstraction Layer)            │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
   ┌────▼──┐    ┌────▼──────┐
   │Gemini │    │Ollama      │
   │API    │    │Local Model │
   └───────┘    └────────────┘
```

The instruction processor handles all business logic (groups, homework, schedules), while the LLM provider focuses only on natural language generation.

## Switching Providers

To switch from Gemini to Ollama (or vice versa), just update `VITE_LLM_PROVIDER` in `.env.local` and restart the development server.

No code changes needed!

## Performance Tips

### For Gemini
- Use `gemini-1.5-flash` for faster responses
- Reduce `VITE_GEMINI_MAX_TOKENS` to 400
- Enable caching for repeated questions

### For Ollama
- Use `gemma3:4b` (lightweight)
- Enable GPU with `ollama gpu`
- Reduce context window to 128 if needed
- Keep `VITE_OLLAMA_MAX_TOKENS` under 200 for voice assistant

## Adding New Providers

To add a new provider (e.g., LLaMA, Mistral):

1. Create a new file in `src/lib/ai/your-provider.ts`
2. Implement the `LLMProvider` interface
3. Export it in `src/lib/ai/index.ts`
4. Add configuration in `.env.example`

Example:
```typescript
import type { LLMProvider, LLMResponse } from './providers'

class MyProvider implements LLMProvider {
  getName(): string { return "My Provider" }
  async validateConfig(): Promise<void> { /* ... */ }
  async generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse> { /* ... */ }
}

export default new MyProvider();
```
