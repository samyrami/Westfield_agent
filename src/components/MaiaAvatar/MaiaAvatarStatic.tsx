import { cn } from "@/lib/cn";
import type { AvatarState } from "./MaiaAvatar3D";

/**
 * Avatar estático "vivo" (SVG/CSS, sin three.js).
 * Se usa cuando no hay WebGL, si el GLB falla, o como loader mientras carga el 3D.
 * Refleja el estado del chat para que el compañero nunca se sienta inerte.
 */
export function MaiaAvatarStatic({
  state,
  className,
}: {
  state: AvatarState;
  className?: string;
}) {
  return (
    <div className={cn("grid h-full w-full place-items-center", className)}>
      <div className="relative aspect-square w-[55%] max-w-[240px]">
        {/* Halo exterior */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-primary opacity-30 blur-2xl",
            state === "thinking" ? "animate-pulse" : "animate-breathe",
          )}
        />
        {state === "talking" && (
          <div className="absolute -inset-2 rounded-full border border-secondary/40 animate-ping" />
        )}
        {/* Orbe principal */}
        <div className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow animate-breathe">
          <div className="absolute left-[18%] top-[14%] h-1/3 w-1/3 rounded-full bg-white/40 blur-md" />
        </div>
        <div className="absolute inset-[28%] rounded-full bg-bg/20 backdrop-blur-sm" />
        {state === "thinking" && (
          <div className="absolute inset-x-0 bottom-[30%] flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="maia-typing-dot h-2 w-2 rounded-full bg-white"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
