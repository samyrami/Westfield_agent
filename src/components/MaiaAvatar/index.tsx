import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type AvatarState = "idle" | "thinking" | "talking";

/** Ruta del video idle de Maia (servido desde public/). Boomerang (ida+vuelta). */
const VIDEO_SRC = "/avatars/maia-idle.mp4";

/** Velocidad constante (plana) del loop. <1 = más lento que el original. */
const PLAYBACK_RATE = 0.5;

/**
 * Presencia de Maia: video idle en loop (mujer madura, registro serio).
 * Reemplaza al antiguo avatar 3D (GLB) — sin voz ni sincronía de labios, sólo
 * un ciclo continuo de fondo, como pidió el cliente ("quietica, en ciclo").
 *
 * Mantiene la prop `state` por compatibilidad con el Playground, pero el video
 * loopea igual en todos los estados (la seriedad la da el propio video).
 */
export function MaiaAvatar({
  className,
}: {
  state: AvatarState;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Velocidad constante: la fijamos al montar y al (re)cargar metadata.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      video.playbackRate = PLAYBACK_RATE;
    };
    apply();
    video.addEventListener("loadedmetadata", apply);
    return () => video.removeEventListener("loadedmetadata", apply);
  }, []);

  return (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", className)}
      // Encuadre: deja a Maia y su tablet en cuadro (recorta algo del fondo).
      style={{ objectPosition: "56% 45%" }}
      src={VIDEO_SRC}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label="Maia"
    />
  );
}
