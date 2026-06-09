import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MaiaAvatarStatic } from "./MaiaAvatarStatic";

/** Estados del avatar, derivados del ciclo de vida del chat. */
export type AvatarState = "idle" | "thinking" | "talking";

/**
 * Avatar 3D de Maia con animación 100% procedural sobre three.js puro
 * (sin visage, sin clips). El mismo sistema del showcase `avatar-3d/`:
 *
 *  - SIEMPRE VIVA: respiración (pecho+hombros), balanceo de peso en caderas,
 *    micro-ruido orgánico en cuello/cabeza, parpadeo con dobles ocasionales
 *    y "vida propia" (ladea la cabeza, se muerde los labios, rueda hombros).
 *  - MIRADA: sigue el cursor por toda la página (cabeza+cuello+torso en
 *    cascada); sin cursor, deambula con sacadas naturales.
 *  - ESTADOS del chat: thinking (mirada arriba, boquita fruncida, párpados
 *    caídos) / talking (visemas pseudoaleatorios + gesticulación, busca la
 *    cámara) / idle (reposo + vida propia).
 *  - REACCIONES por clic sobre ella: cabeza → sorpresa, hombros → se encoge,
 *    cuerpo → celebra. Y saluda al cargar.
 *
 * Datos del modelo (verificados parseando el GLB): rig "metarig" estilo
 * Mixamo en T-pose (se corrige en runtime alineando cadenas en mundo);
 * morphs = 22 visemas de boca ('0'..'21') + 'eye_close' + 'eye_look_up'.
 * No hay morphs de sonrisa/cejas → la emoción va por lenguaje corporal.
 *
 * El canvas mantiene pointer-events:none (la rueda/clic pasan a la página);
 * mirada y reacciones escuchan en `window`, así que nada del chat cambia.
 */
const MODEL_SRC =
  import.meta.env.VITE_MAIA_AVATAR_URL || "/avatars/maia-avatar-opt.glb";
// Decoder Draco auto-hospedado (public/draco/) — sin CDN, funciona offline.
const DRACO_PATH = "/draco/";

// ---------------------------------------------------------------- utilidades
const { lerp, clamp } = THREE.MathUtils;
const EJE_X = new THREE.Vector3(1, 0, 0);
const EJE_Y = new THREE.Vector3(0, 1, 0);
const EJE_Z = new THREE.Vector3(0, 0, 1);

const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);
const easeInOutQuad = (u: number) =>
  u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

/** Envolvente ataque-meseta-salida para reacciones one-shot. */
function envolvente(u: number, ataque = 0.18, salida = 0.28): number {
  if (u <= 0 || u >= 1) return 0;
  if (u < ataque) return easeOutCubic(u / ataque);
  if (u > 1 - salida) return easeInOutQuad((1 - u) / salida);
  return 1;
}

/** Pseudo-perlin barato: suma de senos incongruentes, ~[-1,1]. */
function ruido(t: number, semilla: number): number {
  return (
    Math.sin(t * 1.7 + semilla) * 0.5 +
    Math.sin(t * 2.93 + semilla * 1.31) * 0.3 +
    Math.sin(t * 4.71 + semilla * 2.17) * 0.2
  );
}

type Reaccion = {
  dur: number;
  sutil?: boolean;
  mirarCamara?: number;
  sinParpadeo?: boolean;
  fn: (u: number, env: number) => void;
};

/** Visemas de boca útiles para "hablar" (índices del set '0'..'21'). */
const VISEMAS = ["1", "3", "8", "2", "19", "6"] as const;
const MORPHS_USADOS = [...VISEMAS, "0", "21", "eye_close", "eye_look_up"];

// ---------------------------------------------------------------- sistema 3D
/**
 * Crea escena + rig + bucle de animación sobre el canvas dado.
 * Devuelve dispose(). Independiente de React: recibe los estados por refs.
 */
function crearSistemaMaia(opts: {
  canvas: HTMLCanvasElement;
  getState: () => AvatarState;
  onReady: () => void;
  onError: (e: unknown) => void;
}): () => void {
  const { canvas, getState, onReady, onError } = opts;

  const reducirMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const AMP = reducirMovimiento ? 0.45 : 1;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const escena = new THREE.Scene();

  // Encuadre retrato medio (cabeza + torso, con aire arriba). El contenedor
  // tiene proporción fija 3:4, así que el encuadre es estable.
  const camara = new THREE.PerspectiveCamera(30, 3 / 4, 0.05, 20);
  camara.position.set(0, 1.24, 1.5);
  const objetivoCamara = new THREE.Vector3(0, 1.12, 0);
  camara.lookAt(objetivoCamara);

  // Iluminación estudio suave con la paleta Westfield.
  escena.add(new THREE.HemisphereLight(0x8a88d8, 0x10142a, 0.85));
  const clave = new THREE.DirectionalLight(0xfff1e0, 2.4);
  clave.position.set(1.6, 2.6, 2.2);
  escena.add(clave);
  const rim = new THREE.DirectionalLight(0x5eead4, 1.5);
  rim.position.set(-1.8, 1.8, -1.6);
  escena.add(rim);
  const relleno = new THREE.DirectionalLight(0x605be5, 0.7);
  relleno.position.set(-1.2, 0.8, 2.0);
  escena.add(relleno);

  // ---- estado interno del sistema
  const huesos: Record<string, THREE.Bone> = {};
  const reposo: Record<string, { q: THREE.Quaternion; p: THREE.Vector3 }> = {};
  const morphRefs: Record<string, { mesh: THREE.Mesh; idx: number }[]> = {};
  const morphFrame: Record<string, number> = {};
  const pesosVisema: Record<string, number> = {};
  for (const v of VISEMAS) pesosVisema[v] = 0;
  const poses: Record<string, Record<string, THREE.Quaternion>> = {};

  let avatar: THREE.Object3D | null = null;
  let reaccion: { def: Reaccion; t0: number } | null = null;
  let blink = { proximo: 1.8, t: -1, doble: false };
  let visema = { actual: null as string | null, timer: 0, amp: 0.7 };
  let autoTimer = 7;
  let gazeSuave = { yaw: 0, pitch: 0 };
  let vistazo = { yaw: 0, pitch: 0, timer: 2.5 };
  let puntero = { x: 0, y: 0, valido: false, ultimoMov: -10 };
  let visible = true;
  let rafId = 0;

  const rayo = new THREE.Raycaster();
  const miradaObjetivo = new THREE.Vector3(0, 1.28, 2.0);

  const _q = new THREE.Quaternion();
  const _q2 = new THREE.Quaternion();
  const _pq = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _ndc = new THREE.Vector2();

  /** Rotación aditiva en espacio LOCAL (torso/cuello: ejes ≈ mundo). */
  function rotLocal(hueso: THREE.Bone, eje: THREE.Vector3, angulo: number) {
    _q.setFromAxisAngle(eje, angulo);
    hueso.quaternion.multiply(_q);
  }

  /** Rotación aditiva alrededor de un eje en MUNDO (hombros/brazos). */
  function rotMundo(hueso: THREE.Bone, ejeMundo: THREE.Vector3, angulo: number) {
    (hueso.parent as THREE.Object3D).getWorldQuaternion(_pq);
    _q.setFromAxisAngle(ejeMundo, angulo);
    _q2.copy(_pq).invert().multiply(_q).multiply(_pq);
    hueso.quaternion.premultiply(_q2);
  }

  /** Rota `hueso` para que la dirección hacia `hijo` apunte a `dirMundo`. */
  function alinear(nombreHueso: string, nombreHijo: string, dirMundo: THREE.Vector3) {
    const hueso = huesos[nombreHueso];
    const hijo = huesos[nombreHijo];
    if (!hueso || !hijo || !avatar) return;
    avatar.updateMatrixWorld(true);
    const a = hueso.getWorldPosition(new THREE.Vector3());
    const b = hijo.getWorldPosition(new THREE.Vector3());
    const actual = b.sub(a).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(
      actual,
      dirMundo.clone().normalize(),
    );
    const pw = (hueso.parent as THREE.Object3D).getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const corr = pw.clone().invert().multiply(delta).multiply(pw);
    hueso.quaternion.premultiply(corr);
  }

  function ponerMorph(nombre: string, valor: number) {
    morphFrame[nombre] = Math.max(morphFrame[nombre] ?? 0, valor);
  }

  function aplicarMorphs() {
    for (const nombre of MORPHS_USADOS) {
      const refs = morphRefs[nombre];
      if (!refs) continue;
      const v = clamp(morphFrame[nombre] ?? 0, 0, 1);
      for (const r of refs) r.mesh.morphTargetInfluences![r.idx] = v;
    }
  }

  // ---- reacciones one-shot (offsets sobre la pose, moduladas por envolvente)
  const REACCIONES: Record<string, Reaccion> = {
    saludar: {
      dur: 2.6,
      mirarCamara: 0.85,
      fn(u, env) {
        huesos.RightArm.quaternion.slerp(poses.saludo.RightArm, env);
        huesos.RightForeArm.quaternion.slerp(poses.saludo.RightForeArm, env);
        rotMundo(huesos.RightForeArm, EJE_Z, Math.sin(u * Math.PI * 7) * 0.34 * env);
        rotMundo(huesos.RightHand, EJE_Z, Math.sin(u * Math.PI * 7 + 0.6) * 0.18 * env);
        rotLocal(huesos.Head, EJE_Z, -0.09 * env);
        rotLocal(huesos.Spine1, EJE_Z, 0.04 * env);
        ponerMorph("1", 0.3 * envolvente(u, 0.1, 0.55));
      },
    },
    sorpresa: {
      dur: 1.6,
      mirarCamara: 0.9,
      sinParpadeo: true,
      fn(_u, env) {
        rotLocal(huesos.Spine1, EJE_X, -0.06 * env);
        rotLocal(huesos.Head, EJE_X, -0.1 * env);
        rotMundo(huesos.LeftShoulder, EJE_Z, 0.16 * env);
        rotMundo(huesos.RightShoulder, EJE_Z, -0.16 * env);
        huesos.Hips.position.y += -0.012 * env;
        ponerMorph("1", 0.85 * env);
        ponerMorph("eye_look_up", 0.3 * env);
      },
    },
    encogerse: {
      dur: 1.9,
      fn(_u, env) {
        rotMundo(huesos.LeftShoulder, EJE_Z, 0.27 * env);
        rotMundo(huesos.RightShoulder, EJE_Z, -0.27 * env);
        huesos.LeftForeArm.quaternion.slerp(poses.palmas.LeftForeArm, env * 0.85);
        huesos.RightForeArm.quaternion.slerp(poses.palmas.RightForeArm, env * 0.85);
        rotLocal(huesos.Head, EJE_Z, 0.13 * env);
        ponerMorph("3", 0.4 * env);
      },
    },
    celebrar: {
      dur: 1.8,
      mirarCamara: 0.6,
      fn(u, env) {
        const rebote = Math.abs(Math.sin(u * Math.PI * 3));
        huesos.Hips.position.y += (-0.028 + rebote * 0.04) * env;
        rotMundo(huesos.LeftArm, EJE_Z, 0.22 * env * rebote);
        rotMundo(huesos.RightArm, EJE_Z, -0.22 * env * rebote);
        rotMundo(huesos.LeftShoulder, EJE_Z, 0.1 * env * rebote);
        rotMundo(huesos.RightShoulder, EJE_Z, -0.1 * env * rebote);
        rotLocal(huesos.Head, EJE_Z, Math.sin(u * Math.PI * 3) * 0.1 * env);
        ponerMorph("1", 0.4 * env * rebote);
        ponerMorph("eye_close", 0.45 * env); // ojitos felices
      },
    },
    // --- sutiles (vida propia en reposo) ---
    ladearCabeza: {
      dur: 2.6,
      sutil: true,
      fn(_u, env) {
        rotLocal(huesos.Head, EJE_Z, 0.11 * env);
        rotLocal(huesos.Neck, EJE_Z, 0.04 * env);
      },
    },
    asentirSuave: {
      dur: 1.4,
      sutil: true,
      fn(u, env) {
        rotLocal(huesos.Head, EJE_X, Math.sin(u * Math.PI * 2) * 0.07 * env);
      },
    },
    labios: {
      dur: 1.2,
      sutil: true,
      fn(_u, env) {
        ponerMorph("21", 0.45 * env);
      },
    },
    hombrosRoll: {
      dur: 2.2,
      sutil: true,
      fn(u, env) {
        const a = Math.sin(u * Math.PI * 2) * 0.06 * env;
        rotMundo(huesos.LeftShoulder, EJE_Z, a);
        rotMundo(huesos.RightShoulder, EJE_Z, a * 0.7);
        rotLocal(huesos.Spine2, EJE_X, 0.02 * env);
      },
    },
  };

  function dispararReaccion(nombre: keyof typeof REACCIONES) {
    const def = REACCIONES[nombre];
    if (!def || !avatar) return;
    reaccion = { def, t0: reloj.elapsedTime };
  }

  // ---- colliders invisibles (clic en cabeza / hombros / cuerpo)
  const matInvisible = new THREE.MeshBasicMaterial({ visible: false });
  const colliders: THREE.Mesh[] = [];
  const REACCION_POR_REGION: Record<string, keyof typeof REACCIONES> = {
    cabeza: "sorpresa",
    hombro: "encogerse",
    cuerpo: "celebrar",
  };

  function crearColliders() {
    const defs: Array<{
      region: string;
      geo: THREE.BufferGeometry;
      hueso: string;
      off: [number, number, number];
    }> = [
      { region: "cabeza", geo: new THREE.SphereGeometry(0.17, 12, 10), hueso: "Head", off: [0, 0.07, 0.02] },
      { region: "hombro", geo: new THREE.SphereGeometry(0.11, 10, 8), hueso: "LeftArm", off: [0.02, 0, 0] },
      { region: "hombro", geo: new THREE.SphereGeometry(0.11, 10, 8), hueso: "RightArm", off: [-0.02, 0, 0] },
      { region: "cuerpo", geo: new THREE.BoxGeometry(0.34, 0.5, 0.26), hueso: "Spine1", off: [0, 0.05, 0.02] },
    ];
    for (const d of defs) {
      const m = new THREE.Mesh(d.geo, matInvisible);
      m.userData.region = d.region;
      m.userData.hueso = d.hueso;
      m.userData.off = new THREE.Vector3(...d.off);
      escena.add(m);
      colliders.push(m);
    }
  }

  function actualizarColliders() {
    for (const c of colliders) {
      huesos[c.userData.hueso as string]
        .getWorldPosition(c.position)
        .add(c.userData.off as THREE.Vector3);
    }
  }

  // ---- carga del modelo
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  const cargador = new GLTFLoader();
  cargador.setDRACOLoader(draco);

  cargador.load(
    MODEL_SRC,
    (gltf) => {
      avatar = gltf.scene;
      escena.add(avatar);
      avatar.traverse((o) => {
        if ((o as THREE.Bone).isBone) huesos[o.name] = o as THREE.Bone;
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.frustumCulled = false; // los skinned mesh recortan mal al animar
          if (mesh.morphTargetDictionary) {
            for (const [nombre, idx] of Object.entries(mesh.morphTargetDictionary)) {
              (morphRefs[nombre] ??= []).push({ mesh, idx });
            }
          }
        }
      });

      // El GLB viene en T-pose: bajar brazos alineando cada cadena en mundo.
      alinear("LeftArm", "LeftForeArm", new THREE.Vector3(0.2, -0.97, 0.03));
      alinear("LeftForeArm", "LeftHand", new THREE.Vector3(0.12, -0.95, 0.22));
      alinear("RightArm", "RightForeArm", new THREE.Vector3(-0.2, -0.97, 0.03));
      alinear("RightForeArm", "RightHand", new THREE.Vector3(-0.12, -0.95, 0.22));

      avatar.updateMatrixWorld(true);
      for (const [nombre, h] of Object.entries(huesos)) {
        reposo[nombre] = { q: h.quaternion.clone(), p: h.position.clone() };
      }

      // poses clave de brazo (se capturan y se restaura el reposo)
      const capturar = (
        pares: Array<[string, string, THREE.Vector3]>,
      ): Record<string, THREE.Quaternion> => {
        for (const [hueso, hijo, dir] of pares) alinear(hueso, hijo, dir);
        const out: Record<string, THREE.Quaternion> = {};
        for (const [hueso] of pares) out[hueso] = huesos[hueso].quaternion.clone();
        for (const [nombre, h] of Object.entries(huesos)) h.quaternion.copy(reposo[nombre].q);
        avatar!.updateMatrixWorld(true);
        return out;
      };
      poses.saludo = capturar([
        ["RightArm", "RightForeArm", new THREE.Vector3(-0.62, 0.5, 0.1)],
        ["RightForeArm", "RightHand", new THREE.Vector3(-0.18, 0.96, 0.12)],
      ]);
      poses.palmas = capturar([
        ["LeftForeArm", "LeftHand", new THREE.Vector3(0.5, -0.32, 0.78)],
        ["RightForeArm", "RightHand", new THREE.Vector3(-0.5, -0.32, 0.78)],
      ]);

      crearColliders();
      onReady();

      // saluda al aparecer (solo si el chat está tranquilo)
      if (!reducirMovimiento) {
        window.setTimeout(() => {
          if (getState() === "idle") dispararReaccion("saludar");
        }, 700);
      }

      rafId = requestAnimationFrame(bucle);
    },
    undefined,
    (err) => {
      console.warn("✗ Avatar 3D: no se pudo cargar el GLB.", err);
      onError(err);
    },
  );

  // ---- interacción (en window: el canvas mantiene pointer-events:none)
  function ndcDesdeEvento(e: PointerEvent | MouseEvent): THREE.Vector2 | null {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return _ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  }

  const onPointerMove = (e: PointerEvent) => {
    const ndc = ndcDesdeEvento(e);
    if (!ndc) return;
    // seguimos el cursor aunque esté fuera del panel (con límite suave)
    puntero.x = clamp(ndc.x, -2.2, 2.2);
    puntero.y = clamp(ndc.y, -2.2, 2.2);
    puntero.valido = true;
    puntero.ultimoMov = reloj.elapsedTime;
  };

  const onClick = (e: MouseEvent) => {
    if (!avatar || colliders.length === 0) return;
    const ndc = ndcDesdeEvento(e);
    if (!ndc || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return; // fuera del panel
    rayo.setFromCamera(ndc, camara);
    const hits = rayo.intersectObjects(colliders, false);
    if (hits.length) {
      const region = hits[0].object.userData.region as string;
      dispararReaccion(REACCION_POR_REGION[region]);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("click", onClick);

  // pausar el bucle cuando el panel no está a la vista (perf/batería)
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  io.observe(canvas);

  // tamaño del canvas = tamaño real del contenedor (proporción fija 3:4)
  const ro = new ResizeObserver(() => {
    const r = canvas.parentElement?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    renderer.setSize(r.width, r.height, false);
    camara.aspect = r.width / r.height;
    camara.updateProjectionMatrix();
  });
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  // ---------------------------------------------------------------- capas
  const reloj = new THREE.Clock();

  function capaRespiracion(t: number, energia: number) {
    const f = getState() === "thinking" ? 0.21 : 0.26;
    const resp = Math.sin(t * Math.PI * 2 * f);
    const a = 0.016 * AMP * (0.8 + 0.4 * energia);
    rotLocal(huesos.Spine2, EJE_X, resp * a);
    rotLocal(huesos.Spine1, EJE_X, resp * a * 0.45);
    rotLocal(huesos.Head, EJE_X, -resp * a * 0.5);
    rotMundo(huesos.LeftShoulder, EJE_Z, resp * 0.012 * AMP);
    rotMundo(huesos.RightShoulder, EJE_Z, -resp * 0.012 * AMP);
  }

  function capaBalanceo(t: number) {
    const s = ruido(t * 0.32, 1.7) * AMP;
    const s2 = ruido(t * 0.21, 4.1) * AMP;
    huesos.Hips.position.x += s * 0.0065;
    huesos.Hips.position.y += Math.abs(s2) * -0.004;
    rotLocal(huesos.Hips, EJE_Z, s * 0.018);
    rotLocal(huesos.Spine, EJE_Z, -s * 0.02);
    rotLocal(huesos.Spine1, EJE_Y, s2 * 0.022);
    rotMundo(huesos.LeftArm, EJE_Z, s * 0.015 + 0.01);
    rotMundo(huesos.RightArm, EJE_Z, -s * 0.015 - 0.01);
    rotMundo(huesos.LeftForeArm, EJE_X, s2 * 0.012);
    rotMundo(huesos.RightForeArm, EJE_X, s2 * 0.012);
  }

  function capaEstado(t: number, dt: number) {
    const estado = getState();
    if (estado === "thinking") {
      ponerMorph("eye_look_up", 0.5 + ruido(t * 0.4, 8.8) * 0.12);
      ponerMorph("3", 0.28);
      rotLocal(huesos.Head, EJE_Z, 0.1 * AMP);
      rotLocal(huesos.Head, EJE_X, -0.05 * AMP);
      rotLocal(huesos.Neck, EJE_Z, 0.04 * AMP);
    } else if (estado === "talking") {
      visema.timer -= dt;
      if (visema.timer <= 0) {
        if (Math.random() < 0.12) {
          visema.actual = null; // pausa entre frases
          visema.timer = 0.25 + Math.random() * 0.3;
        } else {
          visema.actual = VISEMAS[(Math.random() * VISEMAS.length) | 0];
          visema.amp = 0.45 + Math.random() * 0.45;
          visema.timer = 0.09 + Math.random() * 0.09;
        }
      }
      for (const v of VISEMAS) {
        const objetivo = v === visema.actual ? visema.amp : 0;
        pesosVisema[v] = lerp(pesosVisema[v], objetivo, 1 - Math.exp(-dt * 22));
        ponerMorph(v, pesosVisema[v]);
      }
      rotLocal(huesos.Head, EJE_X, ruido(t * 2.6, 3.3) * 0.025 * AMP);
      rotLocal(huesos.Head, EJE_Y, ruido(t * 1.9, 6.6) * 0.02 * AMP);
    } else {
      for (const v of VISEMAS) {
        pesosVisema[v] = lerp(pesosVisema[v], 0, 1 - Math.exp(-dt * 10));
        ponerMorph(v, pesosVisema[v]);
      }
    }
  }

  function capaMirada(_t: number, dt: number) {
    const cabezaPos = huesos.Head.getWorldPosition(_v);

    if (puntero.valido) {
      // mapeo directo del cursor a una "ventana" frente a ella: monótono y
      // SIEMPRE responsivo, independiente de la distancia de la cámara.
      miradaObjetivo.set(
        puntero.x * 0.95,
        cabezaPos.y + puntero.y * 0.55,
        1.7,
      );
    } else {
      vistazo.timer -= dt;
      if (vistazo.timer <= 0) {
        vistazo.yaw = (Math.random() - 0.5) * 0.7;
        vistazo.pitch = (Math.random() - 0.4) * 0.3;
        vistazo.timer = 2 + Math.random() * 3;
      }
      miradaObjetivo.set(
        Math.sin(vistazo.yaw) * 2,
        cabezaPos.y + Math.tan(vistazo.pitch) * 2,
        Math.cos(vistazo.yaw) * 2,
      );
    }

    // al hablar o saludar, busca la cámara (sin dejar de atender al cursor)
    let pesoCamara = getState() === "talking" ? 0.45 : 0;
    if (reaccion?.def.mirarCamara) {
      const u = (reloj.elapsedTime - reaccion.t0) / reaccion.def.dur;
      pesoCamara = Math.max(
        pesoCamara,
        reaccion.def.mirarCamara * envolvente(u, 0.15, 0.25),
      );
    }
    if (pesoCamara > 0) miradaObjetivo.lerp(camara.position, pesoCamara);

    _v2.copy(miradaObjetivo).sub(cabezaPos);
    const objetivoYaw = clamp(Math.atan2(_v2.x, _v2.z), -0.6, 0.6);
    const objetivoPitch = clamp(
      Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z)),
      -0.32,
      0.38,
    );

    const k = 1 - Math.exp(-dt * 7.5);
    gazeSuave.yaw = lerp(gazeSuave.yaw, objetivoYaw, k);
    gazeSuave.pitch = lerp(gazeSuave.pitch, objetivoPitch, k);

    const { yaw, pitch } = gazeSuave;
    rotLocal(huesos.Spine2, EJE_Y, yaw * 0.1);
    rotLocal(huesos.Neck, EJE_Y, yaw * 0.3);
    rotLocal(huesos.Neck, EJE_X, -pitch * 0.25);
    rotLocal(huesos.Head, EJE_Y, yaw * 0.6);
    rotLocal(huesos.Head, EJE_X, -pitch * 0.6);
    if (pitch > 0.05) ponerMorph("eye_look_up", clamp((pitch - 0.05) * 1.8, 0, 0.8));
  }

  function capaRuidoVivo(t: number, energia: number) {
    const a = 0.011 * AMP * energia;
    rotLocal(huesos.Neck, EJE_X, ruido(t * 0.6, 2.2) * a);
    rotLocal(huesos.Neck, EJE_Y, ruido(t * 0.5, 5.5) * a);
    rotLocal(huesos.Head, EJE_Z, ruido(t * 0.45, 7.3) * a * 1.2);
    rotLocal(huesos.Head, EJE_X, ruido(t * 0.7, 9.1) * a);
  }

  function capaReaccion(t: number) {
    if (!reaccion) return;
    const u = (t - reaccion.t0) / reaccion.def.dur;
    if (u >= 1) {
      reaccion = null;
      return;
    }
    reaccion.def.fn(u, envolvente(u) * AMP);
  }

  function capaParpadeo(dt: number) {
    if (reaccion?.def.sinParpadeo) {
      blink.t = -1;
    } else {
      blink.proximo -= dt;
      if (blink.proximo <= 0 && blink.t < 0) {
        blink.t = 0;
        blink.doble = Math.random() < 0.18;
        blink.proximo = 2.2 + Math.random() * 4;
      }
      if (blink.t >= 0) {
        blink.t += dt;
        const u = blink.t;
        let v = 0;
        if (u < 0.07) v = easeOutCubic(u / 0.07);
        else if (u < 0.1) v = 1;
        else if (u < 0.24) v = 1 - easeInOutQuad((u - 0.1) / 0.14);
        else if (blink.doble) {
          blink.doble = false;
          blink.t = 0;
        } else blink.t = -1;
        ponerMorph("eye_close", v);
      }
    }
    if (getState() === "thinking") ponerMorph("eye_close", 0.12);
  }

  function capaVidaPropia(dt: number) {
    if (reducirMovimiento || reaccion || getState() !== "idle") return;
    autoTimer -= dt;
    if (autoTimer > 0) return;
    autoTimer = 6 + Math.random() * 9;
    const sutiles = ["ladearCabeza", "asentirSuave", "labios", "hombrosRoll"] as const;
    dispararReaccion(sutiles[(Math.random() * sutiles.length) | 0]);
  }

  // ---------------------------------------------------------------- bucle
  function bucle() {
    rafId = requestAnimationFrame(bucle);
    if (!visible || !avatar) return;
    const dt = Math.min(reloj.getDelta(), 0.05);
    const t = reloj.elapsedTime;

    for (const n of MORPHS_USADOS) morphFrame[n] = 0;
    for (const [nombre, h] of Object.entries(huesos)) {
      h.quaternion.copy(reposo[nombre].q);
      h.position.copy(reposo[nombre].p);
    }

    const estado = getState();
    const energia = estado === "talking" ? 1.35 : estado === "thinking" ? 0.8 : 1;

    capaRespiracion(t, energia);
    capaBalanceo(t);
    capaEstado(t, dt);
    capaMirada(t, dt);
    capaRuidoVivo(t, energia);
    capaReaccion(t);
    capaParpadeo(dt);
    capaVidaPropia(dt);

    aplicarMorphs();
    actualizarColliders();
    renderer.render(escena, camara);
  }

  // ---------------------------------------------------------------- dispose
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("click", onClick);
    io.disconnect();
    ro.disconnect();
    draco.dispose();
    escena.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m?.dispose();
      }
    });
    renderer.dispose();
  };
}

// ---------------------------------------------------------------- componente
export default function MaiaAvatar3D({
  state,
  onReady,
}: {
  state: AvatarState;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<AvatarState>(state);
  const onReadyRef = useRef(onReady);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState<unknown>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let desmontado = false;
    let dispose: (() => void) | null = null;
    try {
      dispose = crearSistemaMaia({
        canvas,
        getState: () => stateRef.current,
        onReady: () => {
          if (desmontado) return;
          setListo(true);
          onReadyRef.current?.();
        },
        onError: (e) => {
          if (!desmontado) setFallo(e);
        },
      });
    } catch (e) {
      setFallo(e);
    }
    return () => {
      desmontado = true;
      dispose?.();
    };
  }, []);

  // Propagar el fallo en render para que el ErrorBoundary de index.tsx
  // muestre el avatar estático (mismo comportamiento que con visage).
  if (fallo) throw fallo;

  return (
    <div className="relative h-full w-full">
      {/* canvas con pointer-events:none — la rueda/clic pasan a la página;
          mirada y reacciones se escuchan en window (ver crearSistemaMaia). */}
      <canvas
        ref={canvasRef}
        className="h-full w-full transition-opacity duration-700"
        style={{ pointerEvents: "none", opacity: listo ? 1 : 0 }}
      />
      {/* placeholder vivo mientras carga el GLB, como antes */}
      {!listo && (
        <div className="absolute inset-0">
          <MaiaAvatarStatic state={state} />
        </div>
      )}
    </div>
  );
}
