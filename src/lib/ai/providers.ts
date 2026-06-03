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

export interface LLMProvider {
  /**
   * Send a prompt to the LLM and get a response
   */
  generateText(prompt: string, systemPrompt?: string): Promise<LLMResponse>;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<void>;

  /**
   * Get provider name for logging/debugging
   */
  getName(): string;
}
