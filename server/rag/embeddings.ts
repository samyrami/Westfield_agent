/**
 * Cliente de OpenAI Embeddings — sólo usa `fetch` nativo para ser portable
 * (Node, Lambda, edge). NO importes Node-only aquí.
 *
 * Se usa en dos contextos:
 *   - ingest (scripts/ingest.ts): embebe cada chunk de los docs (batch).
 *   - runtime (server/rag/retriever.ts): embebe el query del estudiante (1 vector por turno).
 *
 * Default: text-embedding-3-small (1536 dims, ~$0.02 / 1M tokens).
 */

export interface EmbeddingEnv {
  OPENAI_API_KEY: string;
  OPENAI_EMBEDDING_MODEL?: string;
  OPENAI_BASE_URL?: string;
}

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
}

/**
 * Embebe un array de textos en una sola llamada (OpenAI permite batch).
 * Si excede 2048 inputs o ~8000 tokens por input, conviene chunkear antes.
 */
export async function embedTexts(
  texts: string[],
  env: EmbeddingEnv,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ausente — no se pueden generar embeddings.");
  }

  const model = env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `OpenAI embeddings ${res.status}: ${errText.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as OpenAIEmbeddingResponse;
  // OpenAI devuelve los items con `index` — los reordenamos por si acaso.
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => normalize(d.embedding));
}

export async function embedOne(
  text: string,
  env: EmbeddingEnv,
): Promise<number[]> {
  const [v] = await embedTexts([text], env);
  return v;
}

/** Normaliza L2 — útil para que la similitud sea sólo producto punto. */
function normalize(v: number[]): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  if (norm === 0) return v.slice();
  const inv = 1 / norm;
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}
