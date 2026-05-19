/**
 * Smoke test del endpoint /api/maia.
 *
 *   npm run test:endpoint
 *
 * Asume que el server está corriendo en http://localhost:3001.
 * Hace 3 turnos: apertura, una respuesta del estudiante, otra respuesta.
 * Imprime los JSONs devueltos por Maia para que veas que todo encaja.
 */

interface MaiaResponse {
  message: string;
  rubric_level: string;
  current_question: number;
  advance_to_next_question: boolean;
  is_final_summary: boolean;
  unresolved_points: string[];
  fallback?: boolean;
}

interface Turn {
  role: "student" | "maia";
  content: string;
}

const URL = process.env.MAIA_URL || "http://localhost:3001/api/maia";

async function call(history: Turn[], studentInput: string) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, studentInput }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as MaiaResponse;
}

function show(label: string, r: MaiaResponse) {
  console.log("\n" + "—".repeat(60));
  console.log(label);
  console.log("—".repeat(60));
  console.log("modo:", r.fallback ? "fallback offline" : "OpenAI");
  console.log("pregunta actual:", r.current_question);
  console.log("nivel rúbrica:", r.rubric_level);
  console.log("¿avanzar?:", r.advance_to_next_question);
  console.log("¿es resumen final?:", r.is_final_summary);
  console.log("\nMaia:", r.message);
}

async function main() {
  console.log(`→ Probando ${URL}`);

  // Turno 1: apertura
  const r1 = await call([], "");
  show("TURNO 1 — Maia abre", r1);

  // Turno 2: estudiante responde algo flojo
  const history2: Turn[] = [{ role: "maia", content: r1.message }];
  const r2 = await call(
    history2,
    "El problema es que sus ventas en Etsy están estancadas.",
  );
  show("TURNO 2 — estudiante responde flojo", r2);

  // Turno 3: estudiante elabora
  const history3: Turn[] = [
    ...history2,
    {
      role: "student",
      content: "El problema es que sus ventas en Etsy están estancadas.",
    },
    { role: "maia", content: r2.message },
  ];
  const r3 = await call(
    history3,
    "Asumo que su crecimiento debería ser sostenido. La razón es que la pandemia disparó las ventas y ahora la base de comparación está alta, pero también hay miles de competidores nuevos que copian sus diseños.",
  );
  show("TURNO 3 — estudiante elabora con argumento", r3);

  console.log("\n✓ Smoke test OK\n");
}

main().catch((e) => {
  console.error("\n✗ Smoke test falló:", e);
  process.exit(1);
});
