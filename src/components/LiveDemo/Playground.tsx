import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CircleAlert,
  Download,
  Loader2,
  RotateCcw,
  Sparkles,
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
import { ProgressBar } from "./ProgressBar";
import { RubricBadge } from "./RubricBadge";

/**
 * Playground real conectado a /api/maia (OpenAI en el servidor).
 * Maneja:
 *  - histórico de mensajes (Maia ↔ estudiante)
 *  - lógica de avance entre las 3 preguntas (vía advance_to_next_question)
 *  - badge de rúbrica
 *  - resumen final cuando is_final_summary = true
 *  - chips de sugerencia contextuales por pregunta
 *  - modo fallback cuando el servidor responde con fallback=true
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

  return (
    <div className="card flex h-[640px] flex-col overflow-hidden">
      <div className="border-b border-border bg-surface/40 px-5 py-4">
        <div className={cn("flex items-center justify-between gap-3", SHOW_INTERNALS && "mb-3")}>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-bg shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold leading-tight">
                Maia · caso Etsy
              </div>
              <div className="text-[11px] text-muted">
                {isFallback
                  ? "Modo demo offline — sin conexión a OpenAI"
                  : "Powered by OpenAI"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={messages.length === 0}
              title="Descargar conversación en PDF"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-fg/90 transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            {SHOW_INTERNALS && <RubricBadge level={rubric} />}
          </div>
        </div>
        {SHOW_INTERNALS && <ProgressBar current={currentQuestion} isFinal={isFinal} />}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "flex",
                m.role === "student" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "student"
                    ? "rounded-br-md bg-primary/20 text-fg"
                    : "rounded-bl-md border border-border bg-surface/70 text-fg/95",
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
              <div className="rounded-2xl rounded-bl-md border border-border bg-surface/70 px-3.5 py-2.5 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Maia está pensando…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isFinal && unresolved.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-secondary/40 bg-secondary/5 p-4"
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
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
            <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <CircleAlert className="h-3.5 w-3.5" />
              Error
            </div>
            <div className="text-red-100/90">{error}</div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-surface/40 px-5 py-3"
      >
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span>{helperText}</span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-surface hover:text-fg"
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
                : "Escribe tu respuesta…  (Enter para enviar, Shift+Enter para salto de línea)"
            }
            className="flex-1 resize-none rounded-xl border border-border bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-primary/60 focus:outline-none disabled:opacity-50"
            rows={2}
          />
          <button
            type="submit"
            disabled={busy || isFinal || !input.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-primary px-4 text-sm font-medium text-bg shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            Enviar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-muted">
          Esta conversación no se guarda. La key de OpenAI vive sólo en el servidor.
        </div>
      </form>
    </div>
  );
}
