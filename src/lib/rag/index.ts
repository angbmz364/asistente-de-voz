import type { DocumentKind, DocumentRecord } from '../../components/services/database'
import { getDocuments } from '../../components/services/database'
import { cosineSimilarity } from './cosine'

/**
 * Índice vectorial en memoria sobre la tabla `documents` de SQLite.
 * La proyección RAG vive en la BD (persistente); este módulo solo
 * la cachea y la consulta por coseno.
 */

export { cosineSimilarity }

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