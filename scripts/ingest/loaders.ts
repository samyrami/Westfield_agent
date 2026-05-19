/**
 * Loaders pluggables — interfaz común para distintos orígenes de docs.
 *
 * Hoy: `LocalFolderLoader` lee desde docs/ en disco.
 * Mañana: `GoogleDriveLoader` traerá lo mismo desde una carpeta compartida.
 *
 * Para añadir un loader nuevo: implementa la interfaz `DocLoader` y referencia
 * su nombre en manifest.json#loader. La factory `getLoader()` resuelve.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface RawDoc {
  /** Nombre del archivo (sin path) — debe coincidir con `manifest.docs[i].file` */
  file: string;
  /** Path absoluto local desde donde leer el archivo. */
  localPath: string;
}

export interface DocLoader {
  /** Devuelve cada doc del manifest como un path local listo para parsear. */
  fetchDocs(files: string[]): Promise<RawDoc[]>;
}

/**
 * Lee directamente desde docs/ en el repo.
 *
 * Hace match por nombre normalizado a Unicode NFC para tolerar diferencias
 * entre cómo guarda los caracteres acentuados el filesystem (Windows/NTFS
 * suele dejarlos NFC, macOS/HFS los descompone a NFD) y cómo los escribió
 * el editor de turno en el manifest.json.
 */
export class LocalFolderLoader implements DocLoader {
  constructor(private readonly baseDir: string) {}

  async fetchDocs(files: string[]): Promise<RawDoc[]> {
    // Listado de archivos reales en docs/, indexados por nombre NFC.
    let entries: string[];
    try {
      entries = await fs.readdir(this.baseDir);
    } catch (err) {
      throw new Error(
        `No pude leer el directorio ${this.baseDir}: ${err instanceof Error ? err.message : err}`,
      );
    }

    const byNfc = new Map<string, string>();
    for (const entry of entries) {
      byNfc.set(entry.normalize("NFC"), entry);
    }

    const out: RawDoc[] = [];
    for (const file of files) {
      const wantedNfc = file.normalize("NFC");
      const actual = byNfc.get(wantedNfc);
      if (!actual) {
        const available = entries
          .filter((e) => !e.startsWith("."))
          .map((e) => `   - ${e}`)
          .join("\n");
        throw new Error(
          `Archivo no encontrado en ${this.baseDir}: "${file}".\n` +
            `Archivos disponibles:\n${available}\n` +
            `Verifica el manifest o agrega el archivo a docs/.`,
        );
      }
      out.push({ file, localPath: path.join(this.baseDir, actual) });
    }
    return out;
  }
}

/**
 * Stub para cuando migremos a una carpeta de Google Drive compartida.
 *
 * Implementación esperada:
 *  - autenticación vía Service Account (JSON de credenciales en env)
 *  - listar archivos de la carpeta indicada por GOOGLE_DRIVE_FOLDER_ID
 *  - descargarlos a un tmp local
 *  - devolverlos como RawDoc[]
 *
 * Para enchufarlo: instalar googleapis, implementar fetchDocs, y poner
 * "loader": "drive" en manifest.json.
 */
export class GoogleDriveLoader implements DocLoader {
  async fetchDocs(_files: string[]): Promise<RawDoc[]> {
    throw new Error(
      "GoogleDriveLoader no está implementado todavía. Usa loader=local por ahora.",
    );
  }
}

export function getLoader(
  kind: "local" | "drive",
  baseDir: string,
): DocLoader {
  switch (kind) {
    case "local":
      return new LocalFolderLoader(baseDir);
    case "drive":
      return new GoogleDriveLoader();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Loader desconocido: ${String(_exhaustive)}`);
    }
  }
}
