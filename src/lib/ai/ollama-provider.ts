import type { LLMProvider, LLMResponse } from './providers'

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

const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "gemma3:4b";
const OLLAMA_ENDPOINT = import.meta.env.VITE_OLLAMA_ENDPOINT ?? "http://localhost:11434";
const OLLAMA_MAX_TOKENS = Number(import.meta.env.VITE_OLLAMA_MAX_TOKENS ?? 200);

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
        `Failed to connect to Ollama at ${OLLAMA_ENDPOINT}. Ensure Ollama is running.`
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
          `Could not connect to Ollama at ${OLLAMA_ENDPOINT}. Make sure Ollama is running: ollama serve`
        );
      }
      throw error;
    }
  }
}

export default new OllamaProvider();
