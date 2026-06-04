import { useEffect } from "react";

/**
 * Bloquea TODO zoom del navegador en la página:
 *  - Teclado: Cmd/Ctrl + (+ , - , = , 0 , _)
 *  - Trackpad / mouse: Ctrl/Cmd + rueda (pinch-to-zoom de escritorio)
 *  - Safari: gestos de pinch (gesturestart/change/end)
 *  - Móvil: el pinch se bloquea además vía meta viewport (user-scalable=no)
 *
 * Pensado para que el showcase del avatar 3D no pueda "romperse" haciendo zoom.
 * (El zoom/rotación del propio avatar ya está desactivado con pointer-events-none).
 */
export function useDisableZoom() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["+", "-", "=", "0", "_"].includes(e.key)
      ) {
        e.preventDefault();
      }
    };
    const onGesture = (e: Event) => e.preventDefault();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("gesturestart", onGesture);
    document.addEventListener("gesturechange", onGesture);
    document.addEventListener("gestureend", onGesture);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("gestureend", onGesture);
    };
  }, []);
}
