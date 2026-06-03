import type { LLMProvider, LLMResponse } from './providers'

type GeminiResponse = {
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
};

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MAX_TOKENS = Number(import.meta.env.VITE_GEMINI_MAX_TOKENS ?? 800);

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

class GeminiProvider implements LLMProvider {
  getName(): string {
    return `Gemini (${GEMINI_MODEL})`;
  }

  async validateConfig(): Promise<void> {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing VITE_GEMINI_API_KEY. Add your API key to .env.local.");
    }
  }

  private extractTextFromResponse(data: GeminiResponse): string {
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts?.length) {
      return "";
    }
    return parts
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  private postprocessResponse(response: string): string {
    return response
      .replace(/[*#-]/g, "")
      .replace(/\d+\./g, "")
      .replace(/\n/g, " ")
      .trim();
  }

  async generateText(
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    await this.validateConfig();

    console.info('Sending to Gemini (prompt preview):', {
      length: prompt.length,
      preview: prompt.slice(0, 300),
    });

    const response = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY!)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [
              {
                text: systemPrompt || "",
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: `${prompt} Responde naturalmente para audio hablado. Mantén la respuesta concisa y conversacional. No uses listas o explicaciones largas.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: GEMINI_MAX_TOKENS,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = this.extractTextFromResponse(data);

    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    return {
      text: this.postprocessResponse(text),
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_token_count ?? 0,
            outputTokens: data.usage.candidates_token_count ?? 0,
          }
        : undefined,
    };
  }
}

export default new GeminiProvider();
