/**
 * Carga del índice RAG desde disco — adaptador Node-only.
 *
 * IMPORTANTE: este módulo SÍ importa `fs` y `path`. Por eso vive separado de
 * `maia-core.ts`, que debe seguir siendo portable. Sólo lo cargan los
 * adaptadores de runtime (server/index.ts, server/lambda.ts).
 *
 * Resolución de path:
 *   1. arg explícito de loadIndexFromDisk()
 *   2. env MAIA_INDEX_PATH
 *   3. <cwd>/data/maia-index.json
 *
 * En Lambda el zip se extrae a /var/task y cwd = /var/task. El bundling
 * coloca el JSON en data/ al lado del index.mjs (ver bundle:lambda).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { RagIndex } from "./types";

let cachedIndex: RagIndex | null = null;
let cachedPath: string | null = null;

export function resolveIndexPath(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.MAIA_INDEX_PATH) return process.env.MAIA_INDEX_PATH;
  return path.resolve(process.cwd(), "data", "maia-index.json");
}

/**
 * Lee el índice del disco. Cachea en memoria del proceso — útil para que
 * Lambda reuse el índice entre invocaciones del mismo container.
 */
export async function loadIndexFromDisk(explicitPath?: string): Promise<RagIndex> {
  const p = resolveIndexPath(explicitPath);
  if (cachedIndex && cachedPath === p) return cachedIndex;

  const raw = await fs.readFile(p, "utf-8");
  const parsed = JSON.parse(raw) as RagIndex;

  if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
    throw new Error(
      `Índice inválido en ${p}: falta el array 'chunks'. Corre \`npm run ingest\` para regenerarlo.`,
    );
  }

  cachedIndex = parsed;
  cachedPath = p;
  return parsed;
}

/** Útil para tests: limpia la caché en memoria. */
export function _clearIndexCache(): void {
  cachedIndex = null;
  cachedPath = null;
}
