import { cn } from "@/lib/cn";
import {
  RUBRIC_LABELS,
  RUBRIC_ORDER,
  type MaiaRubricLevel,
} from "@/lib/maiaClient";

const COLORS: Record<MaiaRubricLevel, string> = {
  muy_pobre: "bg-red-500/15 text-red-300 border-red-500/30",
  pobre: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  satisfactorio: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30",
  superior: "bg-secondary/20 text-secondary border-secondary/40",
  excelente: "bg-primary/20 text-primary-glow border-primary/40",
};

interface Props {
  level: MaiaRubricLevel | null;
}

/**
 * Badge sutil que muestra el nivel rúbrica del estudiante en la última respuesta.
 * Sirve para que se vea el feedback continuo, sin ser intimidante.
 */
export function RubricBadge({ level }: Props) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-muted">
        Esperando respuesta…
      </span>
    );
  }

  const idx = RUBRIC_ORDER.indexOf(level);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        COLORS[level],
      )}
      title={`Defensa del análisis: ${RUBRIC_LABELS[level]}`}
    >
      <span className="flex items-center gap-0.5">
        {RUBRIC_ORDER.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i <= idx ? "bg-current" : "bg-current/20",
            )}
          />
        ))}
      </span>
      {RUBRIC_LABELS[level]}
    </span>
  );
}
