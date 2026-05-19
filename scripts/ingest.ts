/**
 * Ingesta — construye data/maia-index.json a partir de docs/manifest.json.
 *
 *   npm run ingest
 *
 * Pipeline:
 *   1. Lee docs/manifest.json — describe cada doc (tag, visibilidad, always_include, chunk).
 *   2. Pide al loader (local hoy, drive mañana) los archivos físicos.
 *   3. Parsea PDF/DOCX/TXT a texto plano.
 *   4. Docs con always_include=true → entran enteros (sin embedding).
 *      Docs con chunk=true → se trocean + se les calcula embedding.
 *   5. Genera data/maia-index.json con todo (chunks + always_include + retrieval config).
 *
 * Requiere OPENAI_API_KEY en .env.local (carga vía dotenv).
 * Modelo de embeddings: OPENAI_EMBEDDING_MODEL || text-embedding-3-small.
 *
 * Este pipeline es repetible y agnóstico de caso. Cambiá el manifest +
 * los docs en docs/ y volvé a correr `npm run ingest` — Maia se entera al
 * siguiente boot del server.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { promises as fs } from "node:fs";
import path from "node:path";

import { parseDoc } from "./ingest/parsers";
import { splitText } from "./ingest/chunker";
import { getLoader } from "./ingest/loaders";

import {
  embedTexts,
  DEFAULT_EMBEDDING_MODEL,
} from "../server/rag/embeddings";
import type {
  AlwaysIncludeDoc,
  Manifest,
  RagChunk,
  RagIndex,
} from "../server/rag/types";

const DOCS_DIR = path.resolve(process.cwd(), "docs");
const OUT_DIR = path.resolve(process.cwd(), "data");
const OUT_PATH = path.join(OUT_DIR, "maia-index.json");
const MANIFEST_PATH = path.join(DOCS_DIR, "manifest.json");

const BATCH_SIZE = 64; // OpenAI permite hasta 2048, pero 64 es prudente y caben los retries.

async function main(): Promise<void> {
  console.log("→ Maia ingest start");
  console.log(`  docs dir : ${DOCS_DIR}`);
  console.log(`  manifest : ${MANIFEST_PATH}`);
  console.log(`  output   : ${OUT_PATH}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "\n✗ Falta OPENAI_API_KEY en .env.local. No se puede generar embeddings.\n",
    );
    process.exit(1);
  }

  const embeddingModel =
    process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;

  // 1) Manifest
  const manifestRaw = await fs.readFile(MANIFEST_PATH, "utf-8");
  const manifest = JSON.parse(manifestRaw) as Manifest;
  console.log(
    `  contexto : "${manifest.name}" (${manifest.docs.length} docs, loader=${manifest.loader})`,
  );

  // 2) Loader
  const loader = getLoader(manifest.loader, DOCS_DIR);
  const filesToFetch = manifest.docs.map((d) => d.file);
  const fetched = await loader.fetchDocs(filesToFetch);

  // 3) Parsear cada uno
  const parsedByFile = new Map<string, string>();
  for (const raw of fetched) {
    process.stdout.write(`  · parseando ${raw.file} ... `);
    const parsed = await parseDoc(raw.localPath);
    parsedByFile.set(raw.file, parsed.text);
    console.log(`${parsed.text.length} chars`);
  }

  // 4) Separar en always_include vs chunked
  const alwaysInclude: AlwaysIncludeDoc[] = [];
  const chunkPlans: Array<{
    text: string;
    file: string;
    title: string;
    tag: string;
    instructor_only: boolean;
  }> = [];

  for (const doc of manifest.docs) {
    const text = parsedByFile.get(doc.file);
    if (!text) {
      console.warn(`  ⚠ ${doc.file} no fue parseado, lo salteo.`);
      continue;
    }

    if (doc.always_include) {
      alwaysInclude.push({
        doc_file: doc.file,
        doc_title: doc.title,
        doc_tag: doc.tag,
        instructor_only: doc.instructor_only,
        text,
      });
    }

    if (doc.chunk) {
      const pieces = splitText(text, {
        size: manifest.retrieval.chunk_size_chars,
        overlap: manifest.retrieval.chunk_overlap_chars,
      });
      for (const p of pieces) {
        chunkPlans.push({
          text: p,
          file: doc.file,
          title: doc.title,
          tag: doc.tag,
          instructor_only: doc.instructor_only,
        });
      }
    }
  }

  console.log(
    `\n  resumen: ${alwaysInclude.length} doc(s) always_include · ${chunkPlans.length} chunk(s) para embedding`,
  );

  // 5) Embeddings en batch
  const chunks: RagChunk[] = [];
  for (let i = 0; i < chunkPlans.length; i += BATCH_SIZE) {
    const slice = chunkPlans.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `  · embeddings batch ${i / BATCH_SIZE + 1} (${slice.length} chunks) ... `,
    );
    const vectors = await embedTexts(
      slice.map((c) => c.text),
      {
        OPENAI_API_KEY: apiKey,
        OPENAI_EMBEDDING_MODEL: embeddingModel,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
      },
    );
    if (vectors.length !== slice.length) {
      throw new Error(
        `Embeddings: esperaba ${slice.length} vectores, recibí ${vectors.length}`,
      );
    }
    for (let j = 0; j < slice.length; j++) {
      const plan = slice[j];
      chunks.push({
        id: `${plan.file}#${i + j}`,
        doc_file: plan.file,
        doc_title: plan.title,
        doc_tag: plan.tag,
        instructor_only: plan.instructor_only,
        text: plan.text,
        embedding: vectors[j],
      });
    }
    console.log("ok");
  }

  // 6) Persistir
  await fs.mkdir(OUT_DIR, { recursive: true });
  const index: RagIndex = {
    name: manifest.name,
    embedding_model: embeddingModel,
    generated_at: new Date().toISOString(),
    retrieval: manifest.retrieval,
    always_include: alwaysInclude,
    chunks,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(index, null, 2), "utf-8");

  const sizeKb = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1);
  console.log(`\n✓ Índice escrito en ${OUT_PATH} (${sizeKb} KB)`);
  console.log(
    `  ${chunks.length} chunks · ${alwaysInclude.length} always_include · modelo ${embeddingModel}`,
  );
}

main().catch((err) => {
  console.error("\n✗ Ingest falló:", err);
  process.exit(1);
});
