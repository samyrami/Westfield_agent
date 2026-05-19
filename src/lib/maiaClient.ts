/**
 * Cliente del endpoint /api/maia.
 * Define los tipos compartidos con el server y un wrapper de fetch.
 */

export type MaiaRubricLevel =
  | "muy_pobre"
  | "pobre"
  | "satisfactorio"
  | "superior"
  | "excelente";

export interface MaiaTurn {
  role: "student" | "maia";
  content: string;
}

export interface MaiaResponse {
  message: string;
  rubric_level: MaiaRubricLevel;
  current_question: 1 | 2 | 3;
  advance_to_next_question: boolean;
  is_final_summary: boolean;
  unresolved_points: string[];
  fallback?: boolean;
}

export async function askMaia(args: {
  history: MaiaTurn[];
  studentInput: string;
  signal?: AbortSignal;
}): Promise<MaiaResponse> {
  const res = await fetch("/api/maia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history: args.history,
      studentInput: args.studentInput,
    }),
    signal: args.signal,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Maia ${res.status}: ${errBody.slice(0, 200)}`);
  }

  return (await res.json()) as MaiaResponse;
}

export const RUBRIC_LABELS: Record<MaiaRubricLevel, string> = {
  muy_pobre: "Muy pobre",
  pobre: "Pobre",
  satisfactorio: "Satisfactorio",
  superior: "Superior",
  excelente: "Excelente",
};

export const RUBRIC_ORDER: MaiaRubricLevel[] = [
  "muy_pobre",
  "pobre",
  "satisfactorio",
  "superior",
  "excelente",
];

export const QUESTION_LABELS: Record<1 | 2 | 3, string> = {
  1: "Problema y alternativas",
  2: "Aporte de Etsy a vendedores",
  3: "Escala 100×–1000× e impacto",
};
