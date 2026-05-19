import { motion } from "framer-motion";
import { Section } from "./Section";

const AXES = [
  { tag: "Claridad", q: "¿Qué quieres decir exactamente con esto?" },
  { tag: "Supuestos", q: "¿Qué estás asumiendo aquí?" },
  { tag: "Evidencia", q: "¿Qué evidencia respalda esta afirmación?" },
  { tag: "Lógica", q: "¿Cómo conectas esta idea con tu conclusión?" },
  { tag: "Profundidad", q: "¿Qué pasaría si esta variable cambia?" },
  { tag: "Perspectiva", q: "¿Cómo lo vería un crítico?" },
];

export function HowItThinks() {
  return (
    <Section
      id="methodology"
      eyebrow="Cómo piensa Maia"
      title={
        <>
          Seis ejes de cuestionamiento, una sola{" "}
          <span className="gradient-text-primary">pregunta a la vez</span>.
        </>
      }
      description="Cada respuesta del estudiante pasa por un análisis interno: Maia identifica la debilidad más relevante y elige el eje socrático adecuado. Sólo avanza a la siguiente pregunta cuando la defensa alcanza nivel Superior en la rúbrica."
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* Diagrama */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card relative overflow-hidden p-6"
        >
          <Diagram />
        </motion.div>

        {/* 6 ejes */}
        <div className="grid gap-3 sm:grid-cols-2">
          {AXES.map((a, i) => (
            <motion.div
              key={a.tag}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="card p-4"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-secondary">
                {a.tag}
              </div>
              <div className="text-sm text-fg/90">"{a.q}"</div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Diagrama SVG inline del flujo socrático */
function Diagram() {
  return (
    <svg
      viewBox="0 0 480 360"
      className="h-auto w-full"
      role="img"
      aria-label="Flujo del método socrático de Maia"
    >
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(211 62% 51%)" />
          <stop offset="100%" stopColor="hsl(78 56% 51%)" />
        </linearGradient>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="hsl(211 62% 65%)" />
        </marker>
      </defs>

      {/* Nodo 1 — Pregunta de introspección */}
      <Node x={40} y={40} w={160} h={50} title="Pregunta introspección" sub="(1 de 3)" />

      {/* Nodo 2 — Respuesta del estudiante */}
      <Node x={280} y={40} w={160} h={50} title="Respuesta estudiante" />

      {/* Nodo 3 — Detector de debilidades */}
      <Node x={160} y={140} w={160} h={50} title="Análisis de debilidad" accent />

      {/* Nodo 4 — Pregunta socrática */}
      <Node x={40} y={240} w={160} h={50} title="Pregunta socrática" sub="(eje elegido)" />

      {/* Nodo 5 — Rúbrica */}
      <Node x={280} y={240} w={160} h={50} title="Nivel rúbrica" sub="¿Superior?" accent />

      {/* Flechas */}
      <Arrow from={[200, 65]} to={[280, 65]} />
      <Arrow from={[360, 90]} to={[280, 140]} />
      <Arrow from={[240, 190]} to={[200, 240]} />
      <Arrow from={[200, 265]} to={[280, 265]} />
      <Arrow from={[360, 240]} to={[300, 90]} dashed />
      <Arrow from={[360, 290]} to={[120, 290]} dashed loop />

      {/* Etiquetas */}
      <text x="240" y="332" fontSize="11" fill="hsl(78 56% 60%)" textAnchor="middle">
        Si Superior → siguiente pregunta de introspección
      </text>
    </svg>
  );
}

interface NodeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: boolean;
}

function Node({ x, y, w, h, title, sub, accent }: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill="hsl(230 40% 8% / 0.8)"
        stroke={accent ? "url(#grad)" : "hsl(230 30% 25%)"}
        strokeWidth={accent ? 1.5 : 1}
      />
      <text
        x={x + w / 2}
        y={y + (sub ? 22 : h / 2 + 4)}
        fontSize="13"
        fontWeight="600"
        fill="white"
        textAnchor="middle"
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + 38}
          fontSize="10"
          fill="hsl(230 10% 65%)"
          textAnchor="middle"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

interface ArrowProps {
  from: [number, number];
  to: [number, number];
  dashed?: boolean;
  loop?: boolean;
}

function Arrow({ from, to, dashed, loop }: ArrowProps) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const path = loop
    ? `M${x1},${y1} Q${x1 + 30},${y1 + 30} ${(x1 + x2) / 2},${y1 + 20} T${x2},${y2}`
    : `M${x1},${y1} L${x2},${y2}`;
  return (
    <path
      d={path}
      stroke="hsl(211 62% 65%)"
      strokeWidth={1.5}
      fill="none"
      strokeDasharray={dashed ? "4 4" : undefined}
      markerEnd="url(#arrow)"
      opacity={0.85}
    />
  );
}
