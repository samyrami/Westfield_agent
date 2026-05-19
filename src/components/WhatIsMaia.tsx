import { motion } from "framer-motion";
import { Brain, MessagesSquare, Users } from "lucide-react";
import { Section } from "./Section";

const PILLARS = [
  {
    n: "01",
    icon: Brain,
    title: "Análisis del trabajo académico",
    body: "Maia carga el caso, las rúbricas y los criterios de evaluación. Lee la respuesta del estudiante y detecta supuestos débiles, saltos lógicos y zonas sin evidencia.",
  },
  {
    n: "02",
    icon: MessagesSquare,
    title: "Método socrático",
    body: 'Actúa como "abogado del diablo": no entrega soluciones, formula preguntas estratégicas que obligan al estudiante a justificar, profundizar y reformular.',
  },
  {
    n: "03",
    icon: Users,
    title: "Mentor 1:1 a escala",
    body: "Cada estudiante recibe un acompañamiento individual disponible 24/7, con la profundidad de un tutor humano y la escala que un aula real no permite.",
  },
];

export function WhatIsMaia() {
  return (
    <Section
      id="about"
      eyebrow="Qué es Maia"
      title={
        <>
          Un mentor académico que <span className="gradient-text-primary">cuestiona</span>,
          no que responde.
        </>
      }
      description="Maia es el agente de IA de Westfield Business School que conduce a cada estudiante por un método socrático estructurado. Tres piezas que trabajan juntas:"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {PILLARS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card group relative overflow-hidden p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary-glow">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-mono text-muted">{p.n}</span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-primary opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}
