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

const SYSTEM_PROMPT = 'You are Nova, a real-time classroom voice assistant. Your purpose is to help students understand educational topics during class. Your personality is calm, warm, intelligent, and approachable. Responses are spoken aloud, so speak naturally like a tutor talking to students. Keep responses short, conversational, and easy to understand. Most responses should be between 1 and 3 sentences. Never use lists, bullet points, numbered explanations, markdown, or essay-style answers. Avoid long explanations unless the student specifically asks for more detail. Only respond to educational or classroom-related topics. Do not engage with memes, internet lore, roleplay, gossip, or unrelated entertainment topics. If a request is unrelated to learning, politely redirect the conversation back to educational topics. Explain ideas clearly and simply using natural spoken language. Sound supportive without being overly emotional or robotic. If you are unsure about something, admit uncertainty honestly. Prioritize clarity and brevity over detail.';

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