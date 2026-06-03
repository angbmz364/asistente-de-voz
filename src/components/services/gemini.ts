type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MAX_TOKENS = Number(import.meta.env.VITE_GEMINI_MAX_TOKENS ?? 800);

const SYSTEM_PROMPT = `You are Nova, a real-time classroom voice assistant for Colegio San Carlos. You answer spoken audio requests in a short, friendly, and natural Spanish style. If the prompt includes specific class or group information, use that data to answer. If no extra class data is provided, answer based on your academic knowledge and keep the response simple, direct, and conversational. Never use lists, bullet points, numbered items, markdown formatting, or overly long explanations.`;

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const extractTextFromResponse = (data: GeminiResponse): string => {
  const parts = data.candidates?.[0]?.content?.parts;

  if (!parts?.length) {
    return "";
  }

  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
};

const postprocessResponse = (response: string): string => {
  return response
    .replace(/[*#-]/g, "")
    .replace(/\d+\./g, "")
    .replace(/\n/g, " ")
    .trim();
};

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

export const askGemini = async (prompt: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add your API key to .env.local.");
  }

  console.info('Sending to Gemini (prompt preview):', { length: prompt.length, preview: prompt.slice(0,300) });
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: SYSTEM_PROMPT,
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = extractTextFromResponse(data);

  if (!text) {
    throw new Error("No response received from Gemini.");
  }

  return postprocessResponse(text);
};