import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionProps {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper de sección con eyebrow, título grande y subtítulo.
 * Anima entrada en viewport.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("relative px-6 py-20 md:py-28", className)}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 max-w-3xl"
        >
          {eyebrow && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs uppercase tracking-wider text-muted">
              {eyebrow}
            </div>
          )}
          <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 max-w-2xl text-base text-muted md:text-lg">
              {description}
            </p>
          )}
        </motion.div>
        {children}
      </div>
    </section>
  );
}
