import type { LLMProvider } from '../ai/providers'

/**
 * Dimensión fija del vector BM25 de respaldo.
 * Consistente dentro del mismo índice: si el provider no
 * responde, todos los chunks usan este espacio.
 */
export const BM25_DIM = 128

const BM25_TOKEN_RE = /[a-zA-Z0-9]+/g

/**
 * Divide el texto en tokens para español: minúsculas y sin acentos,
 * de modo que "matemática" y "matematica" coincidan.
 */
export function tokenize(text: string): string[] {
  return (text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '')
    .toLowerCase()
    .match(BM25_TOKEN_RE) ?? []
}

/**
 * Hash determinista de un token a un bucket [0, BM25_DIM).
 */
function hashToken(token: string): number {
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0
  }
  return hash % BM25_DIM
}

/**
 * Vector por palabras clave estilo BM25: Tf con peso decreciente,
 * hash de cada token a un bucket. Normalizado a norma 1 para que
 * el coseno se reduzca a un producto punto.
 */
export function bm25Embedding(text: string): number[] {
  const vector = new Array(BM25_DIM).fill(0)
  const tokens = tokenize(text)
  const tf = new Map<string, number>()

  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1)
  }

  for (const [token, count] of tf) {
    // Peso Tf con incrementos marginales decrecientes
    const weight = Math.log(1 + count) / (count + 1)
    const bucket = hashToken(token)
    vector[bucket] += weight
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

/**
 * Embebe texto con el provider configurado (Gemini / Ollama).
 * Si el provider no existe o falla, degrada a BM25 local para que
 * la aplicación nunca se rompa offline.
 */
export async function embed(text: string, provider?: LLMProvider): Promise<number[]> {
  if (provider?.generateEmbedding) {
    try {
      return await provider.generateEmbedding(text)
    } catch (error) {
      console.warn('Falling back to BM25 embeddings:', error)
    }
  }
  return bm25Embedding(text)
}
