import {
  Component,
  Suspense,
  lazy,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { isWebGLAvailable } from "@/lib/webgl";
import { MaiaAvatarStatic } from "./MaiaAvatarStatic";
import type { AvatarState } from "./MaiaAvatar3D";

// Lazy: todo el stack three/visage queda en un chunk aparte, fuera del bundle
// principal. El chat se renderiza sin esperar al 3D.
const MaiaAvatar3D = lazy(() => import("./MaiaAvatar3D"));

export type { AvatarState };

/** Error boundary que cae al avatar estático si el 3D falla. */
class AvatarErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Avatar 3D falló — usando avatar estático.", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Presencia de Maia. Intenta el avatar 3D (mujer con gafas); si no hay WebGL
 * o algo falla, muestra el avatar estático equivalente. Nunca bloquea el chat.
 */
export function MaiaAvatar({
  state,
  className,
}: {
  state: AvatarState;
  className?: string;
}) {
  const [webgl] = useState(() => isWebGLAvailable());
  const fallback = <MaiaAvatarStatic state={state} />;

  return (
    <div className={cn("relative", className)}>
      {webgl ? (
        <AvatarErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <MaiaAvatar3D state={state} />
          </Suspense>
        </AvatarErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
