import { generateEmbedding } from '../ai'
import { searchIndex } from './index'
import type { ScoredDocument } from './index'

export type RetrievedChunk = ScoredDocument

/**
 * Recupera los top-K chunks RAG para una consulta en lenguaje natural.
 * Embebe la consulta una sola vez y busca por coseno contra `documents`.
 */
export async function retrieve(query: string, k = 5): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  return searchIndex(queryEmbedding, k)
}