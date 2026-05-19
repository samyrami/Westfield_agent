export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/50 bg-bg/70 px-6 py-12 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt="Westfield Business School"
            className="h-8 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="border-l border-border pl-3">
            <div className="text-sm font-semibold">Business School</div>
            <div className="text-xs text-muted">
              Maia · agente académico socrático
            </div>
          </div>
        </div>

        <div className="text-xs text-muted">
          © {new Date().getFullYear()} Westfield Business School · Demo
          showcase del agente Maia.
        </div>
      </div>
    </footer>
  );
}
