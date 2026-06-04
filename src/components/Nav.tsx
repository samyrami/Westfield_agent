import { motion } from "framer-motion";

const NAV_ITEMS = [
  { label: "Qué es Maia", href: "#about" },
  { label: "El caso", href: "#case" },
  { label: "Probar Maia", href: "#demo" },
  { label: "Cómo piensa", href: "#methodology" },
];

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a
          href="#demo"
          className="flex items-center gap-3 font-semibold tracking-tight"
        >
          <img
            src="/favicon.svg"
            alt="Westfield Business School"
            className="h-7 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span className="text-base text-muted">·</span>
          <span className="gradient-text-primary text-base">Maia</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <motion.a
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          href="#demo"
          className="rounded-full bg-gradient-warm px-4 py-2 text-sm font-semibold text-navy shadow-glow-gold"
        >
          Probar Maia
        </motion.a>
      </div>
    </header>
  );
}
