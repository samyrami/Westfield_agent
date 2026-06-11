import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CircleAlert,
  Download,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { cn } from "@/lib/cn";
import { SHOW_INTERNALS } from "@/lib/featureFlags";
import { exportConversationToPdf } from "@/lib/exportPdf";
import {
  askMaia,
  type MaiaRubricLevel,
  type MaiaTurn,
} from "@/lib/maiaClient";
import { MaiaAvatar, type AvatarState } from "@/components/MaiaAvatar";
import { ProgressBar } from "./ProgressBar";
import { RubricBadge } from "./RubricBadge";

/** Partículas ascendentes del fondo vivo (posición x, retardo, duración). */
const PARTICLES = [
  { left: "20%", delay: "0s", dur: "11s" },
  { left: "34%", delay: "3s", dur: "13s" },
  { left: "48%", delay: "6.5s", dur: "10s" },
  { left: "60%", delay: "1.5s", dur: "14s" },
  { left: "74%", delay: "4.5s", dur: "12s" },
  { left: "28%", delay: "8s", dur: "15s" },
  { left: "67%", delay: "9.5s", dur: "11s" },
  { left: "44%", delay: "2s", dur: "16s" },
];

/**
 * Playground real conectado a /api/maia (OpenAI en el servidor).
 * Layout para incrustar en Canvas: banner de video idle de Maia arriba, chat debajo.
 * Maneja:
 *  - histórico de mensajes (Maia ↔ estudiante)
 *  - lógica de avance entre las 3 preguntas (vía advance_to_next_question)
 *  - contador de intercambios sobre la pregunta activa (manda al backend)
 *  - badge de rúbrica + barra de progreso (sólo cuando VITE_SHOW_INTERNALS=true)
 *  - resumen final cuando is_final_summary = true
 *  - descarga de la conversación en PDF
 *  - modo fallback cuando el servidor responde con fallback=true
 *  - avatar que reacciona al estado de la conversación (sin voz, sólo movimiento)
 */
export function Playground() {
  const [messages, setMessages] = useState<MaiaTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<1 | 2 | 3>(1);
  const [turnsForCurrentQuestion, setTurnsForCurrentQuestion] = useState(0);
  const [rubric, setRubric] = useState<MaiaRubricLevel | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  // Maia abre la conversación con la primera pregunta
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void send("", { initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string, opts: { initial?: boolean } = {}) {
    setError(null);
    setBusy(true);

    const newHistory: MaiaTurn[] = opts.initial
      ? messages
      : [...messages, { role: "student", content: text }];
    if (!opts.initial) setMessages(newHistory);

    // Contador de intercambios sobre la pregunta activa. Lo manda el cliente
    // y el backend lo usa para decidir avance/cierre forzado.
    const nextTurnsForCurrentQuestion = opts.initial
      ? 0
      : turnsForCurrentQuestion + 1;

    try {
      const resp = await askMaia({
        history: opts.initial ? [] : messages,
        studentInput: opts.initial ? "" : text,
        currentQuestion,
        turnsForCurrentQuestion: nextTurnsForCurrentQuestion,
      });

      setIsFallback(Boolean(resp.fallback));
      setRubric(resp.rubric_level);
      setIsFinal(resp.is_final_summary);
      setUnresolved(resp.unresolved_points ?? []);

      if (resp.advance_to_next_question && currentQuestion < 3) {
        setCurrentQuestion((q) => (q < 3 ? ((q + 1) as 1 | 2 | 3) : q));
        setTurnsForCurrentQuestion(0);
      } else {
        if (resp.current_question) setCurrentQuestion(resp.current_question);
        setTurnsForCurrentQuestion(nextTurnsForCurrentQuestion);
      }

      setMessages([
        ...newHistory,
        { role: "maia", content: resp.message },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(
    e: FormEvent | { preventDefault: () => void },
  ) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void send(text);
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    setError(null);
    setCurrentQuestion(1);
    setTurnsForCurrentQuestion(0);
    setRubric(null);
    setIsFinal(false);
    setUnresolved([]);
    setIsFallback(false);
    startedRef.current = false;
    requestAnimationFrame(() => {
      startedRef.current = true;
      void send("", { initial: true });
    });
  }

  function handleDownload() {
    if (messages.length === 0) return;
    exportConversationToPdf(messages);
  }

  const helperText = useMemo(() => {
    if (isFinal) return "Conversación cerrada — revisa el resumen abajo.";
    if (busy) return "Maia está pensando…";
    if (messages.length === 0) return "Cargando primera pregunta…";
    return "Responde a Maia. Argumenta, no resumas.";
  }, [busy, isFinal, messages.length]);

  // --- Estado del avatar, derivado del ciclo de vida del chat (sin voz) ------
  const lastMaiaContent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "maia") return messages[i].content;
    }
    return null;
  }, [messages]);

  const [talking, setTalking] = useState(false);
  useEffect(() => {
    if (!lastMaiaContent) return;
    setTalking(true);
    const ms = Math.min(6000, 1200 + lastMaiaContent.length * 28);
    const id = setTimeout(() => setTalking(false), ms);
    return () => clearTimeout(id);
  }, [lastMaiaContent]);

  const avatarState: AvatarState = busy
    ? "thinking"
    : talking
      ? "talking"
      : "idle";

  const statusLabel = busy
    ? "Pensando…"
    : talking
      ? "Hablando…"
      : isFinal
        ? "Conversación cerrada"
        : "En línea";

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Halo soñador detrás del panel */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.75rem] bg-gradient-primary opacity-20 blur-3xl"
      />

      {/* Panel: Maia en columna izquierda + chat a la derecha (apila en móvil) */}
      <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-surface/30 shadow-glow-soft backdrop-blur-xl lg:h-[600px] lg:flex-row">
        {/* Fondo vivo CONTINUO en todo el panel — orbes/partículas atraviesan
            ambas zonas, así no hay borde perceptible entre Maia y el chat. */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute left-[8%] top-[16%] h-48 w-48 rounded-full bg-primary/40 blur-3xl animate-drift-a" />
          <div className="absolute left-[24%] top-[52%] h-44 w-44 rounded-full bg-secondary/25 blur-3xl animate-drift-b" />
          <div className="absolute left-[14%] bottom-[6%] h-48 w-48 rounded-full bg-gold/20 blur-3xl animate-drift-c" />
          <div className="absolute left-[20%] top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl animate-breathe" />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="animate-particle absolute bottom-0 block h-1.5 w-1.5 rounded-full bg-white/45 blur-[1px]"
              style={{
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.dur,
              }}
            />
          ))}
        </div>
        {/* Velo en gradiente hacia la zona del chat (legibilidad, sin borde) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-bg/25 to-bg/60 lg:bg-gradient-to-r lg:from-transparent lg:via-bg/20 lg:to-bg/55"
        />

        {/* ===== IZQUIERDA: Maia (video idle) — 50% del panel ===== */}
        <div className="relative h-72 shrink-0 overflow-hidden sm:h-80 lg:h-auto lg:w-1/2">
          {/* Video idle cubriendo la columna; el encuadre/recorte lo define
              object-position dentro de MaiaAvatar. */}
          <MaiaAvatar state={avatarState} className="h-full w-full" />
          {/* Badge nombre + estado */}
          <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-border/60 bg-bg/50 px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            <span className="font-display text-sm font-semibold leading-none">
              Maia
            </span>
            <span className="text-[11px] leading-none text-muted">
              · {statusLabel}
            </span>
          </div>
        </div>

        {/* ===== DERECHA: Chat ===== */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Cabecera: etiqueta + descarga PDF + (opcional) rúbrica */}
          <div className="shrink-0 px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Caso Etsy · introspección
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={messages.length === 0}
                  title="Descargar conversación en PDF"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg/90 backdrop-blur-md transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Descargar PDF</span>
                </button>
                {SHOW_INTERNALS && <RubricBadge level={rubric} />}
              </div>
            </div>
            {SHOW_INTERNALS && (
              <ProgressBar current={currentQuestion} isFinal={isFinal} />
            )}
            {isFallback && (
              <div className="mt-2 text-[10px] text-muted">
                Modo demo offline — sin conexión a OpenAI
              </div>
            )}
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 max-h-[55vh] flex-1 space-y-3 overflow-y-auto px-4 py-3 lg:max-h-none"
          >
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex",
                    m.role === "student" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[86%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm leading-relaxed backdrop-blur-md",
                      m.role === "student"
                        ? "rounded-br-lg bg-primary/30 text-fg shadow-lg"
                        : "rounded-bl-lg border border-border/60 bg-surface/80 text-fg/95 shadow-lg",
                    )}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <motion.div
                  key="busy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-3xl rounded-bl-lg border border-border/60 bg-surface/80 px-4 py-3 backdrop-blur-md">
                    <span className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="maia-typing-dot h-2 w-2 rounded-full bg-muted"
                          style={{ animationDelay: `${i * 0.18}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isFinal && unresolved.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-secondary/40 bg-secondary/10 p-4 backdrop-blur-md"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
                  Cuestionamientos sin resolver
                </div>
                <ul className="space-y-1.5 text-sm text-fg/90">
                  {unresolved.map((u, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm text-red-100 backdrop-blur-md">
                <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <CircleAlert className="h-3.5 w-3.5" />
                  Error
                </div>
                <div>{error}</div>
              </div>
            )}
          </div>

          {/* Input flotante */}
          <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
              <span>{helperText}</span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors hover:bg-surface hover:text-fg"
                disabled={busy}
                title="Reiniciar conversación"
              >
                <RotateCcw className="h-3 w-3" />
                Reiniciar
              </button>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={busy || isFinal}
                placeholder={
                  isFinal
                    ? "Conversación finalizada. Reinicia para empezar de nuevo."
                    : "Escribe tu respuesta…"
                }
                className="flex-1 resize-none rounded-2xl border border-border bg-bg/70 px-4 py-2.5 text-sm text-fg placeholder:text-muted backdrop-blur-md focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                rows={1}
              />
              <button
                type="submit"
                disabled={busy || isFinal || !input.trim()}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-warm px-4 text-sm font-semibold text-navy shadow-glow-gold transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
