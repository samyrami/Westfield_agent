import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const STATS = [
  { value: "24/7", label: "Disponible cuando el estudiante la necesite" },
  { value: "1:1", label: "Mentoría individual a escala de aula" },
  { value: "100%", label: "Cuestionamiento socrático, cero respuestas" },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative px-6 pt-32 pb-20 md:pt-40 md:pb-28"
    >
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
          </span>
          Demo en vivo · powered by OpenAI
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
        >
          Conoce a{" "}
          <span className="gradient-text-primary">Maia</span>,
          <br className="hidden md:block" />
          tu mentor académico socrático.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted md:text-lg"
        >
          No da respuestas: hace las preguntas correctas. Cuestiona supuestos,
          exige evidencia y reta la lógica de cada estudiante hasta que su
          argumento se sostiene solo. Pruébala con un caso real de Westfield.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-medium text-bg shadow-glow transition-transform hover:scale-[1.02]"
          >
            Probar Maia ahora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 text-sm font-medium text-fg backdrop-blur transition-colors hover:bg-surface"
          >
            <Sparkles className="h-4 w-4 text-secondary" />
            Ver capacidades
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3"
        >
          {STATS.map((s) => (
            <div
              key={s.value}
              className="card px-5 py-6 text-left"
            >
              <div className="text-3xl font-semibold gradient-text-primary">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
