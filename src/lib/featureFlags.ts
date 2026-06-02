/**
 * Feature flags resueltos en build time desde variables de entorno de Vite.
 *
 * Para producción Westfield, todo lo que delate la mecánica interna de
 * Maia (3 preguntas, rúbrica, esquema socrático) queda oculto por defecto
 * — el estudiante no debería ver cómo "piensa" el motor.
 *
 * Para activar en dev/QA: poner `VITE_SHOW_INTERNALS=true` en `.env.local`
 * y reiniciar Vite. La variable se inyecta al bundle en build time, no se
 * lee en runtime.
 */

export const SHOW_INTERNALS =
  import.meta.env.VITE_SHOW_INTERNALS === "true";
