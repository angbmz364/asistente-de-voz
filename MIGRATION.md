# Migration to Local LLM (Ollama) - Implementation Details

## Overview

This document describes the migration from Gemini API to local LLM inference via Ollama, including the provider abstraction architecture.

## Changes Made

### 1. New Files Created

#### `src/lib/ai/providers.ts` - Provider Interface
- Defines `LLMProvider` interface that all providers must implement
- Defines `LLMResponse` type with token usage tracking
- Enables easy addition of new providers in the future

#### `src/lib/ai/gemini-provider.ts` - Gemini Provider
- Extracted Gemini logic from `src/components/services/gemini.ts`
- Implements `LLMProvider` interface
- Manages Gemini API requests and response parsing
- Tracks token usage from Gemini API

#### `src/lib/ai/ollama-provider.ts` - Ollama Provider
- New provider for local Gemma 3 4B inference
- Implements `LLMProvider` interface
- Optimized for low-latency voice responses
- Tracks token usage from Ollama metrics

#### `src/lib/ai/index.ts` - Provider Factory
- Exports `llmProvider` instance
- Uses `VITE_LLM_PROVIDER` to select between providers
- Allows runtime provider switching via environment variable

### 2. Modified Files

#### `src/components/services/gemini.ts` - Service Layer
- Removed Gemini API implementation details
- Now imports `llmProvider` from `src/lib/ai`
- Exports `askLLM()` as new primary function
- Keeps `askGemini()` as deprecated alias for backward compatibility
- Maintains `speakText()` and voice selection logic unchanged

### 3. Updated Configuration

#### `.env.example` - Environment Variables
- Added `VITE_LLM_PROVIDER` to select provider (gemini/ollama)
- Organized existing Gemini config
- Added new Ollama config options:
  - `VITE_OLLAMA_ENDPOINT` (default: http://localhost:11434)
  - `VITE_OLLAMA_MODEL` (default: gemma3:4b)
  - `VITE_OLLAMA_MAX_TOKENS` (default: 200)

## Architecture

```
User Input (Voice)
    ↓
[Speech-to-Text]
    ↓
Transcript
    ↓
[Instruction Processor]
    ├─ Intent Detection
    ├─ Database Queries
    ├─ Context Building
    ↓
Processed Instruction + Context
    ↓
[Service Layer: gemini.ts]
    ├─ askLLM() - New primary function
    ├─ askGemini() - Deprecated alias
    ├─ speakText() - Unchanged
    ↓
[LLM Provider Interface]
    ↓
[Provider Implementation]
    ├─ GeminiProvider (Cloud API)
    └─ OllamaProvider (Local Inference)
    ↓
Text Response
    ↓
[Text-to-Speech]
    ↓
Audio Output (Voice)
```

## Design Decisions

### 1. Provider Abstraction

**Why:** Decouples provider implementation from business logic

**Benefits:**
- Swap providers without changing application code
- Easy to add new providers (e.g., LLaMA, Mistral, Claude)
- Testable in isolation
- Clear separation of concerns

### 2. Factory Pattern

**Why:** Select provider at runtime based on environment

**Benefits:**
- No recompilation needed to switch providers
- Matches Vite's configuration approach
- Environment-driven behavior

### 3. Token Usage Tracking

**Why:** Monitor LLM efficiency and costs

**Benefits:**
- Gemini tracks API costs
- Ollama tracks inference metrics
- Helps optimize prompts

### 4. Backward Compatibility

**Why:** Prevent breaking existing code

**Benefits:**
- `askGemini()` still works (deprecated)
- Existing components don't need updates
- Gradual migration path

## Provider Specifics

### Gemini Provider

```typescript
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

generateText(prompt, systemPrompt) {
  // 1. Validate API key
  // 2. POST to Gemini endpoint
  // 3. Parse response structure
  // 4. Extract text from candidates array
  // 5. Remove markdown artifacts
  // 6. Return with token usage
}
```

**Request Format:**
```json
{
  "systemInstruction": { "role": "system", "parts": [{"text": "..."}] },
  "contents": [{ "parts": [{"text": "..."}] }],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 800
  }
}
```

**Response Format:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "response..."}]
    }
  }],
  "usage": {
    "prompt_token_count": 156,
    "candidates_token_count": 23
  }
}
```

### Ollama Provider

```typescript
const OLLAMA_ENDPOINT = 'http://localhost:11434';
const OLLAMA_MODEL = 'gemma3:4b';

generateText(userPrompt, systemPrompt) {
  // 1. Validate Ollama connection
  // 2. Build conversation format
  // 3. POST to /api/generate endpoint
  // 4. Extract response text
  // 5. Remove markdown artifacts
  // 6. Return with token usage from metrics
}
```

**Request Format:**
```json
{
  "model": "gemma3:4b",
  "prompt": "User: ...\n\nAssistant:",
  "stream": false,
  "options": {
    "temperature": 0.3,
    "top_k": 40,
    "top_p": 0.9,
    "num_predict": 200
  }
}
```

**Response Format:**
```json
{
  "model": "gemma3:4b",
  "response": "response...",
  "done": true,
  "prompt_eval_count": 234,
  "eval_count": 18,
  "total_duration": 1234567890
}
```

## Configuration Flow

```
.env.local
    ↓
Vite Environment Variables (import.meta.env)
    ↓
lib/ai/index.ts
    ├─ Reads VITE_LLM_PROVIDER
    ├─ Selects GeminiProvider or OllamaProvider
    ↓
gemini.ts Service
    ├─ Imports llmProvider
    ├─ Calls generateText()
    ↓
Application
```

## Testing

### Unit Testing Providers

Each provider can be tested independently:

```typescript
// Test Gemini Provider
const provider = new GeminiProvider();
await provider.validateConfig();
const result = await provider.generateText(prompt, systemPrompt);
assert(result.text.length > 0);
assert(result.usage?.inputTokens >= 0);

// Test Ollama Provider
const provider = new OllamaProvider();
await provider.validateConfig();
const result = await provider.generateText(prompt, systemPrompt);
assert(result.text.length > 0);
assert(result.usage?.outputTokens >= 0);
```

### Integration Testing

Test the full flow:

```typescript
// useControls.tsx uses askGemini/askLLM
const response = await askLLM(prompt);
speakText(response);
```

## Performance Optimizations

### Gemini
- `temperature: 0.3` - Lower temperature for consistent responses
- `maxOutputTokens: 800` - Balanced for detailed but concise answers
- API key validation at startup to fail fast

### Ollama
- `temperature: 0.3` - Consistent voice responses
- `top_k: 40` - Reasonable token diversity
- `top_p: 0.9` - Nucleus sampling for quality
- `num_predict: 200` - Short responses suitable for voice (tuned to 200 tokens max for Gemma 3 4B)
- Connection validation to detect missing Ollama early

## Error Handling

### Provider Validation

Both providers implement `validateConfig()`:

**Gemini:**
- Checks API key presence
- Throws early if missing

**Ollama:**
- Checks endpoint connectivity
- Validates model exists
- Lists available models in error message

### Request Failures

```typescript
try {
  const result = await llmProvider.generateText(prompt);
} catch (error) {
  if (error.message.includes("fetch failed")) {
    // Ollama not running
  } else if (error.message.includes("401")) {
    // Invalid API key
  } else {
    // Other error
  }
}
```

## Future Extensibility

### Adding a New Provider

1. Create `src/lib/ai/new-provider.ts`:
```typescript
import type { LLMProvider, LLMResponse } from './providers'

class NewProvider implements LLMProvider {
  getName(): string { return "New Provider" }
  async validateConfig(): Promise<void> { /* ... */ }
  async generateText(prompt, systemPrompt): Promise<LLMResponse> { /* ... */ }
}

export default new NewProvider();
```

2. Update `src/lib/ai/index.ts`:
```typescript
import newProvider from './new-provider'

const getProvider = (): LLMProvider => {
  const provider = (import.meta.env.VITE_LLM_PROVIDER ?? 'gemini').toLowerCase();
  switch (provider) {
    case 'new-provider':
      return newProvider;
    // ... existing cases
  }
};
```

3. Update `.env.example` with new config variables

## Migration Checklist

- [x] Create provider interface
- [x] Implement Gemini provider
- [x] Implement Ollama provider
- [x] Refactor service layer
- [x] Update environment configuration
- [x] Add setup documentation
- [x] Add testing guide
- [x] Backward compatibility
- [x] Type safety
- [x] Error handling

## References

- **Gemini API**: https://ai.google.dev/
- **Ollama**: https://ollama.ai/
- **Gemma 3**: https://huggingface.co/google/gemma
- **TypeScript Interfaces**: https://www.typescriptlang.org/docs/handbook/2/objects.html

## Related Documents

- [README.md](./README.md) - Project overview
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Setup instructions
- [TEST_GUIDE.md](./TEST_GUIDE.md) - Testing procedures
