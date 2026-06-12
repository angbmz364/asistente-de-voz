# Nova Streaming API Quick Reference

## React Hook: useStreaming

The main hook for managing streaming state in React components.

### Basic Usage

```typescript
import { useStreaming } from '@/components/hooks/useStreaming'

const { 
  isStreaming,    // boolean
  streamedText,   // string
  stream,         // (prompt, options?) => Promise<string>
  cancel,         // () => void
  reset,          // () => void
  getText,        // () => string
} = useStreaming({
  onError?: (error: Error) => void,      // Error callback
  bufferSize?: number,                   // Default: 1, Recommended: 4
  autoSpeak?: boolean,                   // Auto-speak on complete
})
```

### Examples

```typescript
// Simple streaming
await stream('Your prompt')

// With callbacks
await stream('Your prompt', {
  onToken: (token) => console.log(token),
  onError: (error) => console.error(error),
  onComplete: () => console.log('Done'),
})

// With buffering
const { stream } = useStreaming({ bufferSize: 4 })
await stream('Your prompt')  // Updates UI every 4 tokens

// With auto-speak
const { stream } = useStreaming({ autoSpeak: true })
await stream('Your prompt')  // Speaks when done
```

---

## Service: askLLMStream

Direct service function with system prompt integration.

```typescript
import { askLLMStream } from '@/components/services/gemini'

const result = await askLLMStream(prompt, {
  onToken?: (token: string) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void,
  bufferSize?: number,
})
```

### Differences from useStreaming

| Feature | useStreaming | askLLMStream |
|---------|-------------|-------------|
| React Hook | ✅ | ❌ |
| State Management | ✅ | ❌ |
| System Prompt | Automatic | Automatic |
| Return Value | Promise<string> | Promise<string> |
| Error Callbacks | ✅ | ✅ |
| Buffering | ✅ | ✅ |

---

## Low Level: Core Streaming

For advanced use cases.

```typescript
import { 
  askLLMStream, 
  createStreamingSession, 
  type StreamingOptions 
} from '@/lib/ai/streaming'

// Function API
const result = await askLLMStream(prompt, systemPrompt, {
  onToken: (token) => {},
  onError: (error) => {},
  onComplete: () {},
  bufferSize: 4,
})

// Session API
const session = createStreamingSession()
await session.start(prompt, systemPrompt, {
  onToken: (token) => {},
})
if (session.isStreaming) {
  session.cancel()
}
```

---

## Provider Interface: LLMProvider

For implementing streaming in new providers.

```typescript
import type { LLMProvider, StreamingOptions } from '@/lib/ai/providers'

class MyProvider implements LLMProvider {
  async generateTextStream(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string> {
    // Implement streaming
    // Call options.onToken(token) for each token
    // Call options.onError(error) on error
    // Call options.onComplete() when done
    return fullText
  }
}
```

---

## Type Reference

### StreamingOptions

```typescript
interface StreamingOptions {
  onToken?: (token: string) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  bufferSize?: number
}
```

### UseStreamingConfig

```typescript
interface UseStreamingConfig {
  onError?: (error: Error) => void
  bufferSize?: number
  autoSpeak?: boolean
}
```

### UseStreamingState

```typescript
interface UseStreamingState {
  isStreaming: boolean
  streamedText: string
  stream(prompt: string, options?: StreamingOptions): Promise<string>
  cancel(): void
  getText(): string
  reset(): void
}
```

---

## Buffer Size Reference

Buffer size controls how many tokens to accumulate before updating UI.

```typescript
bufferSize: 1   // Update UI for every token
              // Pro: Real-time responsiveness
              // Con: More re-renders (performance impact)

bufferSize: 4   // RECOMMENDED
              // Pro: Good balance
              // Con: Slight delay vs real-time

bufferSize: 8   // Smooth display
              // Pro: Fewer re-renders
              // Con: Delay visible between batches

bufferSize: 10+ // For performance-critical apps
              // Pro: Minimal re-renders
              // Con: Noticeable display delay
```

**Recommended starting value: 4**

---

## Common Patterns

### Pattern 1: Simple Stream & Speak

```typescript
const { stream } = useStreaming({ autoSpeak: true })
await stream("Tell me about AI")
```

### Pattern 2: Chat Interface

```typescript
const { isStreaming, streamedText, stream } = useStreaming()

const handleSend = async (message) => {
  const result = await stream(message, {
    onComplete: () => {
      addMessageToChat('assistant', streamedText)
    }
  })
}
```

### Pattern 3: Response Preview

```typescript
const { streamedText, stream } = useStreaming({ bufferSize: 8 })

return (
  <>
    <button onClick={() => stream(prompt)}>Preview</button>
    <div>{streamedText}</div>
  </>
)
```

### Pattern 4: Error Display

```typescript
const [error, setError] = useState<string | null>(null)
const { stream } = useStreaming()

const handleAsk = async () => {
  setError(null)
  try {
    await stream(prompt, {
      onError: (err) => setError(err.message)
    })
  } catch (err) {
    setError(err?.message || 'Unknown error')
  }
}
```

### Pattern 5: Cancel Support

```typescript
const { isStreaming, stream, cancel } = useStreaming()

return (
  <>
    <button onClick={() => stream(prompt)}>Ask</button>
    {isStreaming && <button onClick={cancel}>Stop</button>}
  </>
)
```

---

## Configuration

### Environment Variables

```env
# .env.local
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=gemma3:4b
VITE_OLLAMA_MAX_TOKENS=200
```

### Default Values

```typescript
// Buffering
bufferSize: 1

// Auto-speak
autoSpeak: false

// Ollama
OLLAMA_ENDPOINT: http://localhost:11434
OLLAMA_MODEL: gemma3:4b
OLLAMA_MAX_TOKENS: 200
```

---

## Backward Compatibility

Existing non-streaming code continues to work:

```typescript
// This still works (non-streaming)
const response = await askLLM("Your question")
speakText(response)

// New streaming version (optional)
const response = await askLLMStream("Your question", {
  onToken: (token) => console.log(token)
})
```

---

## Error Handling

All errors are caught and passed to `onError` callback:

```typescript
// Connection error
// → onError(Error: "Could not connect to Ollama...")

// Validation error
// → onError(Error: "Model not found...")

// Parsing error
// → Logged but streaming continues

// User cancellation
// → Stream stops, onError not called
```

---

## Performance Tips

1. **Adjust bufferSize**: Start with 4, increase if too many updates
2. **Check GPU**: Ollama with GPU is 10-50x faster
3. **Monitor network**: Check DevTools Network tab for latency
4. **Profile components**: Use React DevTools Profiler
5. **Cache responses**: Store responses if asking same question

```typescript
// Example: Cache responses
const cache = new Map<string, string>()

const getCachedOrStream = async (prompt) => {
  if (cache.has(prompt)) {
    return cache.get(prompt)!
  }
  const result = await stream(prompt)
  cache.set(prompt, result)
  return result
}
```

---

## Debugging

Enable logging:

```javascript
// In browser console
window.debug = true

// Or add to code
import { askLLMStream } from '@/lib/ai/streaming'

await askLLMStream(prompt, {
  onToken: (token) => console.log('Token:', token),
  onError: (error) => console.error('Error:', error),
  onComplete: () => console.log('Done'),
})
```

Check these:
- ✅ Ollama running: `ollama serve`
- ✅ Model available: `ollama list`
- ✅ Environment variables set: `VITE_LLM_PROVIDER=ollama`
- ✅ No TypeScript errors: `npm run build`
- ✅ Network working: Check DevTools Network tab

---

## Testing

Mock for tests:

```typescript
const mockStream = async (prompt, options) => {
  const tokens = prompt.split(' ')
  for (const token of tokens) {
    options.onToken?.(token + ' ')
    await new Promise(r => setTimeout(r, 100))
  }
  options.onComplete?.()
  return tokens.join(' ')
}
```

---

## File Reference

| Import Path | Export | Purpose |
|------------|--------|---------|
| `@/lib/ai/streaming` | `askLLMStream` | Core function |
| `@/lib/ai/streaming` | `createStreamingSession` | Session management |
| `@/components/services/gemini` | `askLLMStream` | Service with prompt |
| `@/components/hooks/useStreaming` | `useStreaming` | React hook |
| `@/lib/ai/providers` | `StreamingOptions` | Type definitions |

---

## Next Steps

1. **Review examples**: Check `StreamingExamples.tsx`
2. **Try hook**: Use `useStreaming` in a component
3. **Integrate**: Add streaming to your voice assistant
4. **Optimize**: Tune `bufferSize` for your use case
5. **Extend**: Add TTS or cancellation support

---

## Support Resources

- **Detailed Guide**: `STREAMING_GUIDE.md`
- **Getting Started**: `GETTING_STARTED_STREAMING.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Examples**: `src/components/examples/StreamingExamples.tsx`
- **Types**: `src/lib/ai/types.ts`
- **Integration Guide**: `src/components/hooks/useControlsStreaming.tsx`

---

## Quick Copy-Paste

```typescript
// Minimal example
import { useStreaming } from '@/components/hooks/useStreaming'

export function MyComponent() {
  const { isStreaming, streamedText, stream } = useStreaming()
  return (
    <>
      <button onClick={() => stream('Ask me anything')}>Ask</button>
      <p>{streamedText}</p>
    </>
  )
}
```

---

*Last updated: 2024*
*Compatible with Nova voice assistant v1.0+*
