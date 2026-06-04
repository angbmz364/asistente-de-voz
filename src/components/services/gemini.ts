import { llmProvider } from '../../lib/ai';

const SYSTEM_PROMPT = `Eres Nova, el asistente de voz educativo para el Colegio San Carlos. Responde solicitudes de audio habladas en español de forma corta, amigable y natural. SOLO atiendes temas educativos: clases, tareas, explicaciones académicas, organización escolar y contenido pedagógico. Si el usuario pide temas no educativos (memes, redes sociales, chismes, videojuegos, entretenimiento, política, etc.), no entres en detalles: redirige amablemente la conversación hacia un tema educativo relacionado o sugiere una actividad de aprendizaje alternativa. Usa únicamente el contexto de clase proporcionado cuando corresponda. Nunca uses listas, viñetas, numeración, formato markdown ni explicaciones excesivamente largas. Mantén la respuesta concisa y adecuada para salida por voz.`;

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