/**
 * Adaptador para AWS Lambda (Function URL o API Gateway HTTP API v2).
 *
 * Empaquetado:
 *   npm run bundle:lambda          # esbuild → dist-lambda/index.mjs
 *   # luego copiar data/maia-index.json al lado del bundle:
 *   #   dist-lambda/index.mjs
 *   #   dist-lambda/data/maia-index.json
 *   cd dist-lambda && zip -r ../lambda.zip .
 *
 * Crear Lambda Node 20 ESM, subir lambda.zip, configurar env vars:
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_MODEL=gpt-4o-mini
 *   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
 *   MAIA_INDEX_PATH=/var/task/data/maia-index.json
 *
 * Activar Function URL o API Gateway HTTP API → CloudFront ruta /api/* a la Lambda.
 *
 * El índice se carga UNA vez por container (cold-start) y se reusa entre
 * invocaciones — el caching está dentro de `loadIndexFromDisk`.
 */

import { askMaia, type MaiaRequestBody, type MaiaEnv } from "./maia-core";
import { loadIndexFromDisk } from "./rag/index-loader";
import { buildRetriever } from "./rag/runtime";
import type { AlwaysIncludeDoc, RetrieveFn } from "./rag/types";

interface APIGatewayV2Event {
  version: string;
  routeKey: string;
  rawPath: string;
  headers: Record<string, string>;
  requestContext: {
    http: { method: string; sourceIp: string; path: string };
  };
  body?: string;
  isBase64Encoded?: boolean;
}

interface APIGatewayV2Result {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Estado cold-start (una vez por container)                           */
/* ------------------------------------------------------------------ */

let initPromise: Promise<{
  retrieve: RetrieveFn | undefined;
  alwaysIncludeDocs: AlwaysIncludeDoc[];
}> | null = null;

function init(): Promise<{
  retrieve: RetrieveFn | undefined;
  alwaysIncludeDocs: AlwaysIncludeDoc[];
}> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const index = await loadIndexFromDisk(process.env.MAIA_INDEX_PATH);
        const apiKey = process.env.OPENAI_API_KEY;
        const retrieve = apiKey
          ? buildRetriever({
              index,
              env: {
                OPENAI_API_KEY: apiKey,
                OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
                OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
              },
            })
          : undefined;
        return { retrieve, alwaysIncludeDocs: index.always_include };
      } catch (err) {
        console.warn(
          "Lambda init: índice RAG no disponible, Maia operará sin contexto. Detalle:",
          err instanceof Error ? err.message : err,
        );
        return { retrieve: undefined, alwaysIncludeDocs: [] };
      }
    })();
  }
  return initPromise;
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export async function handler(
  event: APIGatewayV2Event,
): Promise<APIGatewayV2Result> {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (path === "/api/health" && method === "GET") {
    const state = await init();
    return jsonResponse(200, {
      ok: true,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      runtime: "lambda",
      rag: {
        loaded: Boolean(state.retrieve),
        always_include: state.alwaysIncludeDocs.length,
      },
    });
  }

  if (path !== "/api/maia" || method !== "POST") {
    return jsonResponse(404, { error: "Not found" });
  }

  let body: MaiaRequestBody;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
      : (event.body ?? "");
    body = JSON.parse(raw) as MaiaRequestBody;
  } catch {
    return jsonResponse(400, { error: "Cuerpo JSON inválido." });
  }

  const state = await init();

  const env: MaiaEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    alwaysIncludeDocs: state.alwaysIncludeDocs,
    retrieve: state.retrieve,
  };

  const result = await askMaia(body, env);
  return jsonResponse(200, result);
}

function jsonResponse(
  statusCode: number,
  payload: unknown,
): APIGatewayV2Result {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}
