import type { LLMProvider } from './providers'
import geminiProvider from './gemini-provider'
import ollamaProvider from './ollama-provider'

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

export type { LLMProvider, LLMResponse } from './providers';
