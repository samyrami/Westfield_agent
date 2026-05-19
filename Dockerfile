# Imagen del backend Maia para AWS App Runner / ECS Fargate / cualquier
# orquestador de containers que hable HTTP.
#
# Pre-condiciones (antes de `docker build`):
#   1. Ya corriste `npm run ingest` y existe data/maia-index.json
#      (ese archivo SÍ se copia al build context — ver .dockerignore).
#   2. La OPENAI_API_KEY NO va al build, va en runtime como env var.
#
# Build:    docker build -t maia .
# Run:      docker run -p 8080:8080 --env-file .env.local maia
# Health:   curl http://localhost:8080/api/health
#
# Multi-stage:
#   - builder: instala TODAS las deps, compila el front (dist/).
#   - runtime: sólo prod deps + tsx + artefactos. Imagen final ~200 MB.

# ---------- builder ---------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Cache layer: si package.json no cambia, npm ci se reusa entre builds.
COPY package.json package-lock.json* ./
RUN npm ci

# Resto del código (.dockerignore controla qué entra al contexto).
COPY . .

# Pre-condición dura: el índice RAG tiene que estar pre-generado.
# Falla temprano con mensaje útil si el usuario olvidó `npm run ingest`.
RUN test -f data/maia-index.json || ( \
      echo "" && \
      echo "✗ Falta data/maia-index.json en el build context." && \
      echo "  Corré 'npm run ingest' en el host antes de 'docker build'." && \
      echo "" && \
      exit 1 \
    )

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
