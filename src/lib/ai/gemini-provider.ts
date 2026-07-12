import type { LLMProvider, LLMResponse, StreamingOptions } from './providers'

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

  async generateTextStream(
    prompt: string,
    systemPrompt: string | undefined,
    options: StreamingOptions
  ): Promise<string> {
    const { onToken, onError, onComplete, signal } = options

    await this.validateConfig()

    const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${encodeURIComponent(GEMINI_API_KEY!)}`

    console.info('Streaming from Gemini (prompt preview):', {
      length: prompt.length,
      preview: prompt.slice(0, 300),
    })

    const response = await fetch(streamEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemPrompt || '' }],
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
    })

    if (!response.ok) {
      const errorText = await response.text()
      const err = new Error(`Gemini API request failed: ${response.status} ${errorText}`)
      onError?.(err)
      throw err
    }

    if (!response.body) {
      const err = new Error('No response body from Gemini')
      onError?.(err)
      throw err
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let fullResponse = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          let jsonStr = trimmed
          if (jsonStr.startsWith('data: ')) jsonStr = jsonStr.slice(6)
          if (jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr) as GeminiResponse
            const text = this.extractTextFromResponse(data)
            if (text) {
              fullResponse += text
              onToken?.(text)
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }

      onComplete?.()
      return this.postprocessResponse(fullResponse)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
      throw err
    } finally {
      reader.releaseLock()
    }
  }
}

export default new GeminiProvider();
