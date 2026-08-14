import type { LLMProvider, LLMResponse, StreamingOptions } from './providers'

type OllamaResponse = {
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
};

const OLLAMA_MODEL = import.meta.env?.VITE_OLLAMA_MODEL ?? "gemma3:4b";
const OLLAMA_ENDPOINT = import.meta.env?.VITE_OLLAMA_ENDPOINT ?? "http://localhost:11434";
const OLLAMA_MAX_TOKENS = Number(import.meta.env?.VITE_OLLAMA_MAX_TOKENS ?? 200);
const OLLAMA_EMBED_MODEL = import.meta.env?.VITE_OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

/**
 * Ollama Provider for local LLM inference
 *
 * Configured for Gemma 3 4B model running on Ollama
 * Optimized for voice-first assistant with short, concise responses
 */
class OllamaProvider implements LLMProvider {
  getName(): string {
    return `Ollama (${OLLAMA_MODEL})`;
  }

  async validateConfig(): Promise<void> {
    try {
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Ollama endpoint returned ${response.status}`);
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const hasModel = data.models?.some((m) => m.name.startsWith(OLLAMA_MODEL.split(":")[0]));

      if (!hasModel) {
        throw new Error(
          `Model ${OLLAMA_MODEL} not found on Ollama. Available models: ${data.models?.map((m) => m.name).join(", ") || "none"}`
        );
      }

      console.info(`✓ Ollama provider validated: ${OLLAMA_MODEL} at ${OLLAMA_ENDPOINT}`);
    } catch (error) {
      throw new Error(
        `Failed to connect to Ollama at ${OLLAMA_ENDPOINT}. Ensure Ollama is running.`,
        { cause: error }
      );
    }
  }

  private postprocessResponse(response: string): string {
    // Remove common markdown artifacts
    return response
      .replace(/[*#_]/g, "")
      .replace(/\d+\./g, "")
      .replace(/\n/g, " ")
      .trim();
  }

  /**
   * Stream tokens from Ollama with callback support
   * Reads the response stream line by line and calls onToken for each token
   */
  async generateTextStream(
    userPrompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string> {
    const { onToken, onError, onComplete, signal } = options;

    try {
      await this.validateConfig();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    const fullPrompt = this.buildPrompt(userPrompt, systemPrompt);

    console.info('Streaming from Ollama (prompt preview):', {
      model: OLLAMA_MODEL,
      length: fullPrompt.length,
      preview: fullPrompt.slice(0, 200),
    });

    let fullResponse = '';

    try {
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: fullPrompt,
          stream: true,
          options: {
            temperature: 0.3,
            top_k: 40,
            top_p: 0.9,
            num_predict: OLLAMA_MAX_TOKENS,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `Ollama request failed: ${response.status} ${errorText}`
        );
        onError?.(error);
        throw error;
      }

      if (!response.body) {
        const error = new Error("No response body from Ollama");
        onError?.(error);
        throw error;
      }

      // Create a reader for the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              try {
                const line = JSON.parse(buffer) as OllamaResponse;
                if (line.response) {
                  fullResponse += line.response;
                  onToken?.(line.response);
                }
              } catch {
                // Ignore parse errors on final buffer
              }
            }
            break;
          }

          // Accumulate chunks and split by newline (NDJSON format)
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Process all complete lines, keep incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line) as OllamaResponse;
              if (data.response) {
                fullResponse += data.response;
                onToken?.(data.response);
              }
            } catch (error) {
              console.warn('Failed to parse Ollama stream line:', error);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete?.();

      // Return processed response
      return this.postprocessResponse(fullResponse);
    } catch (error) {
      if (error instanceof Error && error.message.includes("fetch failed")) {
        const connError = new Error(
          `Could not connect to Ollama at ${OLLAMA_ENDPOINT}. Make sure Ollama is running: ollama serve`
        );
        onError?.(connError);
        throw connError;
      }
      if (!(error instanceof Error) || !error.message.includes('Ollama request failed')) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Generate a vector embedding via Ollama's embeddings endpoint
   * Falls back to the configured model when no dedicated embed model is set
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.validateConfig();

    const response = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama embed request failed: ${response.status} ${errorText}`
      );
    }

    const data = (await response.json()) as { embedding?: number[] };

    if (!Array.isArray(data.embedding)) {
      throw new Error("No embedding received from Ollama");
    }

    return data.embedding;
  }

  /**
   * Format system prompt and user prompt for Gemma 3
   * Gemma 3 uses a specific chat format that we need to respect
   */
  private buildPrompt(userPrompt: string, systemPrompt?: string): string {
    // Gemma 3 expects a conversational format
    // Keep it simple and direct for local inference
    if (systemPrompt) {
      return `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`;
    }
    return `User: ${userPrompt}\n\nAssistant:`;
  }

  async generateText(
    userPrompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    try {
      await this.validateConfig();
    } catch (error) {
      console.error("Ollama validation failed:", error);
      throw error;
    }

    const fullPrompt = this.buildPrompt(userPrompt, systemPrompt);

    console.info('Sending to Ollama (prompt preview):', {
      model: OLLAMA_MODEL,
      length: fullPrompt.length,
      preview: fullPrompt.slice(0, 200),
    });

    try {
      const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: fullPrompt,
          stream: false,
          options: {
            // Optimized for local inference
            temperature: 0.3,
            top_k: 40,
            top_p: 0.9,
            num_predict: OLLAMA_MAX_TOKENS,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ollama request failed: ${response.status} ${errorText}`
        );
      }

      const data = (await response.json()) as OllamaResponse;

      if (!data.response) {
        throw new Error("No response received from Ollama");
      }

      // Extract tokens from Ollama response metrics
      const inputTokens = data.prompt_eval_count ?? 0;
      const outputTokens = data.eval_count ?? 0;

      return {
        text: this.postprocessResponse(data.response),
        usage: {
          inputTokens,
          outputTokens,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("fetch failed")) {
        throw new Error(
          `Could not connect to Ollama at ${OLLAMA_ENDPOINT}. Make sure Ollama is running: ollama serve`,
          { cause: error }
        );
      }
      throw error;
    }
  }
}

export default new OllamaProvider();
