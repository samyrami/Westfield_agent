/**
 * Glue runtime — combina embeddings + retriever en una closure que el
 * adaptador (server/index.ts, server/lambda.ts) puede pasar como `retrieve`
 * dentro de MaiaEnv, manteniendo a `maia-core.ts` desacoplado del índice.
 */

import { embedOne, type EmbeddingEnv } from "./embeddings";
import { retrieveFromIndex } from "./retriever";
import type { RagIndex, RetrieveFn, RetrievedChunk } from "./types";

export interface BuildRetrieverArgs {
  index: RagIndex;
  env: EmbeddingEnv;
}

/**
 * Construye una función retrieve() lista para inyectar en MaiaEnv.
 * Si el query está vacío, devuelve [] sin llamar a la API.
 */
export function buildRetriever(args: BuildRetrieverArgs): RetrieveFn {
  const { index, env } = args;

  return async function retrieve(query: string): Promise<RetrievedChunk[]> {
    const trimmed = (query ?? "").trim();
    if (!trimmed) return [];
    if (index.chunks.length === 0) return [];

    let queryEmbedding: number[];
    try {
      queryEmbedding = await embedOne(trimmed, env);
    } catch (err) {
      console.error("RAG retrieve: falló embedOne, retornando []:", err);
      return [];
    }

    return retrieveFromIndex(queryEmbedding, index);
  };
}
