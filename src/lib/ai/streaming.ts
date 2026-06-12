import { llmProvider } from './index';

/**
 * Streaming callback types
 */
export type StreamCallback = (token: string) => void;
export type StreamErrorCallback = (error: Error) => void;
export type StreamCompleteCallback = () => void;

/**
 * Options for streaming text generation
 */
export interface StreamingOptions {
  onToken?: StreamCallback;
  onError?: StreamErrorCallback;
  onComplete?: StreamCompleteCallback;
  bufferSize?: number; // Buffer tokens before calling onToken for UI efficiency
}

/**
 * Generate text with streaming support
 * 
 * @param prompt - User prompt to send to LLM
 * @param systemPrompt - System prompt for LLM
 * @param options - Streaming options with callbacks
 * @returns The complete generated text
 * 
 * @example
 * const fullText = await askLLMStream(
 *   "What is machine learning?",
 *   systemPrompt,
 *   {
 *     onToken: (token) => updateUI(token),
 *     onError: (error) => showError(error.message),
 *     onComplete: () => console.log('Done!'),
 *     bufferSize: 4 // Batch 4 tokens before updating UI
 *   }
 * )
 */
export async function askLLMStream(
  prompt: string,
  systemPrompt: string | undefined,
  options: StreamingOptions = {}
): Promise<string> {
  const {
    onToken,
    onError,
    onComplete,
    bufferSize = 1,
  } = options;

  let tokenBuffer = '';

  const flushBuffer = () => {
    if (tokenBuffer && onToken) {
      onToken(tokenBuffer);
      tokenBuffer = '';
    }
  };

  const bufferedOnToken = (token: string) => {
    if (bufferSize <= 1) {
      onToken?.(token);
    } else {
      tokenBuffer += token;
      if (tokenBuffer.length >= bufferSize) {
        flushBuffer();
      }
    }
  };

  try {
    // Check if provider supports streaming
    if (llmProvider.generateTextStream) {
      return await llmProvider.generateTextStream(prompt, systemPrompt, {
        onToken: bufferedOnToken,
        onError,
        onComplete: () => {
          flushBuffer();
          onComplete?.();
        },
      });
    } else {
      // Fallback to non-streaming if provider doesn't support it
      console.warn(
        `${llmProvider.getName()} does not support streaming. Falling back to standard generation.`
      );
      const result = await llmProvider.generateText(prompt, systemPrompt);
      
      // Simulate streaming by emitting the text as one chunk
      onToken?.(result.text);
      onComplete?.();
      
      return result.text;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * Create a streaming session with state management
 * 
 * Useful for components that need to track streaming state
 * 
 * @example
 * const session = createStreamingSession();
 * 
 * await session.start(prompt, systemPrompt, {
 *   onToken: (token) => console.log(token)
 * });
 * 
 * if (session.isStreaming) {
 *   session.cancel();
 * }
 */
export class StreamingSession {
  private controller: AbortController | null = null;
  private isActive = false;

  get isStreaming(): boolean {
    return this.isActive;
  }

  async start(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions = {}
  ): Promise<string> {
    if (this.isActive) {
      throw new Error('Streaming session is already active. Call cancel() first.');
    }

    this.isActive = true;
    this.controller = new AbortController();

    try {
      const result = await askLLMStream(prompt, systemPrompt, {
        ...options,
        onError: (error) => {
          this.isActive = false;
          options.onError?.(error);
        },
        onComplete: () => {
          this.isActive = false;
          options.onComplete?.();
        },
      });

      this.isActive = false;
      return result;
    } catch (error) {
      this.isActive = false;
      throw error;
    }
  }

  cancel(): void {
    if (this.controller) {
      this.controller.abort();
    }
    this.isActive = false;
  }
}

/**
 * Create a new streaming session
 */
export function createStreamingSession(): StreamingSession {
  return new StreamingSession();
}
