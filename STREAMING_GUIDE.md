# Real-time Token Streaming Implementation Guide

This guide explains the real-time token streaming architecture implemented in Nova, the voice assistant for Colegio San Carlos.

## Overview

Real-time token streaming enables progressive display of LLM responses as tokens arrive, rather than waiting for the complete response. This provides:

- **Better UX**: Users see responses appearing in real-time
- **Perceived Performance**: Response feels faster even if total time is the same
- **Streaming TTS Foundation**: Ready for connecting streaming tokens directly to text-to-speech
- **Cancellation Support**: Users can stop generation mid-stream
- **Backward Compatibility**: Existing code continues to work unchanged

## Architecture

```
┌─────────────────────────────────────────────────┐
│           React Component                        │
│  (useStreaming hook - manages UI state)          │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│     Streaming Service Layer                      │
│  (askLLMStream in gemini.ts)                     │
│  - Handles system prompt                         │
│  - Logging & error wrapping                      │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│     Streaming Utilities                          │
│  (streaming.ts)                                  │
│  - Token buffering for UI efficiency             │
│  - Fallback to non-streaming if unsupported      │
│  - StreamingSession for cancellation             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│      LLM Provider Interface                      │
│  (providers.ts)                                  │
│  - generateTextStream() method                   │
│  - Streaming callbacks: onToken, onError, etc.   │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│   Ollama Provider (or Gemini)                    │
│  (ollama-provider.ts or gemini-provider.ts)      │
│  - Fetch streaming from Ollama /api/generate     │
│  - Parse NDJSON response                         │
│  - Call onToken for each token                   │
└─────────────────────────────────────────────────┘
```

## Key Components

### 1. LLM Provider Interface (`src/lib/ai/providers.ts`)

Extended with streaming support:

```typescript
export interface LLMProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
  
  // New streaming method
  generateTextStream?(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string>;
}

export type StreamingOptions = {
  onToken?: (token: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};
```

### 2. Ollama Provider (`src/lib/ai/ollama-provider.ts`)

Implements streaming API:

```typescript
// Uses Ollama's streaming endpoint
async generateTextStream(
  userPrompt: string,
  systemPrompt: string | undefined,
  options: StreamingOptions
): Promise<string>
```

Features:
- Fetches with `stream: true`
- Parses NDJSON response line-by-line
- Calls `onToken()` for each token
- Handles errors gracefully
- Automatically postprocesses final text

### 3. Streaming Service (`src/lib/ai/streaming.ts`)

Core utilities for streaming:

```typescript
// Main function with token buffering
export async function askLLMStream(
  prompt: string,
  systemPrompt: string | undefined,
  options: StreamingOptions = {}
): Promise<string>

// Reusable session for managing streaming state
export class StreamingSession {
  async start(prompt, systemPrompt, options): Promise<string>
  cancel(): void
  get isStreaming(): boolean
}
```

### 4. React Hook (`src/components/hooks/useStreaming.ts`)

Manages streaming state in components:

```typescript
export function useStreaming(options?: UseStreamingOptions) {
  return {
    isStreaming: boolean,      // Is streaming active
    streamedText: string,       // Accumulated text so far
    stream: async (prompt, options?) => Promise<string>,
    cancel: () => void,         // Stop streaming
    reset: () => void,          // Clear state
    getText: () => string,      // Get current text
  }
}
```

### 5. Service Layer (`src/components/services/gemini.ts`)

Provides user-friendly API with system prompt:

```typescript
// Original non-streaming (still works)
export const askLLM = async (prompt: string): Promise<string>

// New streaming version
export const askLLMStream = async (
  prompt: string,
  options: StreamingOptions = {}
): Promise<string>
```

## Usage Examples

### Basic Usage

```typescript
import { useStreaming } from '@/components/hooks/useStreaming';

function MyComponent() {
  const { isStreaming, streamedText, stream, cancel } = useStreaming();

  const handleAsk = async () => {
    await stream('Tell me about machine learning');
  };

  return (
    <div>
      <button onClick={handleAsk} disabled={isStreaming}>
        Ask Nova
      </button>
      
      {isStreaming && <button onClick={cancel}>Cancel</button>}
      
      <p>{streamedText}</p>
    </div>
  );
}
```

### With Error Handling

```typescript
const { isStreaming, streamedText, stream } = useStreaming();
const [error, setError] = useState<string | null>(null);

const handleAsk = async () => {
  setError(null);
  try {
    await stream('Your question', {
      onError: (error) => {
        setError(error.message);
      },
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  }
};
```

### With Auto-Speak

```typescript
const { isStreaming, streamedText, stream } = useStreaming({
  autoSpeak: true, // Automatically speak when complete
  bufferSize: 4,   // Buffer 4 tokens before updating UI
});

await stream('Explain photosynthesis', {
  onComplete: () => console.log('Response spoken!')
});
```

### Direct Service Usage

```typescript
import { askLLMStream } from '@/components/services/gemini';

const result = await askLLMStream('Your prompt', {
  onToken: (token) => {
    console.log('Token:', token);
    updateUI(token);
  },
  onError: (error) => {
    console.error('Error:', error.message);
  },
  onComplete: () => {
    console.log('Done!');
  },
  bufferSize: 3, // Buffer tokens for efficiency
});

console.log('Full response:', result);
```

## Backward Compatibility

**Existing code continues to work unchanged:**

```typescript
// This still works (non-streaming)
const response = await askLLM("Your question");
speakText(response);
```

New streaming code is **opt-in**. You can gradually migrate components:

```typescript
// OLD (still supported)
const response = await askLLM(prompt);

// NEW (streaming)
const response = await askLLMStream(prompt, { 
  onToken: (token) => updateUI(token)
});
```

## Performance Optimization

### Token Buffering

The `bufferSize` option prevents excessive UI updates:

```typescript
// Without buffering (every token updates UI)
useStreaming({ bufferSize: 1 })

// With buffering (every 4 tokens)
useStreaming({ bufferSize: 4 })  // Recommended

// With larger buffer
useStreaming({ bufferSize: 10 })  // For high-frequency updates
```

Recommended values:
- **1**: Real-time responsiveness (more re-renders)
- **4**: Balanced (good UX, reasonable performance)
- **8+**: Smooth display (fewer re-renders, slight delay)

### Streaming vs Non-Streaming

**When to use streaming:**
- UI that displays response in real-time
- Chat interfaces
- Response preview components
- TTS integration (future)

**When to use non-streaming:**
- Background processing
- Simple request-response where UI waits for completion
- Simpler error handling needed

## Error Handling

All error paths are covered:

```typescript
// Provider validation error
if (ollamaNotRunning) {
  onError?.(new Error("Could not connect to Ollama..."))
}

// Network error
if (fetchFailed) {
  onError?.(new Error("Network error..."))
}

// Parsing error
if (invalidJSON) {
  // Logged and skipped, streaming continues
  console.warn('Failed to parse Ollama stream line')
}

// User cancellation
session.cancel()
```

## Future Extensions

The architecture is designed for easy extension:

### 1. Streaming TTS Integration

```typescript
// Connect tokens directly to TTS
const speechQueue = [];

await askLLMStream(prompt, {
  onToken: (token) => {
    speechQueue.push(token);
    startSpeakingIfReady(speechQueue);
  }
});
```

### 2. Request Cancellation

```typescript
const session = createStreamingSession();

// In useEffect
useEffect(() => {
  return () => {
    session.cancel(); // Cleanup
  };
}, []);

// User interrupts
if (userSpeaksAgain) {
  session.cancel();
}
```

### 3. Streaming Context

```typescript
// Track streaming state across app
const streamingContext = useContext(StreamingContext);

if (streamingContext.isStreaming) {
  // Disable other input
  disableAllControls();
}
```

### 4. Multiple Provider Support

Both Ollama and Gemini can implement streaming:

```typescript
// Gemini provider (when API supports it)
class GeminiProvider implements LLMProvider {
  async generateTextStream(prompt, systemPrompt, options) {
    // Implement Gemini streaming when available
  }
}
```

## Debugging

Enable debug logging:

```typescript
// In console or logs
// Ollama provider logs:
console.info('Streaming from Ollama (prompt preview):', {...})

// Streaming utilities log:
console.info(`${llmProvider.getName()} streaming...`)

// Service layer logs:
console.info(`${llmProvider.getName()} streaming complete:`, {...})

// Hook usage
const { stream } = useStreaming();
// Component logs all state changes automatically
```

## File Structure

```
src/
  lib/ai/
    providers.ts                 # Interface definitions
    ollama-provider.ts          # Ollama with streaming
    gemini-provider.ts          # Gemini (can add streaming later)
    streaming.ts                # Core streaming utilities
    index.ts                    # Export helpers
  components/
    hooks/
      useStreaming.ts           # React hook for streaming
    services/
      gemini.ts                 # askLLMStream service
    examples/
      StreamingExamples.tsx     # Example implementations
```

## Common Patterns

### Pattern 1: Simple Prompt & Speak

```typescript
const { stream } = useStreaming({ autoSpeak: true });
await stream("Your prompt");
```

### Pattern 2: Chat Interface

```typescript
const { isStreaming, streamedText, stream } = useStreaming();
const [messages, setMessages] = useState([]);

const handleSubmit = async (input) => {
  await stream(input, {
    onComplete: () => {
      setMessages([...messages, { role: 'assistant', text: streamedText }]);
    }
  });
};
```

### Pattern 3: Response Preview

```typescript
const { streamedText, stream } = useStreaming({ bufferSize: 10 });

return (
  <div>
    <button onClick={() => stream(prompt)}>Preview Response</button>
    <PreviewPane text={streamedText} />
  </div>
);
```

## Testing

```typescript
// Mock the streaming provider
const mockProvider: LLMProvider = {
  generateTextStream: async (prompt, system, options) => {
    const tokens = ["Hello", " ", "World"];
    for (const token of tokens) {
      options.onToken?.(token);
      await new Promise(r => setTimeout(r, 100));
    }
    options.onComplete?.();
    return tokens.join('');
  }
};
```

## Troubleshooting

### "Provider does not support streaming"
- Using Gemini (only Ollama has streaming so far)
- Falls back to non-streaming automatically
- No errors, but no streaming benefits

### Response doesn't stream
- Check Ollama is running: `ollama serve`
- Verify `VITE_LLM_PROVIDER=ollama` in `.env.local`
- Check console logs for streaming errors

### UI doesn't update with tokens
- Increase `bufferSize` if too high
- Check `onToken` callback is being called
- Verify component re-renders on state change

### Streaming seems slow
- Reduce `bufferSize` for more frequent updates
- Check Ollama performance (GPU available?)
- Monitor network latency

## References

- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [NDJSON Format](http://ndjson.org/)
