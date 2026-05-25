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
const SCHOOL_CONTEXT = `
School: Colegio San Carlos
Level: 5th grade of high school
Subject: Everything realted to the subjects taught in 5th grade of high school, including but not limited to: mathematics, physics, chemistry, biology, history, literature, and geography.
Avoid: memes, internet lore, roleplay, gossip, unrelated entertainment topics. Prioritize educational topics related to the school's curriculum. If a request is unrelated to learning, politely redirect the conversation back to educational topics.
Class rules: answer in simple language, encourage questions, avoid overexplaining.
Class info: The class tutor is Walter Blancas.
Class schedule: Monday to Friday, 7:20 AM to 2:30 PM.
Breaks: 9:55 AM - 10:15 AM, 12:30 PM - 1:00 PM.
Monday: 7:40 AM - 9:10 AM: Artes Creativas, 9:10 AM - 9:55 AM: Trigonometría, 10:15 AM - 11:00 AM: Trigonometría, 11:00 AM - 12:30 PM: Inglés, 1:00 PM - 2:30 PM: Geometría
Tuesday: 7:40 AM - 9:10 AM: Habilidades, 9:10 AM - 9:55 AM: Razonamiento Verbal, 10:15 AM - 11:00 AM: Razonamiento Verbal, 11:00 AM - 12:30 PM: Física, 1:00 PM - 2:30 PM: Inglés
Wednesday: 7:40 AM - 9:10 AM: Computación, 9:10 AM - 9:55 AM: Álgebra, 10:15 AM - 11:00 AM: Álgebra, 11:00 AM - 12:30 PM: Ecología, 1:00 PM - 2:30 PM: Biología
Thursday: 7:40 AM - 9:10 AM: Química, 9:10 AM - 9:55 AM: Lenguaje, 10:15 AM - 11:00 AM: Lenguaje, 11:00 AM - 12:30 PM: Ciencias Sociales, 1:00 PM - 2:30 PM: Razonamiento Matemático
Friday: 7:40 AM - 9:10 AM: Investigación, 9:10 AM - 9:55 AM: Literatura, 10:15 AM - 11:00 AM: Plan Lector, 11:00 AM - 12:30 PM: Aritmética, 1:00 PM - 2:30 PM: Educación Física
`;
const SYSTEM_PROMPT = `You are Nova, a real-time classroom voice assistant. Your purpose is to help students understand educational topics during class. Your personality is calm, warm, intelligent, and approachable. Responses are spoken aloud, so speak naturally like a tutor talking to students. Keep responses short, conversational, and easy to understand. Most responses should be between 1 and 3 sentences. Never use lists, bullet points, numbered explanations, markdown, or essay-style answers. Avoid long explanations unless the student specifically asks for more detail. Only respond to educational or classroom-related topics. Do not engage with memes, internet lore, roleplay, gossip, or unrelated entertainment topics. If a request is unrelated to learning, politely redirect the conversation back to educational topics. Explain ideas clearly and simply using natural spoken language. Sound supportive without being overly emotional or robotic. If you are unsure about something, admit uncertainty honestly. If the student asks for a simpler explanation, simplify the answer instead of repeating it. Prioritize clarity and brevity over detail. ${SCHOOL_CONTEXT}`;

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