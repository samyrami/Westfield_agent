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

/** Morph targets ARKit por estado (nombres L/R correctos). Sutil > exagerado. */
const BASE_EMOTION: Record<AvatarState, Record<string, number>> = {
  idle: { mouthSmileLeft: 0.14, mouthSmileRight: 0.14 },
  thinking: {
    browInnerUp: 0.4,
    eyeLookUpLeft: 0.16,
    eyeLookUpRight: 0.16,
    mouthPucker: 0.1,
  },
  talking: { mouthSmileLeft: 0.18, mouthSmileRight: 0.18, browInnerUp: 0.08 },
};

export default function MaiaAvatar3D({
  state,
  onReady,
}: {
  state: AvatarState;
  onReady?: () => void;
}) {
  const [jaw, setJaw] = useState(0);
  const [blink, setBlink] = useState(false);

  // Boca animada sólo mientras "habla" (movimiento, no audio).
  useEffect(() => {
    if (state !== "talking") {
      setJaw(0);
      return;
    }
    const id = setInterval(() => setJaw(0.05 + Math.random() * 0.28), 110);
    return () => clearInterval(id);
  }, [state]);

  // Parpadeo procedural: cada 2.5–5.5s, un blink corto.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
      timer = setTimeout(loop, 2500 + Math.random() * 3000);
    };
    timer = setTimeout(loop, 1800);
    return () => clearTimeout(timer);
  }, []);

  const emotion: Record<string, number> = {
    ...BASE_EMOTION[state],
    ...(blink ? { eyeBlinkLeft: 1, eyeBlinkRight: 1 } : {}),
    ...(state === "talking" ? { jawOpen: jaw } : {}),
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
