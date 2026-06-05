# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Showcase / demo del agente académico **Maia** de Westfield Business School. Single-page React site (réplica visual de `westfield.crearia.co`, rebranded a Westfield-only) cuyo centro narrativo es un **playground real** que conversa con OpenAI usando el método socrático sobre el caso pedagógico de Etsy.

Plan de producto y motivaciones de diseño viven en [PLAN-westfield-agent-showcase.md](PLAN-westfield-agent-showcase.md). Guía de testing manual + migración a AWS en [TESTING.md](TESTING.md). [DEPLOY.md](DEPLOY.md) está deprecado — todo el deploy lo cubre TESTING.md.

## Comandos

```bash
npm install
cp .env.example .env.local            # rellena OPENAI_API_KEY (no usar prefix VITE_)

npm run ingest                        # parsea docs/ → data/maia-index.json (RAG)
npm run dev                           # solo Vite (5173)
npm run dev:vite                      # solo el front (alias de dev)
npm run dev:server                    # solo el server Hono (3001)
npm run dev:both                      # Vite + Hono en paralelo (concurrently --raw --kill-others-on-fail)
npm run dev:reset                     # mata todos los node.exe y reporta puertos 3001/5173
npm run typecheck                     # tsc -b --noEmit
npm run build                         # tsc -b && vite build → dist/
npm start                             # tsx server/index.ts contra dist/ (prod local en 3001)
npm run test:endpoint                 # smoke test contra http://localhost:3001/api/maia
npm run bundle:lambda                 # esbuild server/lambda.ts → dist-lambda/index.mjs
```

`dev:both` usa `concurrently --raw` porque sin ese flag, en Windows el stdio del child `tsx watch` se pierde y el log del Hono no aparece nunca (síntoma típico: ves solo el banner de Vite y el chat tira 500). El `--raw` cede los prefijos `[vite]`/`[server]` pero los logs siguen siendo distinguibles por sus marcadores propios (`🟢 Maia server listening`, `🧠 RAG cargado`, errores con `✗`).

Si el chat tira 500 igual, lo más común en Windows es un node zombie ocupando el 3001 — `npm run dev:reset` los mata y verifica los puertos. Para debug profundo: arrancar `npm run dev:server` solo (en su terminal) y `npm run dev:vite` en otra, así el output queda separado.

Sin framework de tests unitarios. La verificación funcional es: `npm run typecheck`, `npm run test:endpoint` (cubre apertura + 2 turnos), y prueba manual del playground en el navegador (ver [TESTING.md](TESTING.md) §4–5 para casuística — apertura, follow-up socrático, avance entre las 3 preguntas, anti-jailbreak, rate limit 429).

Variables de entorno (server-only): `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`), `OPENAI_BASE_URL` (opcional, Azure/proxy), `MAIA_INDEX_PATH` (opcional, default `./data/maia-index.json`). `PORT` controla el puerto del server Hono (default 3001).

## Arquitectura

### Dos procesos, un solo runtime

El sitio NO depende de Vercel ni de edge functions propietarias. En desarrollo y producción local todo corre como **un servidor Node con Hono** ([server/index.ts](server/index.ts)) que sirve tanto el front (`dist/`) como el endpoint `/api/maia`. En dev se levantan dos procesos paralelos con `concurrently`: Vite en `5173` (HMR) que **proxea `/api/*` al Hono en 3001** ([vite.config.ts](vite.config.ts)). Esto significa: en el navegador siempre se va por `5173` durante dev, por `3001` en prod local.

### El "cerebro" portable

[server/maia-core.ts](server/maia-core.ts) es deliberadamente independiente del runtime: sólo usa `fetch` nativo. Ese es el contrato que permite migrar a AWS sin reescribir nada — [server/lambda.ts](server/lambda.ts) ya está preparado como adapter para API Gateway HTTP API v2 / Function URL y delega en el mismo `askMaia()`. **No metas dependencias de Hono ni de Node-only en `maia-core.ts`** o rompes la portabilidad — todo lo que tocó disco (carga de índice, parseo de PDF/DOCX) vive en `server/rag/index-loader.ts` (Node-only) y `scripts/ingest/` respectivamente, y se inyecta en `maia-core` vía closures (`retrieve`) o data plana (`alwaysIncludeDocs`).

`askMaia()` recibe `{history, studentInput}` + un `MaiaEnv` (incluye `retrieve` opcional y `alwaysIncludeDocs`) y devuelve un `MaiaResponse` con shape estricto (definido en [server/maia-core.ts](server/maia-core.ts) y duplicado, intencionalmente, en [src/lib/maiaClient.ts](src/lib/maiaClient.ts) — son contratos públicos del endpoint).

### Contexto pedagógico vía RAG (docs/ + ingesta)

El system prompt base es **agnóstico de caso** ([server/context/system_prompt.ts](server/context/system_prompt.ts)): identidad, dinámica socrática, JSON shape, anti-jailbreak. NADA específico del caso vive en `.ts`. El material pedagógico vive en [docs/](docs/) (PDF/DOCX/TXT) + [docs/manifest.json](docs/manifest.json) que lo describe.

`npm run ingest` ([scripts/ingest.ts](scripts/ingest.ts)) parsea los docs, los chunkea, calcula embeddings con OpenAI y persiste `data/maia-index.json`. Ese índice tiene dos secciones:

- `always_include`: docs marcados `always_include: true` (rúbrica, introspección, guía operativa) — se inyectan **enteros cada turno** en el system prompt.
- `chunks`: docs marcados `chunk: true` (caso, notas del instructor, futuras referencias) — se recuperan **por similitud coseno top-k** respecto a lo último que dijo el estudiante.

Para cambiar de caso o agregar material: editar `docs/manifest.json` + drop de archivos en `docs/` + `npm run ingest`. Cero cambios de código.

**Loaders pluggables** ([scripts/ingest/loaders.ts](scripts/ingest/loaders.ts)): hoy `LocalFolderLoader` lee `docs/`. Mañana `GoogleDriveLoader` (stub presente) traerá lo mismo desde una carpeta compartida. Para enchufarlo: instalar `googleapis`, implementar `fetchDocs()`, y poner `"loader": "drive"` en el manifest. El runtime no se entera.

### Privacidad de instructor_only

Docs marcados `instructor_only: true` en el manifest (p. ej. `Nota del instructor caso Etsy.pdf`) llegan a Maia con el flag, pero el system prompt le prohíbe citarlos. Defensa en profundidad: el sanitizador `looksLikeNotesLeak` en [server/maia-core.ts](server/maia-core.ts) busca marcadores ("Notas del instructor", "Vías de Respuesta") en la respuesta del modelo y, si detecta filtración, reemplaza el `message` por una respuesta neutra antes de devolverlo.

**No importes nada de `server/rag/` desde `src/`** — los chunks de instructor_only quedarían quemados al bundle del cliente.

### Contrato JSON estructurado con OpenAI

Se llama Chat Completions con `response_format: json_object` y se le pide al modelo devolver siempre un objeto con: `message`, `rubric_level` (5 niveles), `current_question` (1|2|3), `advance_to_next_question`, `is_final_summary`, `unresolved_points[]`. El parseo es defensivo (`safeParseMaiaJson`): si el modelo devuelve markdown con backticks, los strippea; si el JSON está mal formado, cae a un objeto con `message` = texto crudo y rubric_level neutro.

**El UI depende de este shape**: la `ProgressBar` de las 3 preguntas se mueve cuando llega `advance_to_next_question: true`, el `RubricBadge` reacciona a `rubric_level`, y el resumen final se dispara con `is_final_summary: true`. Cambios al shape requieren actualizar **los dos lados** (`server/maia-core.ts` y `src/lib/maiaClient.ts`).

### Modo fallback offline

Si falta `OPENAI_API_KEY` o si OpenAI falla, `askMaia()` devuelve respuestas plantilladas (`buildFallbackResponse`) con `fallback: true`. La página entera sigue funcional. Esto es intencional: el showcase no debe romperse en preview ni demos sin internet. `npm run test:endpoint` sin key configurada es la prueba canónica del fallback. Si falta el índice (`data/maia-index.json` no existe), Maia arranca sin RAG (sólo prompt base + fallback openings) — visible en `GET /api/health` con `rag: null`.

### Rate limit y CORS

Rate limit en memoria por IP (12 mensajes / 60s) en [server/index.ts:57-69](server/index.ts#L57-L69) — vive en el proceso, no se persiste. CORS sólo abierto a `http://localhost:5173` (necesario por el proxy de Vite en dev). En AWS habrá que ajustar ambos al pasar a Lambda.

### Structure y aliases

Alias `@/` → `src/` ([vite.config.ts](vite.config.ts), [tsconfig.app.json](tsconfig.app.json)). Tailwind con CSS variables para el sistema de color de Westfield (azul `--primary` + lima `--secondary` + fondo `--bg` casi negro), definidas en `src/index.css` y mapeadas en [tailwind.config.js](tailwind.config.js). El gradient `bg-gradient-primary` y `shadow-glow` son los building blocks del look.

Componentes seccionales en [src/components/](src/components/) — uno por sección de la landing. La sección "demo" vive en [src/components/LiveDemo/](src/components/LiveDemo/): `WhatsAppMock.tsx` es el mock visual (4 escenarios animados), `Playground.tsx` es el chat real conectado a `/api/maia`, `ProgressBar.tsx` y `RubricBadge.tsx` reflejan el shape JSON.

### Lo que NO existe (y porqué)

- `api/maia.ts` está intencionalmente vacío con un comentario "removed" — la versión actual NO usa edge functions de Vercel. Si vuelves a Vercel, levanta otro adapter como hicimos con `lambda.ts`, no toques `maia-core.ts`.
- No hay tests unitarios. El smoke test de endpoint cubre el flujo crítico; añadir vitest es razonable si el cerebro crece.
- No hay logging persistente — las conversaciones quedan sólo en memoria del cliente. Privacidad por diseño para showcase; si Westfield decide usar esto en clase real habrá que diseñar logging/anonimización (fuera de alcance).
- No hay vector DB ni servicio externo de RAG. Para 5–200 chunks, similitud coseno en memoria sobre el JSON cargado al boot es más simple, gratis y suficiente. Si crece a miles de docs, migrar a OpenSearch / pgvector / Pinecone se hace cambiando sólo `server/rag/retriever.ts` (la lógica de embeddings + el índice quedan iguales).
- No commiteamos `data/maia-index.json` (ver `.gitignore`). Se regenera con `npm run ingest` antes de cada deploy.

## Branding y copy

El sitio es **Westfield-only**. Eliminar cualquier mención a CrearIA o a "propuesta comercial / inversión / TRM / vendor". Voz de Maia en primera persona del producto o segunda persona del estudiante. Este es un showcase del agente como producto, no una propuesta de venta.

## Convenciones del repo

- Comentarios y mensajes de log están en **español**, igual que el copy del sitio. Mantén ese registro al editar.
- TypeScript estricto activado. `npm run typecheck` debe pasar limpio antes de cualquier commit.
- Imports relativos en `server/`, alias `@/` en `src/`.
