import type { LLMProvider } from './providers'
import geminiProvider from './gemini-provider'
import ollamaProvider from './ollama-provider'
import { embed } from '../rag/embeddings'

/**
 * Get the configured LLM provider
 * 
 * Set VITE_LLM_PROVIDER=ollama to use local Ollama inference
 * Set VITE_LLM_PROVIDER=gemini to use Gemini API (default)
 */
const getProvider = (): LLMProvider => {
  const provider = (import.meta.env.VITE_LLM_PROVIDER ?? 'gemini').toLowerCase();

  switch (provider) {
    case 'ollama':
      return ollamaProvider;
    case 'gemini':
    default:
      return geminiProvider;
  }
};

export const llmProvider = getProvider();

/**
 * Genera un embedding para un texto. Usa el provider configurado
 * (Gemini / Ollama) y degrada a BM25 local si no está disponible.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  return embed(text, llmProvider)
};

export type { LLMProvider, LLMResponse } from './providers';
