/**
 * Tipos compartidos del subsistema RAG.
 *
 * El índice generado por `npm run ingest` (data/maia-index.json) serializa
 * exactamente esta forma. Si cambias estos tipos, regenera el índice.
 */

export type DocTag =
  | "operating_guide"
  | "rubric"
  | "introspection"
  | "case"
  | "instructor_notes"
  | "reference";

export interface DocMeta {
  /** Nombre del archivo dentro de docs/ */
  file: string;
  /** Título humano para etiquetar el chunk en el prompt */
  title: string;
  /** Categoría — orienta a Maia sobre cómo usar el contenido */
  tag: DocTag | string;
  /** Si true, el doc completo se inyecta verbatim cada turno (no se chunkea) */
  always_include: boolean;
  /** Si true, el doc se trocea y se recupera por similitud */
  chunk: boolean;
  /** Si true, Maia jamás debe revelar el contenido al estudiante */
  instructor_only: boolean;
  /** Descripción libre del manifest */
  description?: string;
}

export interface ManifestRetrieval {
  top_k: number;
  min_similarity: number;
  chunk_size_chars: number;
  chunk_overlap_chars: number;
}

export interface Manifest {
  name: string;
  description?: string;
  docs: DocMeta[];
  retrieval: ManifestRetrieval;
  loader: "local" | "drive";
}

/** Chunk persistido en el índice, con su embedding. */
export interface RagChunk {
  id: string;
  doc_file: string;
  doc_title: string;
  doc_tag: string;
  instructor_only: boolean;
  /** Texto del chunk (utf-8) */
  text: string;
  /** Embedding del texto. Norma L2 = 1 si lo guardamos normalizado. */
  embedding: number[];
}

/** Documento que se inyecta completo cada turno (rubrica, introspección, prompt). */
export interface AlwaysIncludeDoc {
  doc_file: string;
  doc_title: string;
  doc_tag: string;
  instructor_only: boolean;
  text: string;
}

/** Resultado de retrieve(): chunks ordenados por similitud descendente. */
export interface RetrievedChunk {
  chunk: RagChunk;
  similarity: number;
}

/** Forma serializada de data/maia-index.json */
export interface RagIndex {
  /** Identifica el contexto cargado (p. ej. "etsy") */
  name: string;
  /** Modelo usado para los embeddings — el query DEBE usar el mismo */
  embedding_model: string;
  /** Cuándo se generó el índice (ISO) */
  generated_at: string;
  /** Configuración de retrieval — copia de manifest.retrieval para que el runtime no necesite el manifest. */
  retrieval: ManifestRetrieval;
  /** Docs cuyo texto entero se inyecta cada turno. */
  always_include: AlwaysIncludeDoc[];
  /** Chunks indexados para búsqueda por similitud. */
  chunks: RagChunk[];
}

/** Función inyectada en MaiaEnv para hacer retrieve sin acoplar runtime. */
export type RetrieveFn = (query: string) => Promise<RetrievedChunk[]>;
