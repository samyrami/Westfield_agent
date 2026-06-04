/**
 * Fondo decorativo soñador (twilight): orbes radiales índigo / teal / dorado
 * + grid sutil. Paleta de marca Westfield con la calidez de Replika.
 */
export function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Orbe índigo */}
      <div
        className="absolute -top-40 -left-40 h-[700px] w-[700px] animate-breathe rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(96, 91, 229, 0.42), transparent 60%)",
        }}
      />
      {/* Orbe teal */}
      <div
        className="absolute top-1/3 -right-40 h-[620px] w-[620px] animate-breathe rounded-full opacity-45 blur-3xl"
        style={{
          animationDelay: "1.2s",
          background:
            "radial-gradient(circle at center, rgba(94, 234, 212, 0.30), transparent 60%)",
        }}
      />
      {/* Orbe dorado cálido */}
      <div
        className="absolute bottom-0 left-1/4 h-[520px] w-[520px] animate-breathe rounded-full opacity-40 blur-3xl"
        style={{
          animationDelay: "2.4s",
          background:
            "radial-gradient(circle at center, rgba(217, 142, 4, 0.28), transparent 60%)",
        }}
      />
      {/* Grid blanco a 2% */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 80%)",
        }}
      />
    </div>
  );
}
