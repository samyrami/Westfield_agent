import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { QUESTION_LABELS } from "@/lib/maiaClient";

interface Props {
  current: 1 | 2 | 3;
  isFinal: boolean;
}

/**
 * Barra de progreso entre las 3 preguntas de introspección.
 */
export function ProgressBar({ current, isFinal }: Props) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n, idx) => {
        const isComplete = isFinal || n < current;
        const isActive = !isFinal && n === current;
        return (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors",
                isComplete
                  ? "border-secondary bg-secondary text-bg"
                  : isActive
                    ? "border-primary bg-primary/15 text-primary-glow"
                    : "border-border bg-surface/50 text-muted",
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : n}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wider",
                isActive
                  ? "text-fg"
                  : isComplete
                    ? "text-secondary/80"
                    : "text-muted",
              )}
            >
              {QUESTION_LABELS[n as 1 | 2 | 3]}
            </div>
            {idx < 2 && (
              <div
                className={cn(
                  "hidden h-px flex-1 bg-border sm:block",
                  isComplete && "bg-secondary/60",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
