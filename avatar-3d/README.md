# Maia — Avatar 3D interactivo

Página standalone (three.js puro vía CDN, sin build) que muestra **solo el avatar de Maia** con animación procedural: respiración, balanceo de peso, parpadeo, mirada que sigue al cursor, micro-expresiones y reacciones de cara, hombros y cuerpo.

Es completamente independiente del sitio: no toca `src/`, `server/` ni el build de Vite. Usa una copia local de `maia-avatar.glb`.

## Cómo verlo

Necesita un servidor estático (el GLB se carga por `fetch`, `file://` no sirve):

```bash
cd avatar-3d
npx serve .            # o: python -m http.server 8080
```

y abre la URL que indique (p. ej. `http://localhost:3000`).

## Interacciones

- **Mover el cursor** — Maia te sigue con la mirada (cabeza + cuello + torso en cascada). Sin cursor, deambula con sacadas naturales.
- **Clic sobre ella** — reacciona según dónde toques: cabeza (sorpresa), hombros (se encoge), cuerpo (cosquillas).
- **Arrastrar / rueda** — orbitar y zoom (limitados).
- **Botones** — reacciones one-shot (saludar, asentir, negar, sorpresa, "no sé", celebrar) y estados continuos (reposo / pensando / hablando, como en el playground).
- **Vida propia** — micro-acciones espontáneas en reposo (ladear la cabeza, morderse los labios, rodar hombros…).

## Notas técnicas

- El GLB viene en T-pose; los brazos se bajan en runtime alineando cada cadena de huesos en espacio mundo (sin `pose.glb` ni clips).
- Los morphs del modelo son 22 visemas de boca (`'0'`–`'21'`) + `eye_close` + `eye_look_up`. No hay morphs de sonrisa/cejas, así que la emoción se expresa con lenguaje corporal.
- El modelo está comprimido con Draco → se usa `DRACOLoader` con el decoder de CDN de Google.
- Respeta `prefers-reduced-motion` (amplitudes reducidas, sin vida propia).
