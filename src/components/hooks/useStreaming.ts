import { useState, useCallback, useRef } from 'react';
import { askLLMStream, type StreamingSession, type StreamingOptions } from '../services/gemini';

/**
 * Options for the useStreaming hook
 */
export interface UseStreamingOptions {
  onError?: (error: Error) => void;
  bufferSize?: number;
  autoSpeak?: boolean;
}

/**
 * Hook for managing LLM streaming state
 * 
 * Handles:
 * - Tracking streaming state (isStreaming)
 * - Accumulating streamed text
 * - Error management
 * - Session cancellation
 * - Optional auto-speak on completion
 * 
 * @example
 * const { isStreaming, streamedText, stream, cancel } = useStreaming();
 * 
 * const handleStreamResponse = async () => {
 *   await stream("Tell me about machine learning", {
 *     onError: (error) => console.error(error.message)
 *   });
 * };
 * 
 * return (
 *   <div>
 *     {isStreaming && <span>Loading...</span>}
 *     <p>{streamedText}</p>
 *     <button onClick={handleStreamResponse} disabled={isStreaming}>
 *       Ask Nova
 *     </button>
 *     {isStreaming && (
 *       <button onClick={cancel}>Cancel</button>
 *     )}
 *   </div>
 * );
 */
export function useStreaming(options: UseStreamingOptions = {}) {
  const { onError, bufferSize = 4, autoSpeak = false } = options;
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const sessionRef = useRef<StreamingSession | null>(null);
  const accumulatedTextRef = useRef('');

  /**
   * Clear streaming state for new request
   */
  const clearState = useCallback(() => {
    setStreamedText('');
    accumulatedTextRef.current = '';
  }, []);

  /**
   * Start a streaming request
   * 
   * @param prompt - The user prompt
   * @param streamOptions - Additional streaming options
   */
  const stream = useCallback(
    async (prompt: string, streamOptions: StreamingOptions = {}) => {
      if (isStreaming) {
        console.warn('Streaming already in progress. Call cancel() first.');
        return;
      }

      clearState();
      setIsStreaming(true);

      try {
        const result = await askLLMStream(prompt, {
          ...streamOptions,
          bufferSize,
          onToken: (token: string) => {
            accumulatedTextRef.current += token;
            setStreamedText(accumulatedTextRef.current);
            streamOptions.onToken?.(token);
          },
          onError: (error: Error) => {
            setIsStreaming(false);
            onError?.(error);
            streamOptions.onError?.(error);
          },
          onComplete: () => {
            setIsStreaming(false);
            if (autoSpeak) {
              // Import here to avoid circular dependencies
              import('../services/gemini').then(({ speakText }) => {
                speakText(accumulatedTextRef.current);
              });
            }
            streamOptions.onComplete?.();
          },
        });

        return result;
      } catch (error) {
        setIsStreaming(false);
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      }
    },
    [isStreaming, bufferSize, autoSpeak, clearState, onError]
  );

  /**
   * Cancel ongoing streaming
   */
  const cancel = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.cancel();
      sessionRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /**
   * Get current accumulated text
   */
  const getText = useCallback(() => {
    return accumulatedTextRef.current;
  }, []);

  /**
   * Reset streaming state
   */
  const reset = useCallback(() => {
    cancel();
    clearState();
  }, [cancel, clearState]);

  return {
    isStreaming,
    streamedText,
    stream,
    cancel,
    reset,
    getText,
  };
}

/**
 * Simple hook for tracking if any streaming is happening
 * Useful for disabling UI while streaming
 * 
 * @example
 * const isAnythingStreaming = useIsStreaming();
 * 
 * return <button disabled={isAnythingStreaming}>Submit</button>;
 */
export function useIsStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);

  const markStreaming = useCallback((value: boolean) => {
    setIsStreaming(value);
  }, []);

  return { isStreaming, markStreaming };
}

/**
 * Hook for streaming with automatic error display
 * Shows errors to user without throwing
 * 
 * @example
 * const { stream, error, clearError } = useStreamingWithErrorDisplay();
 * 
 * return (
 *   <>
 *     {error && <ErrorDialog onClose={clearError}>{error}</ErrorDialog>}
 *     <button onClick={() => stream("prompt")}>Ask</button>
 *   </>
 * );
 */
export function useStreamingWithErrorDisplay() {
  const { stream: baseStream, ...streamingState } = useStreaming();
  const [error, setError] = useState<string | null>(null);

  const stream = useCallback(
    async (prompt: string, options: StreamingOptions = {}) => {
      setError(null);
      try {
        return await baseStream(prompt, {
          ...options,
          onError: (err) => {
            setError(err.message);
            options.onError?.(err);
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    },
    [baseStream]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    ...streamingState,
    stream,
    error,
    clearError,
  };
}
