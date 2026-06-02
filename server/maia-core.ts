/**
 * Cerebro de Maia — portable a cualquier runtime con `fetch` nativo.
 *
 * Recibe `{history, studentInput}` + un `MaiaEnv` (incluye API key y, opcional,
 * los hooks RAG: `alwaysIncludeDocs` + `retrieve`). Llama a OpenAI Chat
 * Completions y devuelve un MaiaResponse con JSON estructurado.
 *
 * NO importa fs, NO importa Hono. Eso lo hace montable en:
 *   - Node local con Hono (server/index.ts)
 *   - AWS Lambda (server/lambda.ts)
 *   - cualquier edge runtime con fetch.
 *
 * El adaptador externo se encarga de:
 *   - cargar el índice RAG desde disco (`server/rag/index-loader.ts`)
 *   - construir la closure `retrieve` (`server/rag/runtime.ts`)
 *   - inyectar ambos en `MaiaEnv`.
 */

import { buildSystemPrompt } from "./context";
import type {
  AlwaysIncludeDoc,
  RetrievedChunk,
  RetrieveFn,
} from "./rag/types";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

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

export interface MaiaRequestBody {
  history: MaiaTurn[];
  studentInput: string;
  /** Pregunta de introspección activa según el cliente (1, 2 o 3). Default 1. */
  currentQuestion?: 1 | 2 | 3;
  /**
   * Cantidad de intercambios estudiante↔Maia ya completados sobre la
   * pregunta activa, incluyendo el envío actual. Lo manda el frontend
   * para que el modelo lo use en la "Dinámica de avance" del system prompt.
   * Default 0.
   */
  turnsForCurrentQuestion?: number;
}

/** Umbral duro: si el modelo no avanza tras este número de intercambios, el backend fuerza el avance. */
const FORCE_ADVANCE_AT = 5;

export interface MaiaEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  /** Opcional: Azure OpenAI o proxies. Default: api.openai.com */
  OPENAI_BASE_URL?: string;
  /** Docs que se inyectan en cada prompt (rúbrica, introspección, etc.) */
  alwaysIncludeDocs?: AlwaysIncludeDoc[];
  /** Closure construida por el adaptador. Si está, hacemos RAG por turno. */
  retrieve?: RetrieveFn;
}

/* ------------------------------------------------------------------ */
/* Validador anti-jailbreak                                            */
/* ------------------------------------------------------------------ */

const NOTES_LEAK_MARKERS = [
  "Notas del instructor",
  "notas del profesor",
  "Vías de Respuesta",
  "Reflexiones que Puede Suscitar",
];

function looksLikeNotesLeak(text: string): boolean {
  return NOTES_LEAK_MARKERS.some((m) =>
    text.toLowerCase().includes(m.toLowerCase()),
  );
}

/* ------------------------------------------------------------------ */
/* Función principal                                                   */
/* ------------------------------------------------------------------ */

export async function askMaia(
  body: MaiaRequestBody,
  env: MaiaEnv,
): Promise<MaiaResponse> {
  const history = Array.isArray(body.history) ? body.history.slice(-30) : [];
  const studentInput = (body.studentInput ?? "").toString().slice(0, 4000);
  const currentQuestion = clampQuestion(body.currentQuestion ?? 1);
  const turnsForCurrentQuestion = Math.max(
    0,
    Math.floor(Number(body.turnsForCurrentQuestion ?? 0)),
  );

  const fullHistory: MaiaTurn[] = studentInput
    ? [...history, { role: "student", content: studentInput }]
    : history;

  if (!env.OPENAI_API_KEY) {
    return buildFallbackResponse(fullHistory);
  }

  try {
    // Construimos el query de RAG con lo último del estudiante + el último
    // turno de Maia (para mantener foco temático).
    const ragQuery = buildRagQuery(history, studentInput);
    const retrievedChunks = await safeRetrieve(env.retrieve, ragQuery);

    const result = await callOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      history,
      studentInput,
      alwaysIncludeDocs: env.alwaysIncludeDocs ?? [],
      retrievedChunks,
      turnState: { currentQuestion, turnsForCurrentQuestion },
    });

    if (looksLikeNotesLeak(result.message)) {
      result.message =
        "No puedo compartir el material interno del instructor. Volvamos a tu argumento: ¿qué evidencia concreta del caso lo sostiene?";
    }

    // Red de seguridad: si el modelo no avanzó pese a llevar FORCE_ADVANCE_AT
    // intercambios sobre la misma pregunta, lo forzamos. Si ya estamos en la
    // pregunta 3 también forzamos el cierre con resumen.
    if (turnsForCurrentQuestion >= FORCE_ADVANCE_AT) {
      if (currentQuestion < 3 && !result.advance_to_next_question) {
        result.advance_to_next_question = true;
      }
      if (currentQuestion === 3 && !result.is_final_summary) {
        result.is_final_summary = true;
      }
    }

    return result;
  } catch (err) {
    console.error("Maia/OpenAI error:", err);
    const fb = buildFallbackResponse(fullHistory);
    fb.message = `[error temporal con OpenAI] ${fb.message}`;
    return fb;
  }
}

function buildRagQuery(history: MaiaTurn[], studentInput: string): string {
  const parts: string[] = [];
  if (studentInput) parts.push(studentInput);
  const lastMaia = [...history].reverse().find((t) => t.role === "maia");
  if (lastMaia) parts.push(lastMaia.content);
  return parts.join("\n").slice(0, 2000);
}

async function safeRetrieve(
  retrieve: RetrieveFn | undefined,
  query: string,
): Promise<RetrievedChunk[]> {
  if (!retrieve || !query) return [];
  try {
    return await retrieve(query);
  } catch (err) {
    console.error("Maia/retrieve falló, sigo sin RAG:", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Cliente OpenAI (Chat Completions API)                               */
/* ------------------------------------------------------------------ */

interface CallArgs {
  apiKey: string;
  model: string;
  baseUrl: string;
  history: MaiaTurn[];
  studentInput: string;
  alwaysIncludeDocs: AlwaysIncludeDoc[];
  retrievedChunks: RetrievedChunk[];
  turnState: {
    currentQuestion: 1 | 2 | 3;
    turnsForCurrentQuestion: number;
  };
}

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenAI(args: CallArgs): Promise<MaiaResponse> {
  const {
    apiKey,
    model,
    baseUrl,
    history,
    studentInput,
    alwaysIncludeDocs,
    retrievedChunks,
    turnState,
  } = args;

  const systemPrompt = buildSystemPrompt({
    alwaysIncludeDocs,
    retrievedChunks,
    turnState,
  });

  const messages: OpenAIChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map<OpenAIChatMessage>((turn) => ({
      role: turn.role === "student" ? "user" : "assistant",
      content: turn.content,
    })),
  ];

  if (studentInput) {
    messages.push({ role: "user", content: studentInput });
  } else if (history.length === 0) {
    messages.push({
      role: "user",
      content: "Hola Maia, vamos a empezar.",
    });
  }

  const payload = {
    model,
    messages,
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 800,
    response_format: { type: "json_object" as const },
  };

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string };
      finish_reason?: string;
    }>;
  };

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Respuesta vacía de OpenAI");

  return safeParseMaiaJson(text);
}

/* ------------------------------------------------------------------ */
/* Parseo defensivo del JSON                                           */
/* ------------------------------------------------------------------ */

function safeParseMaiaJson(raw: string): MaiaResponse {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let obj: Partial<MaiaResponse> = {};
  try {
    obj = JSON.parse(stripped) as Partial<MaiaResponse>;
  } catch {
    return {
      message: stripped,
      rubric_level: "satisfactorio",
      current_question: 1,
      advance_to_next_question: false,
      is_final_summary: false,
      unresolved_points: [],
    };
  }

  return {
    message: typeof obj.message === "string" ? obj.message : "",
    rubric_level: isRubricLevel(obj.rubric_level)
      ? obj.rubric_level
      : "satisfactorio",
    current_question: clampQuestion(obj.current_question),
    advance_to_next_question: Boolean(obj.advance_to_next_question),
    is_final_summary: Boolean(obj.is_final_summary),
    unresolved_points: Array.isArray(obj.unresolved_points)
      ? obj.unresolved_points.map(String).slice(0, 10)
      : [],
  };
}

function isRubricLevel(v: unknown): v is MaiaRubricLevel {
  return (
    v === "muy_pobre" ||
    v === "pobre" ||
    v === "satisfactorio" ||
    v === "superior" ||
    v === "excelente"
  );
}

function clampQuestion(v: unknown): 1 | 2 | 3 {
  return v === 2 ? 2 : v === 3 ? 3 : 1;
}

/* ------------------------------------------------------------------ */
/* Fallback offline (sin OpenAI o sin índice RAG)                      */
/* ------------------------------------------------------------------ */

const FALLBACK_OPENINGS: Record<1 | 2 | 3, string> = {
  1: "Empezamos. Para vos, ¿dónde está exactamente el problema central del caso, y cuáles son las alternativas reales?",
  2: "Pasemos a la segunda pregunta. ¿Qué aporta la plataforma a quienes participan, y cómo se puede aprovechar ese potencial?",
  3: "Última pregunta. Si la organización fuera 100 o 1.000 veces más grande, ¿habría un efecto positivo para el planeta y la comunidad? Defendelo.",
};

const FALLBACK_FOLLOWUPS = [
  "¿Qué supuesto estás haciendo aquí? ¿Siempre se cumple?",
  "¿Qué evidencia del caso respalda eso? Dame fuente y página.",
  "¿Cómo conectas esa idea con tu conclusión? Hay un salto lógico.",
  "¿Qué pasaría si una de esas variables cambia? ¿La conclusión sigue?",
  "¿Cómo lo vería un crítico que no comparte tu tesis?",
  "¿Qué diferencia hay entre lo que estás describiendo y un síntoma del problema?",
];

export function buildFallbackResponse(history: MaiaTurn[]): MaiaResponse {
  const studentTurns = history.filter((h) => h.role === "student").length;
  const currentQuestion = (Math.min(3, Math.floor(studentTurns / 4) + 1) || 1) as
    | 1
    | 2
    | 3;

  if (history.length === 0) {
    return {
      message: FALLBACK_OPENINGS[1],
      rubric_level: "satisfactorio",
      current_question: 1,
      advance_to_next_question: false,
      is_final_summary: false,
      unresolved_points: [],
      fallback: true,
    };
  }

  const lastWasStudent = history[history.length - 1]?.role === "student";
  const followup =
    FALLBACK_FOLLOWUPS[
      (history.length + studentTurns) % FALLBACK_FOLLOWUPS.length
    ];

  return {
    message: lastWasStudent ? followup : FALLBACK_OPENINGS[currentQuestion],
    rubric_level: "satisfactorio",
    current_question: currentQuestion,
    advance_to_next_question: false,
    is_final_summary: false,
    unresolved_points: [],
    fallback: true,
  };
}
