/**
 * Similitud coseno entre dos vectores.
 * Los embeddings BM25 locales van normalizados a norma 1; los de
 * provider pueden no estarlo, así que se divide por la norma real.
 * Con dimensiones distintas (provider vs BM25) se compara el segmento
 * común más corto: degradado pero sin romper la app.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}