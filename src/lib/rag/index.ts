import type { DocumentKind, DocumentRecord } from '../../components/services/database'
import { getDocuments } from '../../components/services/database'

/**
 * Índice vectorial en memoria sobre la tabla `documents` de SQLite.
 * La proyección RAG vive en la BD (persistente); este módulo solo
 * la cachea y la consulta por coseno.
 */

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

let indexCache: DocumentRecord[] | null = null

export const getIndex = async (force = false): Promise<DocumentRecord[]> => {
  if (!indexCache || force) {
    indexCache = await getDocuments()
  }
  return indexCache
}

export const invalidateIndex = (): void => {
  indexCache = null
}

export type ScoredDocument = {
  id: number;
  kind: DocumentKind;
  entityId: number | null;
  content: string;
  score: number;
}

/**
 * Devuelve los top-K documents por similitud coseno frente a un
 * embedding de consulta ya calculado.
 */
export async function searchIndex(
  queryEmbedding: number[],
  k = 5
): Promise<ScoredDocument[]> {
  const docs = await getIndex()

  return docs
    .filter((doc) => doc.embedding.length > 0)
    .map((doc) => ({
      id: doc.id,
      kind: doc.kind,
      entityId: doc.entityId,
      content: doc.content,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}