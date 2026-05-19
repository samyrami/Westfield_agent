/**
 * Splitter de texto a chunks de tamaño aproximado, con overlap.
 *
 * Estrategia: corte por párrafo + frase. Si un párrafo cabe entero en el
 * presupuesto, lo dejamos sin partir. Si excede, lo partimos por punto/cierre.
 * El overlap mantiene contexto al borde — clave para que el retrieve no
 * pierda el hilo cuando una idea cruza dos chunks.
 *
 * No usa tokenizer real: trabaja por caracteres (≈ 4 chars/token en español).
 * Eso es suficiente para mantener chunks bien por debajo del límite de
 * embedding (8192 tokens en text-embedding-3-small).
 */

export interface ChunkOpts {
  size: number;
  overlap: number;
}

export function splitText(text: string, opts: ChunkOpts): string[] {
  const { size, overlap } = opts;
  if (size <= 0) throw new Error("chunk size debe ser > 0");
  if (overlap < 0 || overlap >= size) {
    throw new Error("overlap debe ser >=0 y < size");
  }

  const normalized = text.trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= size) return [normalized];

  // Partir por párrafos primero.
  const paragraphs = normalized.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);

  const blocks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= size) {
      blocks.push(p);
    } else {
      // Párrafo gigante → partimos por frase.
      blocks.push(...splitBySentence(p, size));
    }
  }

  // Acumular blocks hasta llenar `size`, manteniendo overlap.
  const chunks: string[] = [];
  let current = "";
  for (const b of blocks) {
    if (!current) {
      current = b;
      continue;
    }
    if (current.length + 2 + b.length <= size) {
      current += "\n\n" + b;
    } else {
      chunks.push(current);
      current = tail(current, overlap) + b;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitBySentence(p: string, size: number): string[] {
  // Cortes en . ! ? — sin perder el separador.
  const parts = p
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buf = "";
  for (const s of parts) {
    if (!buf) {
      buf = s;
      continue;
    }
    if (buf.length + 1 + s.length <= size) {
      buf += " " + s;
    } else {
      out.push(buf);
      buf = s.length > size ? hardSplit(s, size) : s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function hardSplit(s: string, size: number): string {
  // Para frases monstruosas (ej. tablas pegadas) cortamos crudo.
  if (s.length <= size) return s;
  return s.slice(0, size);
}

function tail(s: string, n: number): string {
  if (n <= 0 || s.length <= n) return "";
  return s.slice(-n);
}
