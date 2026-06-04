/**
 * Detección de soporte WebGL.
 * Si el navegador no puede crear un contexto WebGL, evitamos montar el avatar
 * 3D y caemos al avatar estático — el chat nunca debe bloquearse por el 3D.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
