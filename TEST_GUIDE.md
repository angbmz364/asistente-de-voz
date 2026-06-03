# Nova LLM Provider Testing Guide

This guide explains how to test both the Gemini and Ollama providers to ensure they work correctly.

## Architecture Verification

### 1. Check Provider Interface
The new provider abstraction is defined in `src/lib/ai/providers.ts`:
- `LLMProvider` interface
- `LLMResponse` type
- Provider factory in `src/lib/ai/index.ts`

### 2. Verify Provider Implementations
- **Gemini**: `src/lib/ai/gemini-provider.ts`
- **Ollama**: `src/lib/ai/ollama-provider.ts`

### 3. Build Verification
```bash
# Build the project
pnpm build

# Should complete without errors
```

## Testing Gemini Provider

### Prerequisites
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup
1. Create `.env.local`:
```
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_GEMINI_MAX_TOKENS=800
```

2. Start development server:
```bash
pnpm dev
```

3. Open browser at `http://localhost:5173`

### Manual Test
1. Click the microphone button
2. Say: "What's the capital of Peru?"
3. Verify response is in Spanish
4. Check browser console for:
   - Provider name: "Gemini (gemini-2.5-flash)"
   - Response logs with token usage

### Expected Output
```
Gemini (gemini-2.5-flash) → Response: {
  length: 45,
  preview: "La capital de Perú es Lima...",
  usage: { inputTokens: 156, outputTokens: 23 }
}
```

## Testing Ollama Provider

### Prerequisites
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull Gemma 3 4B: `ollama pull gemma3:4b`

### Setup
1. Start Ollama (in separate terminal):
```bash
ollama serve
```

Verify connection:
```bash
curl http://localhost:11434/api/tags
```

2. Create `.env.local`:
```
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=gemma3:4b
VITE_OLLAMA_MAX_TOKENS=200
```

3. Start development server:
```bash
pnpm dev
```

### Manual Test
1. Click the microphone button
2. Say: "Create groups of 3 students"
3. Verify Nova creates groups and responds
4. Check browser console for:
   - Provider name: "Ollama (gemma3:4b)"
   - Response logs with token usage
   - No API key warnings

### Expected Output
```
Ollama (gemma3:4b) → Response: {
  length: 52,
  preview: "Se han creado grupos de 3 estudiantes...",
  usage: { inputTokens: 234, outputTokens: 18 }
}
```

## Testing Provider Switching

### Switch from Gemini to Ollama
1. Stop development server (Ctrl+C)
2. Update `.env.local` to use Ollama config
3. Restart: `pnpm dev`
4. Verify in console: "Ollama (gemma3:4b)" appears
5. Test voice command

### Switch Back to Gemini
1. Stop development server
2. Update `.env.local` to use Gemini config
3. Restart: `pnpm dev`
4. Verify in console: "Gemini (gemini-2.5-flash)" appears
5. Test voice command

## Browser Console Debugging

Open Developer Tools (F12) and check Console tab for:

### Successful Gemini Response
```
ℹ️ Sending to Gemini (prompt preview): {length: 245, preview: "..."}
ℹ️ Gemini (gemini-2.5-flash) → Response: {length: 48, preview: "...", usage: {...}}
```

### Successful Ollama Response
```
ℹ️ Sending to Ollama (prompt preview): {model: "gemma3:4b", length: 312, preview: "..."}
ℹ️ Ollama (gemma3:4b) → Response: {length: 52, preview: "...", usage: {...}}
```

### Common Errors

#### Gemini API Key Missing
```
❌ Missing VITE_GEMINI_API_KEY. Add your API key to .env.local.
```

#### Ollama Not Running
```
❌ Could not connect to Ollama at http://localhost:11434
❌ Make sure Ollama is running: ollama serve
```

#### Model Not Found on Ollama
```
❌ Model gemma3:4b not found on Ollama
❌ Available models: []
```

## Performance Testing

### Gemini Performance
- First response: 2-4 seconds
- Subsequent requests: 1-3 seconds
- Token usage visible in console

### Ollama Performance
- Cold start (first run after boot): 10-30 seconds
- Warm cache: 3-8 seconds
- Depends on CPU/GPU and context size

### Optimization Tips

**For Gemini:**
- Reduce `VITE_GEMINI_MAX_TOKENS` to 400
- Use `gemini-1.5-flash` model

**For Ollama:**
- Enable GPU: `ollama gpu`
- Reduce `VITE_OLLAMA_MAX_TOKENS` to 100-150
- Ensure 4GB+ RAM available

## Test Scenarios

### Scenario 1: Homework Assignment
User: "Add homework: Math exercises for tomorrow"

**Expected Behavior:**
- Instruction processor detects homework save request
- Stores in SQLite
- LLM generates confirmation response
- Voice output confirms assignment

### Scenario 2: Group Creation
User: "Create groups of 4"

**Expected Behavior:**
- Instruction processor detects group creation request
- Queries students from SQLite
- Generates groups locally
- LLM confirms group creation
- Groups stored in database

### Scenario 3: Schedule Query
User: "What time is the break?"

**Expected Behavior:**
- Instruction processor detects schedule request
- Queries class info from SQLite
- Sends context to LLM
- LLM responds with break time
- Voice output announces break time

## Troubleshooting

### Issue: No audio response
- Check browser console for errors
- Ensure microphone permissions granted
- Try speaking clearly and pause between words

### Issue: Very slow responses (Ollama)
- Ollama is loading model (first run)
- System may be under-resourced
- Check Task Manager for available RAM
- Reduce `VITE_OLLAMA_MAX_TOKENS`

### Issue: Provider not switching
- Hard refresh browser (Ctrl+F5)
- Clear localStorage: `window.localStorage.clear()`
- Check `.env.local` for typos
- Verify correct `VITE_LLM_PROVIDER` value

### Issue: Build fails
- Clear node_modules: `pnpm install --force`
- Check TypeScript errors: `pnpm tsc --noEmit`
- Verify file paths are correct

## Continuous Integration

To add CI testing for both providers:

```yaml
test:
  matrix:
    provider: [gemini, ollama]
  steps:
    - run: pnpm build
    - run: pnpm test
```

## Conclusion

The provider abstraction layer allows:
- ✓ Easy switching between Gemini and Ollama
- ✓ No code changes required
- ✓ Both providers tested independently
- ✓ Future provider additions

For more details, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).
