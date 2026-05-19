/**
 * Parsers de PDF y DOCX a texto plano.
 *
 * Estos sí usan dependencias Node-only (`pdf-parse`, `mammoth`). Por eso
 * viven en scripts/ — corren sólo durante `npm run ingest`, nunca en el
 * runtime del endpoint. El runtime sólo lee el JSON generado.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";

// pdf-parse exporta CJS; tsx maneja la interop pero TypeScript necesita un import default.
import pdfParse from "pdf-parse";

export interface ParsedDoc {
  file: string;
  text: string;
  pages?: number;
}

export async function parseDoc(filePath: string): Promise<ParsedDoc> {
  const ext = path.extname(filePath).toLowerCase();
  const file = path.basename(filePath);

  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    const data = await pdfParse(buf);
    return { file, text: normalizeWhitespace(data.text), pages: data.numpages };
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return { file, text: normalizeWhitespace(result.value) };
  }

  if (ext === ".txt" || ext === ".md") {
    const text = await fs.readFile(filePath, "utf-8");
    return { file, text: normalizeWhitespace(text) };
  }

  throw new Error(
    `Extensión no soportada: ${ext} en ${file}. Soportadas: .pdf .docx .txt .md`,
  );
}

/**
 * Normaliza espacios, saltos múltiples y caracteres de control sin perder
 * estructura de párrafos.
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ") // nbsp
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
