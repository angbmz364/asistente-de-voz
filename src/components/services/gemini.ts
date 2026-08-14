import { llmProvider } from '../../lib/ai';
import { askLLMStream as askLLMStreamLib, StreamingSession, createStreamingSession, type StreamingOptions } from '../../lib/ai/streaming';
import { SYSTEM_PROMPT } from '../../lib/ai/prompts';

export { StreamingSession, createStreamingSession };
export type { StreamingOptions };

const selectVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find((voice) => voice.lang.startsWith("es"));

  return spanishVoice ?? voices[0] ?? null;
};

export const speakText = (text: string): void => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis is not available in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const preferredVoice = selectVoice();

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.lang = preferredVoice?.lang ?? "es-ES";
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
};

/**
 * Ask the LLM a question (non-streaming, for backward compatibility)
 * 
 * @param prompt - The user prompt
 * @returns The complete response text
 * 
 * @example
 * const response = await askLLM("What is quantum computing?");
 * speakText(response);
 */
export const askLLM = async (prompt: string): Promise<string> => {
  try {
    const result = await llmProvider.generateText(prompt, SYSTEM_PROMPT);
    console.info(`${llmProvider.getName()} → Response:`, {
      length: result.text.length,
      preview: result.text.slice(0, 100),
      usage: result.usage,
    });
    return result.text;
  } catch (error) {
    console.error(`${llmProvider.getName()} request failed:`, error);
    throw error;
  }
};

/**
 * Ask the LLM a question with streaming support
 * 
 * Returns tokens progressively via callback for real-time display
 * 
 * @param prompt - The user prompt
 * @param options - Streaming options with callbacks for tokens, errors, and completion
 * @returns The complete response text
 * 
 * @example
 * const response = await askLLMStream(
 *   "Explain photosynthesis",
 *   {
 *     onToken: (token) => updateDisplayText(token),
 *     onError: (error) => showErrorMessage(error.message),
 *     onComplete: () => console.log('Response complete')
 *   }
 * );
 * speakText(response);
 */
export const askLLMStream = async (
  prompt: string,
  options: StreamingOptions = {}
): Promise<string> => {
  try {
    console.info(`${llmProvider.getName()} streaming...`, {
      length: prompt.length,
      preview: prompt.slice(0, 100),
    });

    const result = await askLLMStreamLib(prompt, SYSTEM_PROMPT, {
      ...options,
      onError: (error) => {
        console.error(`${llmProvider.getName()} streaming failed:`, error);
        options.onError?.(error);
      },
    });

    console.info(`${llmProvider.getName()} streaming complete:`, {
      length: result.length,
    });

    return result;
  } catch (error) {
    console.error(`${llmProvider.getName()} request failed:`, error);
    throw error;
  }
};

/**
 * Backwards compatibility alias for existing code
 * @deprecated Use askLLM instead
 */
export const askGemini = askLLM;