import { llmProvider } from '../../lib/ai';

const SYSTEM_PROMPT = `You are Nova, a real-time classroom voice assistant for Colegio San Carlos. You answer spoken audio requests in a short, friendly, and natural Spanish style. If the prompt includes specific class or group information, use that data to answer. If no extra class data is provided, answer based on your academic knowledge and keep the response simple, direct, and conversational. Never use lists, bullet points, numbered items, markdown formatting, or overly long explanations.`;

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
 * Backwards compatibility alias for existing code
 * @deprecated Use askLLM instead
 */
export const askGemini = askLLM;