# Getting Started with Streaming in Nova

This guide shows you exactly how to start using real-time token streaming in your Nova voice assistant.

## Prerequisites

- Ollama running with Gemma 3 4B model
- `.env.local` configured with `VITE_LLM_PROVIDER=ollama`
- All streaming files created (see IMPLEMENTATION_SUMMARY.md)

## Step 1: Verify Setup

First, make sure streaming is available:

```bash
# Check Ollama is running
ollama serve

# In another terminal, verify the model is available
ollama list | grep gemma

# Check .env.local
cat .env.local | grep LLM_PROVIDER
```

Expected output:
```
VITE_LLM_PROVIDER=ollama
```

## Step 2: Test with Browser Console

Open DevTools Console and test:

```javascript
// Import the streaming function
import { askLLMStream } from './src/components/services/gemini.ts'

// Simple test
await askLLMStream('Tell me a short joke', {
  onToken: (token) => console.log('Token:', token),
  onComplete: () => console.log('Done!')
})
```

You should see tokens appearing in console as they arrive.

## Step 3: Create a Simple Component

Create a test component to verify UI updates:

```typescript
// src/components/ui/StreamingTest.tsx
import { useStreaming } from '../hooks/useStreaming'

export function StreamingTest() {
  const { isStreaming, streamedText, stream, cancel } = useStreaming()

  return (
    <div style={{ padding: '20px', border: '1px solid blue' }}>
      <h3>Streaming Test</h3>
      
      <button 
        onClick={() => stream('What is the capital of Peru?')}
        disabled={isStreaming}
      >
        {isStreaming ? 'Streaming...' : 'Ask Nova'}
      </button>

      {isStreaming && (
        <button onClick={cancel} style={{ marginLeft: '10px' }}>
          Cancel
        </button>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f0f0',
        minHeight: '50px'
      }}>
        {streamedText || <em>Response will appear here...</em>}
        {isStreaming && <span>▌</span>}
      </div>
    </div>
  )
}
```

Add it to your app temporarily:

```typescript
// src/components/ui/Main.tsx
import StreamingTest from './StreamingTest'

export default function Main() {
  return (
    <>
      <StreamingTest />
      {/* ... rest of your components ... */}
    </>
  )
}
```

Test in browser - you should see tokens appearing as they arrive!

## Step 4: Integrate with Voice Assistant

Modify `useControls` to use streaming:

```typescript
// src/components/hooks/useControls.tsx
import { useCallback, useEffect, useState } from 'react'
import { speakText } from '../services/gemini'  // Keep for speaking
import { askLLMStream } from '../services/gemini'  // Add streaming import
import { processUserInstruction } from '../services/instructionProcessor'
import {
  getListeningState,
  startListening,
  stopListening,
  subscribeListening,
} from '../services/listen.ts'
import { useStreaming } from './useStreaming'  // Add hook import

const useControls = () => {
  const [isListening, setIsListening] = useState(getListeningState())
  const { isStreaming, streamedText, stream, cancel } = useStreaming({
    bufferSize: 2,  // Update UI every 2 tokens
  })

  useEffect(() => {
    const unsubscribe = subscribeListening(setIsListening)
    return unsubscribe
  }, [])

  const handleCancel = useCallback(() => {
    stopListening()
    if (isStreaming) {
      cancel()
    }
  }, [isStreaming, cancel])

  const handleMicClick = useCallback(() => {
    if (getListeningState()) {
      stopListening()
      return
    }

    startListening(async (transcript) => {
      if (!transcript) {
        console.warn('No speech detected.')
        return
      }

      try {
        const processed = await processUserInstruction(transcript)
        const prompt = processed.prompt
        
        // Use streaming!
        const response = await stream(prompt, {
          onError: (error) => {
            console.error('Streaming error:', error)
            speakText(`Error: ${error.message}`)
          },
          onComplete: () => {
            // Speak the complete response
            speakText(streamedText)
          }
        })
        
        console.log('Response complete:', response)
      } catch (error) {
        console.error('Request failed:', error)
        speakText('An error occurred. Please try again.')
      }
    })
  }, [stream, streamedText, cancel])

  return { handleMicClick, handleCancel, isListening }
}

export default useControls
```

Now test with the mic button - responses should appear as they arrive!

## Step 5: Display Streaming Text (Optional)

If you want to display streamed text while it arrives, add a display component:

```typescript
// src/components/ui/StreamingDisplay.tsx
import { useStreaming } from '../hooks/useStreaming'

interface StreamingDisplayProps {
  visible: boolean
}

export function StreamingDisplay({ visible }: StreamingDisplayProps) {
  // Get streaming state from context or props
  // This is a placeholder - adapt to your architecture
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  if (!visible || (!isStreaming && !streamedText)) {
    return null
  }

  return (
    <div className="streaming-display">
      <p>{streamedText}</p>
      {isStreaming && <span className="cursor">▌</span>}
    </div>
  )
}
```

## Step 6: Optimize for Your UI

Adjust `bufferSize` based on your needs:

```typescript
// Fast response, more re-renders
const { stream } = useStreaming({ bufferSize: 1 })

// Balanced (recommended)
const { stream } = useStreaming({ bufferSize: 4 })

// Smooth display, fewer re-renders
const { stream } = useStreaming({ bufferSize: 8 })
```

Profile with React DevTools Profiler to find optimal value.

## Step 7: Add Error Handling

Improve error UI:

```typescript
const [error, setError] = useState<string | null>(null)

const handleAsk = async () => {
  setError(null)
  try {
    await stream(prompt, {
      onError: (err) => {
        setError(err.message)
        console.error('Stream failed:', err)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    setError(message)
  }
}

return (
  <>
    {error && (
      <div className="error-notification">
        <strong>Error:</strong> {error}
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    )}
    {/* rest of component */}
  </>
)
```

## Debugging Checklist

If streaming isn't working:

- [ ] Is Ollama running? Check: `ollama serve` in a terminal
- [ ] Is `VITE_LLM_PROVIDER=ollama` in `.env.local`?
- [ ] Does the model exist? Check: `ollama list`
- [ ] Check browser console for errors
- [ ] Check Ollama logs for errors
- [ ] Try a simple test in console first
- [ ] Verify network tab shows streaming response (chunked transfer)

## Performance Monitoring

Monitor streaming performance:

```typescript
const { stream } = useStreaming()

let tokenCount = 0
const startTime = Date.now()

await stream(prompt, {
  onToken: () => {
    tokenCount++
    if (tokenCount % 10 === 0) {
      const elapsed = Date.now() - startTime
      const tokensPerSecond = (tokenCount / elapsed) * 1000
      console.log(`Tokens/sec: ${tokensPerSecond.toFixed(1)}`)
    }
  }
})

const totalTime = Date.now() - startTime
console.log(`Total: ${tokenCount} tokens in ${totalTime}ms`)
```

## Testing Different Prompts

Test these to verify streaming works:

```javascript
// Fast response
await askLLMStream('What is 2+2?', {
  onToken: (t) => console.log(t)
})

// Medium response
await askLLMStream('Explain photosynthesis in 3 sentences', {
  onToken: (t) => console.log(t)
})

// Longer response
await askLLMStream('What are the steps to solve a quadratic equation?', {
  onToken: (t) => console.log(t)
})
```

## Rolling Back (If Needed)

If you need to go back to non-streaming:

```typescript
// Just use the original askLLM
import { askLLM, speakText } from '../services/gemini'

const response = await askLLM(prompt)
speakText(response)
```

No other changes needed - everything else stays the same!

## Next: Advanced Features

Once streaming works, try these:

### Auto-Speak
```typescript
const { stream } = useStreaming({ autoSpeak: true })
await stream(prompt)  // Speaks automatically when done
```

### Cancellation
```typescript
const { stream, cancel } = useStreaming()

const result = stream(prompt)

// Stop it
cancel()  // Cancels the stream
```

### Progress Tracking
```typescript
let charCount = 0
await stream(prompt, {
  onToken: (token) => {
    charCount += token.length
    updateProgressBar(charCount)
  }
})
```

## Troubleshooting

### Q: Tokens appear but UI doesn't update
A: React needs state change to re-render. Use the hook properly:
```typescript
const { streamedText } = useStreaming()  // Re-renders with state change
// Not:
let text = ''
onToken: (t) => text += t  // Won't re-render
```

### Q: Streaming is slow
A: Check:
- Ollama GPU usage: Run `nvidia-smi` to verify GPU is working
- Network latency: Check DevTools Network tab
- Try `bufferSize: 10` to reduce re-renders

### Q: Nothing appears in console.log
A: Ensure Ollama is actually running and responding:
```bash
# Test Ollama directly
curl http://localhost:11434/api/generate \
  -d '{
    "model": "gemma3:4b",
    "prompt": "Hello",
    "stream": true
  }'
```

If this doesn't work, Ollama isn't streaming properly.

### Q: Works in browser but not in voice assistant
A: Check:
- Is `startListening` calling the callback?
- Is error being thrown before streaming starts?
- Is the prompt being processed correctly?
- Add logging: `console.log('About to stream:', prompt)`

## Success Indicators

You've successfully set up streaming when:

✅ Tokens appear in browser console as they arrive
✅ UI updates progressively when using `useStreaming`
✅ `cancel()` stops the stream
✅ Errors are caught and displayed
✅ `autoSpeak` plays text when complete
✅ Works integrated with voice assistant

## Support

If you get stuck:

1. Check `STREAMING_GUIDE.md` for architecture details
2. Review `StreamingExamples.tsx` for working code
3. Look at `types.ts` for type definitions
4. Check console logs for error messages
5. Verify Ollama is running: `ollama serve`

Good luck! 🚀
