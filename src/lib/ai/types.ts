/**
 * Type definitions for Nova's streaming system
 * 
 * This file provides complete TypeScript types for:
 * - Streaming callbacks
 * - Streaming options
 * - Streaming session management
 * - Hook types
 */

/**
 * Callback invoked when a token arrives from the LLM
 * 
 * @param token - A single token or chunk of tokens from the LLM
 * 
 * @example
 * onToken: (token) => {
 *   console.log("Received:", token);
 *   updateDisplay(accumulatedText + token);
 * }
 */
export type StreamCallback = (token: string) => void;

/**
 * Callback invoked if an error occurs during streaming
 * 
 * @param error - The error that occurred
 * 
 * @example
 * onError: (error) => {
 *   console.error("Stream failed:", error.message);
 *   showErrorNotification(error);
 * }
 */
export type StreamErrorCallback = (error: Error) => void;

/**
 * Callback invoked when streaming completes successfully
 * 
 * @example
 * onComplete: () => {
 *   console.log("Stream finished");
 *   saveResponse(text);
 * }
 */
export type StreamCompleteCallback = () => void;

/**
 * Options for controlling streaming behavior
 */
export interface StreamingOptions {
  /**
   * Called when a new token arrives
   * Use to update UI with streamed text
   */
  onToken?: StreamCallback;

  /**
   * Called if streaming encounters an error
   * Called instead of throwing
   */
  onError?: StreamErrorCallback;

  /**
   * Called when streaming completes successfully
   * Perfect place to do post-processing
   */
  onComplete?: StreamCompleteCallback;

  /**
   * Number of tokens to buffer before calling onToken
   * Higher values = fewer UI updates = better performance
   * Lower values = more responsive UI
   * 
   * @default 1
   * 
   * @example
   * bufferSize: 4  // Update UI every 4 tokens
   */
  bufferSize?: number;
}

/**
 * Response from LLM with usage information
 */
export interface LLMResponse {
  /** The generated text response */
  text: string;

  /** Token usage statistics */
  usage?: {
    /** Number of input tokens processed */
    inputTokens: number;
    /** Number of output tokens generated */
    outputTokens: number;
  };
}

/**
 * Streaming-capable LLM provider
 */
export interface StreamingLLMProvider {
  /**
   * Generate text with token streaming
   * 
   * @param prompt - User's input prompt
   * @param systemPrompt - System instruction (e.g., "You are a helpful assistant")
   * @param options - Streaming options with callbacks
   * @returns The complete generated text
   * 
   * @throws If streaming fails
   * 
   * @example
   * await provider.generateTextStream(
   *   "What is AI?",
   *   systemPrompt,
   *   {
   *     onToken: (token) => display(token),
   *     onError: (err) => handleError(err),
   *     onComplete: () => finishStream()
   *   }
   * )
   */
  generateTextStream(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string>;
}

/**
 * State returned by useStreaming hook
 */
export interface UseStreamingState {
  /** Whether streaming is currently active */
  isStreaming: boolean;

  /** Text accumulated so far from the stream */
  streamedText: string;

  /**
   * Start a new stream with the given prompt
   * 
   * @throws If streaming is already active
   * 
   * @example
   * await stream("Your question", {
   *   onToken: (token) => updateUI(token)
   * });
   */
  stream(
    prompt: string,
    options?: StreamingOptions
  ): Promise<string>;

  /**
   * Stop the current stream
   * Safe to call even if not streaming
   */
  cancel(): void;

  /** Get the current accumulated text without re-rendering */
  getText(): string;

  /** Reset to initial state (clear text, stop streaming) */
  reset(): void;
}

/**
 * Configuration for useStreaming hook
 */
export interface UseStreamingConfig {
  /** Called if streaming encounters an error */
  onError?: (error: Error) => void;

  /** Token buffer size (see StreamingOptions.bufferSize) */
  bufferSize?: number;

  /** Automatically speak text when streaming completes */
  autoSpeak?: boolean;
}

/**
 * State for useIsStreaming hook
 */
export interface UseIsStreamingState {
  /** Whether any streaming is active */
  isStreaming: boolean;

  /** Set streaming state (called by other hooks) */
  markStreaming(value: boolean): void;
}

/**
 * State for useStreamingWithErrorDisplay hook
 */
export interface UseStreamingWithErrorState extends UseStreamingState {
  /** Error message if one occurred (null if no error) */
  error: string | null;

  /** Clear the error message */
  clearError(): void;
}

/**
 * Session for managing streaming operations
 * Allows fine-grained control over streaming lifecycle
 */
export interface IStreamingSession {
  /** Whether streaming is currently active */
  readonly isStreaming: boolean;

  /**
   * Start a streaming operation
   * 
   * @throws If already streaming
   */
  start(
    prompt: string,
    systemPrompt: string | undefined,
    options?: StreamingOptions
  ): Promise<string>;

  /** Cancel the current stream */
  cancel(): void;
}

/**
 * Ollama API response for streaming
 * @internal
 */
export interface OllamaStreamChunk {
  model?: string;
  created_at?: string;
  response?: string;
  done?: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Gemini API response
 * @internal
 */
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usage?: {
    prompt_token_count?: number;
    candidates_token_count?: number;
  };
}

/**
 * Complete type for useStreaming return value
 */
export type UseStreamingResult = UseStreamingState & {
  /** Original configuration passed to the hook */
  config?: UseStreamingConfig;
};

/**
 * Token accumulator for buffering
 * @internal
 */
export interface TokenBuffer {
  /** Add a token to the buffer */
  add(token: string): void;

  /** Flush the buffer and get accumulated text */
  flush(): string;

  /** Clear the buffer */
  clear(): void;

  /** Check if buffer is ready to flush */
  isReady(bufferSize: number): boolean;
}
