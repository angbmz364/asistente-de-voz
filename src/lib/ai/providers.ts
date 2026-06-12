/**
 * LLM Provider Interface
 * 
 * This abstraction allows swapping between different language models
 * without changing the application logic.
 */

export interface LLMResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type StreamingCallback = (token: string) => void;

export type StreamingOptions = {
  onToken?: StreamingCallback;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

export interface LLMProvider {
  /**
   * Send a prompt to the LLM and get a response
   */
  generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse>;

  /**
   * Send a prompt and stream tokens with callbacks
   */
  generateTextStream?(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string>;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<void>;

  /**
   * Get provider name for logging/debugging
   */
  getName(): string;
}
