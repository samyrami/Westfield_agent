# Imagen del backend Maia para Railway / AWS App Runner / ECS Fargate /
# cualquier orquestador de containers que hable HTTP.
#
# Pre-condiciones (antes de `docker build`):
#   1. Pasar OPENAI_API_KEY como build arg para que `npm run ingest`
#      pueda generar data/maia-index.json durante el build:
#        docker build --build-arg OPENAI_API_KEY=sk-... -t maia .
#      (En Railway se inyecta automáticamente desde Variables.)
#   2. OPENAI_API_KEY también va en runtime como env var.
#
# El secreto vive sólo en el stage `builder` y se descarta — la imagen
# `runtime` final no lo contiene en sus layers.
#
# Run:      docker run -p 8080:8080 -e OPENAI_API_KEY=sk-... maia
# Health:   curl http://localhost:8080/api/health
#
# Multi-stage:
#   - builder: instala TODAS las deps, corre ingest, compila el front.
#   - runtime: sólo prod deps + tsx + artefactos. Imagen final ~200 MB.

# ---------- builder ---------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Build args (Railway los inyecta desde service Variables).
ARG OPENAI_API_KEY
ARG OPENAI_EMBEDDING_MODEL
ARG OPENAI_BASE_URL

# Cache layer: si package.json no cambia, npm ci se reusa entre builds.
COPY package.json package-lock.json* ./
RUN npm ci

# Resto del código (.dockerignore controla qué entra al contexto).
COPY . .

# Genera data/maia-index.json desde docs/ usando embeddings de OpenAI.
# Falla temprano si no llegó la key — sin RAG el showcase pierde gracia.
RUN if [ -z "$OPENAI_API_KEY" ]; then \
      echo "" && \
      echo "✗ Falta OPENAI_API_KEY como --build-arg." && \
      echo "  En Railway agregala en Settings → Variables." && \
      echo "" && \
      exit 1; \
    fi && \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    OPENAI_EMBEDDING_MODEL=${OPENAI_EMBEDDING_MODEL:-text-embedding-3-small} \
    OPENAI_BASE_URL=$OPENAI_BASE_URL \
    npm run ingest

# Build del front estático → dist/
RUN npm run build

# ---------- runtime ---------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Sólo dependencias de producción. Ingest, parsers PDF/DOCX y esbuild
# se quedan afuera — no se necesitan en runtime.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && \
    npm install --no-save tsx@^4.19.2 && \
    npm cache clean --force

# Artefactos finales
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/data ./data

# Healthcheck nativo de Docker — App Runner lo usa si está configurado.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

EXPOSE 8080
CMD ["npx", "tsx", "server/index.ts"]
