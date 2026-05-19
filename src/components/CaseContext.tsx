import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, Building2, Store, TrendingDown, X } from "lucide-react";
import {
  CASE_AUTHOR,
  CASE_FULL_TEXT,
  CASE_KEY_FACTS,
  CASE_QUESTIONS,
  CASE_SUMMARY,
} from "@/content/case";
import { Section } from "./Section";

const SUMMARY_CARDS = [
  { ...CASE_SUMMARY.protagonist, icon: Store },
  { ...CASE_SUMMARY.marketplace, icon: Building2 },
  { ...CASE_SUMMARY.challenge, icon: TrendingDown },
];

export function CaseContext() {
  return (
    <Section
      id="case"
      eyebrow="El caso"
      title={
        <>
          Antes de hablar con Maia,{" "}
          <span className="gradient-text-primary">conoce a Mariola</span>.
        </>
      }
      description="Maia conduce una conversación socrática sobre un caso real de Westfield Business School. Estas son las piezas mínimas que necesitas para responderle con criterio."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {SUMMARY_CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card p-6"
            >
              <span className="mb-4 inline-grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary-glow">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mt-10"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-glow">
          <BarChart3 className="h-3.5 w-3.5" />
          Datos clave del caso
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CASE_KEY_FACTS.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="rounded-xl border border-border bg-surface/40 p-4"
              title={f.note}
            >
              <div className="text-xl font-semibold tracking-tight gradient-text-primary">
                {f.value}
              </div>
              <div className="mt-1 text-[11px] leading-snug text-muted">
                {f.label}
              </div>
              {f.note && (
                <div className="mt-1.5 text-[10px] leading-snug text-muted/70">
                  {f.note}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mt-10"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
          Las 3 preguntas que Maia te va a hacer
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CASE_QUESTIONS.map((q, i) => (
            <motion.div
              key={q.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="card relative overflow-hidden p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-sm font-bold text-bg shadow-glow">
                  {q.n}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <h4 className="text-sm font-semibold leading-snug tracking-tight">
                {q.title}
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-muted">{q.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs text-muted">
          Maia no avanza a la siguiente pregunta hasta que tu argumento alcanza
          nivel <span className="text-fg/90">superior</span> en la rúbrica de
          pensamiento crítico. No tengas miedo de detenerte y defender tu
          postura.
        </p>
        <CaseFullDialog />
      </div>
    </Section>
  );
}

function CaseFullDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-fg transition-colors hover:border-primary/60 hover:bg-primary/10"
        >
          <BookOpen className="h-4 w-4 text-primary-glow" />
          Leer caso completo
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(800px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface shadow-glow"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                Caso Etsy — Mariola Onetti
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted">
                {CASE_AUTHOR}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-bg/60 text-muted transition-colors hover:bg-bg hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            {CASE_FULL_TEXT.map((block) => (
              <section key={block.heading} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary-glow">
                  {block.heading}
                </h3>
                <div className="space-y-3 text-sm leading-relaxed text-fg/90">
                  {block.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="mt-8 rounded-xl border border-secondary/40 bg-secondary/5 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
                Las 3 preguntas de introspección
              </h3>
              <ol className="space-y-2 text-sm text-fg/90">
                {CASE_QUESTIONS.map((q) => (
                  <li key={q.n} className="flex gap-3">
                    <span className="font-mono text-muted">{q.n}.</span>
                    <span>{q.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
