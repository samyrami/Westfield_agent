import { Avatar } from "@readyplayerme/visage";
import { useEffect, useState } from "react";

/** Estados del avatar, derivados del ciclo de vida del chat. */
export type AvatarState = "idle" | "thinking" | "talking";

/**
 * Avatar de Maia (auto-hospedado en public/avatars/maia-avatar.glb). Swappable sin
 * tocar código: reemplazá el archivo, o seteá VITE_MAIA_AVATAR_URL.
 *
 * `animationSrc` es OPCIONAL: el avatar viene en pose natural, así que por defecto
 * NO se usa clip (evita choques de retargeting). El "movimiento" sale de:
 *   - headMovement (sigue el cursor con la cabeza)
 *   - parpadeo procedural
 *   - emotion por estado (idle / thinking / talking) + boca al "hablar".
 */
const MODEL_SRC =
  import.meta.env.VITE_MAIA_AVATAR_URL || "/avatars/maia-avatar.glb";
const ANIMATION_SRC = import.meta.env.VITE_MAIA_AVATAR_ANIMATION || undefined;
// Pose estática (brazos abajo) — corrige el T-pose sin usar el mixer de animación
// (que es incompatible con este avatar). Aplica sólo si no hay animationSrc.
const POSE_SRC = import.meta.env.VITE_MAIA_AVATAR_POSE || "/avatars/pose.glb";

/**
 * Este avatar NO trae los blendshapes ARKit con nombre (sus morphs son numéricos),
 * pero SÍ expone dos útiles: `eye_close` (parpadeo) y `eye_look_up` (mirada arriba).
 * Con esos dos damos vida facial: parpadeo natural + mirada pensativa al "pensar".
 */
export default function MaiaAvatar3D({
  state,
  onReady,
}: {
  state: AvatarState;
  onReady?: () => void;
}) {
  const [blink, setBlink] = useState(false);
  const [gaze, setGaze] = useState(0);

  // Parpadeo real (morph "eye_close"). Más frecuente mientras piensa.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 110);
      const gap =
        state === "thinking"
          ? 1200 + Math.random() * 1400
          : 2800 + Math.random() * 3200;
      timer = setTimeout(loop, gap);
    };
    timer = setTimeout(loop, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  // Al "pensar": la mirada sube y baja suavemente (pensativa, como recordando).
  useEffect(() => {
    if (state !== "thinking") {
      setGaze(0);
      return;
    }
    let t = 0;
    const id = setInterval(() => {
      t += 0.4;
      setGaze(0.35 + 0.25 * Math.sin(t)); // oscila ~0.1–0.6
    }, 90);
    return () => clearInterval(id);
  }, [state]);

  const emotion: Record<string, number> = {
    ...(blink ? { eye_close: 1 } : {}),
    ...(gaze > 0 ? { eye_look_up: gaze } : {}),
  };

  return (
    <Avatar
      modelSrc={MODEL_SRC}
      animationSrc={ANIMATION_SRC}
      poseSrc={POSE_SRC}
      idleRotation
      headMovement
      emotion={emotion}
      environment="soft"
      cameraTarget={1.74}
      cameraInitialDistance={1.2}
      fov={30}
      dpr={[1, 1.5]}
      shadows={false}
      onLoaded={onReady}
      // pointerEvents:none en el CANVAS → la rueda/clic no llegan a los
      // controles 3D (no zoom ni rotación); el scroll pasa a la página.
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
