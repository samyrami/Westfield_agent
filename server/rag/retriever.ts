/**
 * Retriever — lógica pura de similitud coseno + top-k.
 *
 * No importa fs, no importa Hono. Recibe un índice ya cargado y devuelve los
 * chunks más relevantes para un embedding de query.
 *
 * Como en `embeddings.ts` normalizamos los vectores a L2=1, la similitud
 * coseno se reduce a producto punto. Para ~200 chunks de 1536 dims esto
 * corre en <2ms en Node — no necesitamos vector DB.
 */

import type { RagIndex, RetrievedChunk } from "./types";

export interface RetrieveOpts {
  topK?: number;
  minSimilarity?: number;
}

export function retrieveFromIndex(
  queryEmbedding: number[],
  index: RagIndex,
  opts: RetrieveOpts = {},
): RetrievedChunk[] {
  const topK = opts.topK ?? index.retrieval.top_k;
  const minSim = opts.minSimilarity ?? index.retrieval.min_similarity;

  if (index.chunks.length === 0) return [];

  const scored: RetrievedChunk[] = new Array(index.chunks.length);
  for (let i = 0; i < index.chunks.length; i++) {
    const c = index.chunks[i];
    scored[i] = { chunk: c, similarity: dot(queryEmbedding, c.embedding) };
  }

  scored.sort((a, b) => b.similarity - a.similarity);

  const filtered: RetrievedChunk[] = [];
  for (const s of scored) {
    if (filtered.length >= topK) break;
    if (s.similarity < minSim) break;
    filtered.push(s);
  }
  return filtered;
}

function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
