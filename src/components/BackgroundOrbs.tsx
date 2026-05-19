/**
 * Fondo decorativo: 3 orbes radiales + grid sutil.
 * Replica el background del sitio original.
 */
export function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Orbe azul profundo */}
      <div
        className="absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(43, 123, 196, 0.45), transparent 60%)",
        }}
      />
      {/* Orbe lima */}
      <div
        className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(154, 202, 60, 0.38), transparent 60%)",
        }}
      />
      {/* Orbe navy */}
      <div
        className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full opacity-55 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(30, 90, 150, 0.32), transparent 60%)",
        }}
      />
      {/* Grid blanco a 2.5% */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6), transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6), transparent 80%)",
        }}
      />
    </div>
  );
}
