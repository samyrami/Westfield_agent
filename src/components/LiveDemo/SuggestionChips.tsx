import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

/**
 * Chips de sugerencia contextual al pie del chat de Maia.
 * Al hacer click, llenan el textarea — el estudiante puede editar antes de enviar.
 *
 * Las sugerencias dependen de qué pregunta de introspección está activa.
 * No reemplazan al pensamiento del estudiante: son arrancadores para showcase.
 */

const SUGGESTIONS_BY_QUESTION: Record<1 | 2 | 3, string[]> = {
  1: [
    "El problema es que sus ventas en Etsy están estancadas tras un crecimiento meteórico.",
    "El problema central es la dependencia de Etsy: Mariola no tiene canal propio.",
    "El problema es la competencia: miles de vendedores copian sus diseños.",
  ],
  2: [
    "Etsy le da audiencia masiva pero le cobra comisiones y se queda con la marca.",
    "Aporta credibilidad de comunidad artesanal y pagos seguros, no clientes propios.",
    "Lo que aporta es tráfico, pero ese activo es de Etsy, no transferible a su marca.",
  ],
  3: [
    "Sí, porque más artesanos significa menos producción industrial masiva.",
    "Difícil: a esa escala dejaría de ser artesanal y se vuelve un mass-market disfrazado.",
    "Depende del efecto rebote: más demanda agregada podría aumentar la huella total.",
  ],
};

interface Props {
  currentQuestion: 1 | 2 | 3;
  disabled?: boolean;
  onPick: (text: string) => void;
}

export function SuggestionChips({ currentQuestion, disabled, onPick }: Props) {
  const items = SUGGESTIONS_BY_QUESTION[currentQuestion];

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
        <Lightbulb className="h-3 w-3 text-secondary" />
        Sugerencias para empezar
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((text, i) => (
          <motion.button
            key={`${currentQuestion}-${i}`}
            type="button"
            onClick={() => onPick(text)}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.02 }}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            className="rounded-full border border-border bg-bg/40 px-3 py-1.5 text-[12px] leading-snug text-fg/85 transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg/40 disabled:hover:text-fg/85"
            title={text}
          >
            {shortLabel(text)}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function shortLabel(text: string): string {
  // Tomamos las primeras ~9 palabras para que el chip no quede gigante
  const words = text.split(/\s+/);
  if (words.length <= 9) return text;
  return words.slice(0, 9).join(" ") + "…";
}
