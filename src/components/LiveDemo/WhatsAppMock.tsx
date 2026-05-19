import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, CheckCheck, Phone } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Datos de los 4 escenarios — replican los del sitio original         */
/* ------------------------------------------------------------------ */

interface Msg {
  from: "maia" | "student";
  text: string;
  /** ms desde el inicio del escenario */
  delay: number;
}

interface Scenario {
  id: string;
  tab: string;
  title: string;
  caption: string;
  messages: Msg[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "case",
    tab: "Análisis de caso",
    title: "Caso Etsy — Mariola Onetti",
    caption: "Pregunta 1 de introspección · Eje: supuestos",
    messages: [
      {
        from: "maia",
        text: "Hola. Empezamos con el caso de Mariola. Para ti, ¿dónde está exactamente su problema?",
        delay: 400,
      },
      {
        from: "student",
        text: "El problema es que sus ventas en Etsy están estancadas.",
        delay: 2200,
      },
      {
        from: "maia",
        text: "Estás describiendo un síntoma. ¿Qué supuestos haces para llamarlo problema y no consecuencia?",
        delay: 4200,
      },
      {
        from: "student",
        text: "Asumo que su crecimiento debería ser sostenido…",
        delay: 6400,
      },
      {
        from: "maia",
        text: "¿Y ese supuesto siempre se cumple en marketplaces saturados? Dame una razón.",
        delay: 8400,
      },
    ],
  },
  {
    id: "thesis",
    tab: "Tesis académica",
    title: "Defensa de marco teórico",
    caption: "Eje: lógica y evidencia",
    messages: [
      {
        from: "maia",
        text: "Tu marco teórico cita TBL como eje. ¿Qué evidencia conecta TBL con la decisión que propones para Mariola?",
        delay: 400,
      },
      {
        from: "student",
        text: "Que el negocio debe equilibrar Personas, Planeta y Beneficio.",
        delay: 2400,
      },
      {
        from: "maia",
        text: "Eso es la definición. ¿Qué dato del caso apoya que la decisión moverá las tres líneas a la vez?",
        delay: 4400,
      },
      {
        from: "student",
        text: "El dato sobre artesanos en Etsy.",
        delay: 6800,
      },
      {
        from: "maia",
        text: "¿Cuál exactamente, y de qué página? Necesito la fuente.",
        delay: 8800,
      },
    ],
  },
  {
    id: "memory",
    tab: "Memoria conversacional",
    title: "Continuidad entre sesiones",
    caption: "Recordando errores previos del estudiante",
    messages: [
      {
        from: "maia",
        text: "La sesión pasada saltaste de competencia a estancamiento sin conectarlos. ¿Lo conectas hoy?",
        delay: 400,
      },
      {
        from: "student",
        text: "Sí, la competencia genera saturación de oferta y eso baja la conversión.",
        delay: 2400,
      },
      {
        from: "maia",
        text: "Mejor. ¿Qué supuesto sobre la conversión estás haciendo que la sesión pasada no aclaraste?",
        delay: 5000,
      },
      {
        from: "student",
        text: "Que la conversión depende sólo del catálogo competidor.",
        delay: 7600,
      },
      {
        from: "maia",
        text: "¿Y si la conversión también depende del SEO interno de Etsy? ¿Cómo lo descartas?",
        delay: 9600,
      },
    ],
  },
  {
    id: "defense",
    tab: "Defensa de postura",
    title: "Pregunta 3 — escala e impacto",
    caption: "Eje: profundidad y perspectiva",
    messages: [
      {
        from: "maia",
        text: "Si Etsy fuera 1.000× más grande, ¿el efecto sobre el planeta sería positivo?",
        delay: 400,
      },
      {
        from: "student",
        text: "Sí, porque más artesanos significa menos producción industrial.",
        delay: 2400,
      },
      {
        from: "maia",
        text: "¿Cómo descartas el efecto rebote: más demanda agregada que crece la huella total?",
        delay: 4600,
      },
      {
        from: "student",
        text: "No lo había pensado…",
        delay: 7000,
      },
      {
        from: "maia",
        text: "Justamente ese es el ejercicio. Reformula tu postura considerándolo.",
        delay: 8800,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export function WhatsAppMock() {
  const [tabId, setTabId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === tabId)!;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
      {/* Lista de tabs */}
      <div className="order-2 flex flex-col gap-2 lg:order-1">
        {SCENARIOS.map((s) => {
          const active = s.id === tabId;
          return (
            <button
              key={s.id}
              onClick={() => setTabId(s.id)}
              className={cn(
                "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-surface/40 hover:border-border/80 hover:bg-surface/70",
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  active ? "text-primary-glow" : "text-muted",
                )}
              >
                {s.tab}
              </div>
              <div className="mt-1 text-sm font-medium text-fg">{s.title}</div>
              <div className="mt-0.5 text-xs text-muted">{s.caption}</div>
            </button>
          );
        })}
      </div>

      {/* Phone */}
      <div className="order-1 mx-auto w-full max-w-[360px] lg:order-2">
        <Phone_ scenario={scenario} key={scenario.id} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone mock                                                          */
/* ------------------------------------------------------------------ */

function Phone_({ scenario }: { scenario: Scenario }) {
  const [visible, setVisible] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);

  // Replay automático cuando cambia el escenario
  useEffect(() => {
    setVisible([]);
    setTyping(false);
    const timers: number[] = [];

    scenario.messages.forEach((m, i) => {
      // "escribiendo" 800ms antes de cada mensaje de Maia
      if (m.from === "maia") {
        timers.push(
          window.setTimeout(() => setTyping(true), Math.max(0, m.delay - 800)),
        );
      }
      timers.push(
        window.setTimeout(() => {
          setVisible((prev) => [...prev, m]);
          if (m.from === "maia") setTyping(false);
          // último mensaje → loop
          if (i === scenario.messages.length - 1) {
            timers.push(
              window.setTimeout(() => {
                setVisible([]);
              }, 4000),
            );
            timers.push(
              window.setTimeout(() => {
                // re-trigger by toggling — simulado vía state vacío arriba
                // (el useEffect no se re-ejecuta solo, pero el reset visual basta)
              }, 4500),
            );
          }
        }, m.delay),
      );
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [scenario]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-[40px] border border-border bg-[#0d1417] p-3 shadow-2xl"
      style={{
        boxShadow:
          "0 25px 60px -15px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {/* notch */}
      <div className="mx-auto mb-2 mt-1 h-1 w-16 rounded-full bg-white/10" />

      <div className="overflow-hidden rounded-[28px] bg-[#0b141a]">
        {/* header WhatsApp */}
        <div className="flex items-center gap-3 bg-[#1f2c33] px-4 py-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-bg font-semibold">
            M
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Maia · Westfield</div>
            <div className="text-[11px] text-white/60">
              {typing ? "escribiendo…" : "en línea"}
            </div>
          </div>
          <Phone className="h-4 w-4 text-white/60" />
        </div>

        {/* mensajes */}
        <div
          className="relative h-[360px] space-y-2 overflow-y-auto px-3 py-3"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(11,20,26,1), rgba(11,20,26,0.95)), radial-gradient(circle at 30% 20%, rgba(43,123,196,0.10), transparent 60%)",
          }}
        >
          <AnimatePresence initial={false}>
            {visible.map((m, i) => (
              <motion.div
                key={`${scenario.id}-${i}`}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex",
                  m.from === "student" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug",
                    m.from === "student"
                      ? "rounded-br-sm bg-[#005c4b] text-white"
                      : "rounded-bl-sm bg-[#202c33] text-white/95",
                  )}
                >
                  {m.text}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/50">
                    {timeNow()}
                    {m.from === "student" && (
                      <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                    )}
                    {m.from === "maia" && <Check className="h-3 w-3" />}
                  </div>
                </div>
              </motion.div>
            ))}
            {typing && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="rounded-2xl rounded-bl-sm bg-[#202c33] px-3 py-2">
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* input bar */}
        <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2">
          <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-2 text-xs text-white/40">
            Escribe un mensaje
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-bg">
            <Mic className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-white/60"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function Mic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function timeNow() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
