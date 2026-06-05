/**
 * Servidor Node local — Hono + @hono/node-server.
 *
 *   npm run dev    → tsx watch server/index.ts (dev, paralelo a Vite)
 *   npm run start  → tsx server/index.ts (prod local, sirve dist/)
 *
 * Rutas:
 *   GET  /                 → dev: redirige a Vite. prod: sirve dist/index.html.
 *   GET  /assets/*         → estáticos (sólo en prod).
 *   POST /api/maia         → endpoint del agente (con RAG si hay índice).
 *   GET  /api/health       → ping + info de runtime.
 *
 * Al boot intenta cargar data/maia-index.json. Si no está, sigue funcionando
 * sin RAG — `npm run ingest` lo genera.
 */

// Cargar dotenv sólo si está disponible. En dev local (tsx) está en
// devDependencies y leemos .env.local. En el container de producción no se
// instala (npm ci --omit=dev) y las env vars vienen del orchestrator
// (docker run --env-file, App Runner config, etc.) — el try/catch deja
// pasar ese caso sin romper el boot.
try {
  const { config: loadEnv } = await import("dotenv");
  loadEnv({ path: ".env.local" });
  loadEnv({ path: ".env" });
} catch {
  // dotenv no instalado — corriendo en container, env vars ya vienen del host.
}

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { askMaia, type MaiaRequestBody, type MaiaEnv } from "./maia-core";
import { loadIndexFromDisk } from "./rag/index-loader";
import { buildRetriever } from "./rag/runtime";
import type { AlwaysIncludeDoc, RagIndex, RetrieveFn } from "./rag/types";

/* ------------------------------------------------------------------ */
/* Visibilidad de crashes silenciosos                                  */
/* ------------------------------------------------------------------ */

// Sin estos handlers, una promesa rechazada o un throw en una callback
// asincrónica termina muriendo el proceso sin imprimir nada útil a stderr —
// y `concurrently` (usado por `npm run dev:both`) no surfacea esos crashes
// al stdout combinado. Resultado: el [server] no aparece y el dev cree que
// arrancó cuando en realidad murió.
process.on("uncaughtException", (err) => {
  console.error("✗ uncaughtException:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("✗ unhandledRejection:", reason);
  process.exit(1);
});

const PORT = Number(process.env.PORT ?? 3001);
const SERVE_STATIC = process.env.SERVE_STATIC !== "false";

const app = new Hono();

/* ------------------------------------------------------------------ */
/* Carga del índice RAG (one-shot al arrancar)                         */
/* ------------------------------------------------------------------ */

let ragIndex: RagIndex | null = null;
let retrieve: RetrieveFn | undefined;
let alwaysIncludeDocs: AlwaysIncludeDoc[] = [];

async function initRag(): Promise<void> {
  try {
    ragIndex = await loadIndexFromDisk();
    alwaysIncludeDocs = ragIndex.always_include;
    if (process.env.OPENAI_API_KEY) {
      retrieve = buildRetriever({
        index: ragIndex,
        env: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
          OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        },
      });
    }
    console.log(
      `🧠 RAG cargado: contexto "${ragIndex.name}" · ${ragIndex.chunks.length} chunks · ${alwaysIncludeDocs.length} always_include (${ragIndex.embedding_model})`,
    );
  } catch (err) {
    console.warn(
      "✗ RAG no cargó — Maia arranca SIN índice (data/maia-index.json).\n  Corre `npm run ingest` para generar el índice. Detalle:",
      err instanceof Error ? err.message : err,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Errores y CORS                                                      */
/* ------------------------------------------------------------------ */

app.onError((err, c) => {
  console.error("Unhandled error in Hono:", err);
  return c.json(
    {
      error: err instanceof Error ? err.message : String(err),
      where: "hono.onError",
    },
    500,
  );
});

app.use("/api/*", cors({ origin: ["http://localhost:5173"] }));

/* ------------------------------------------------------------------ */
/* Rate limit en memoria                                               */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const ipHits = new Map<string, number[]>();

function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    rag: ragIndex
      ? {
          name: ragIndex.name,
          chunks: ragIndex.chunks.length,
          always_include: alwaysIncludeDocs.length,
          embedding_model: ragIndex.embedding_model,
          generated_at: ragIndex.generated_at,
        }
      : null,
    timestamp: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------------ */
/* /api/maia                                                           */
/* ------------------------------------------------------------------ */

app.post("/api/maia", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "local";

  if (tooManyRequests(ip)) {
    return c.json(
      { error: "Demasiadas solicitudes. Espera un minuto y vuelve a intentar." },
      429,
    );
  }

  let body: MaiaRequestBody;
  try {
    body = (await c.req.json()) as MaiaRequestBody;
  } catch {
    return c.json({ error: "Cuerpo JSON inválido." }, 400);
  }

  const env: MaiaEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    alwaysIncludeDocs,
    retrieve,
  };

  try {
    const result = await askMaia(body, env);
    return c.json(result);
  } catch (err) {
    console.error("askMaia threw despite internal try/catch:", err);
    return c.json(
      {
        message:
          "[error inesperado en el servidor] ¿Cuál dirías que es la pregunta central que el caso te plantea, y por qué?",
        rubric_level: "satisfactorio",
        current_question: 1,
        advance_to_next_question: false,
        is_final_summary: false,
        unresolved_points: [],
        fallback: true,
        error: err instanceof Error ? err.message : String(err),
      },
      200,
    );
  }
});

/* ------------------------------------------------------------------ */
/* Estáticos en prod                                                   */
/* ------------------------------------------------------------------ */

// Sólo monta estáticos si dist/ existe — evita el warning ruidoso en dev
// donde el front lo sirve Vite y nunca se corrió `npm run build`.
import { existsSync } from "node:fs";
if (SERVE_STATIC && existsSync("./dist/index.html")) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.use("/favicon.svg", serveStatic({ path: "./dist/favicon.svg" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

// Carga RAG en background — el servidor empieza a aceptar requests
// inmediatamente. Si llega un POST /api/maia antes de que RAG esté listo,
// Maia opera con el system prompt base (el endpoint lee `retrieve` y
// `alwaysIncludeDocs` cada vez, así que se enganchan al RAG cuando termine).
function boot(): void {
  initRag().catch((err) =>
    console.error("✗ initRag rechazó (no debería pasar):", err),
  );
  // `serve()` retorna el `net.Server` subyacente. El evento "error" se emite
  // asincrónicamente (EADDRINUSE, EACCES, etc.) — sin un listener acá esos
  // crashes terminan como "unhandled 'error' event" y mueren con la traza
  // estándar de Node, que `concurrently` suele silenciar. Lo enganchamos
  // explícitamente para que el motivo del crash quede en una línea visible.
  const httpServer = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      const front = process.env.OPENAI_API_KEY ? "🟢" : "🟡";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      console.log(
        `${front}  Maia server listening on http://localhost:${info.port}`,
      );
      if (process.env.OPENAI_API_KEY) {
        console.log(`   modelo: ${model}`);
      } else {
        console.log(
          "   Sin OPENAI_API_KEY → el endpoint responde en modo fallback offline.",
        );
        console.log(
          "   Asegúrate de tener .env.local con OPENAI_API_KEY=sk-...",
        );
      }
      // El estado del RAG lo loggea `initRag()` cuando termina (en
      // paralelo). Si el archivo no existe, también muestra su propio
      // warning. No re-imprimimos nada acá para no confundir con un
      // estado intermedio "todavía cargando".
    },
  );
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `✗ Server crash: puerto ${PORT} ocupado. ` +
          `Matá el proceso (npm run dev:reset) y reintentá.`,
      );
    } else {
      console.error("✗ Server crash:", err);
    }
    process.exit(1);
  });
}

try {
  boot();
} catch (err) {
  console.error("✗ Boot failed:", err);
  process.exit(1);
}
