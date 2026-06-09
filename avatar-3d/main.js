/**
 * Maia — avatar 3D interactivo (three.js puro, sin dependencias del sitio).
 *
 * Carga el mismo maia-avatar.glb del showcase y le da vida con animación
 * 100% procedural (sin clips): respiración, balanceo de peso, parpadeo,
 * mirada que sigue al cursor, micro-expresiones y reacciones one-shot
 * (saludo, asentir, negar, sorpresa, encogerse de hombros, celebrar).
 *
 * Datos del modelo (verificados parseando el GLB):
 *  - Rig "metarig" estilo Mixamo: Hips→Spine→Spine1→Spine2→Neck→Head,
 *    L/R Shoulder→Arm→ForeArm→Hand. Sin huesos de ojos. Viene en T-pose.
 *  - Morphs: body = 22 visemas de boca ('0'..'21') + 'eye_close';
 *    mesh eye = 'eye_look_up'. No hay morphs de sonrisa ni cejas, así que
 *    la emoción se expresa con lenguaje corporal (cabeza, hombros, torso).
 *  - Comprimido con Draco → DRACOLoader con decoder de CDN.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------- utilidades
const { lerp, clamp } = THREE.MathUtils;
const EJE_X = new THREE.Vector3(1, 0, 0);
const EJE_Y = new THREE.Vector3(0, 1, 0);
const EJE_Z = new THREE.Vector3(0, 0, 1);

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/** Rotación aditiva en espacio LOCAL del hueso (torso/cuello: ejes ≈ mundo). */
function rotLocal(hueso, eje, angulo) {
  _q.setFromAxisAngle(eje, angulo);
  hueso.quaternion.multiply(_q);
}

/** Rotación aditiva alrededor de un eje en espacio MUNDO (hombros/brazos). */
function rotMundo(hueso, ejeMundo, angulo) {
  hueso.parent.getWorldQuaternion(_pq);
  _q.setFromAxisAngle(ejeMundo, angulo);
  _q2.copy(_pq).invert().multiply(_q).multiply(_pq);
  hueso.quaternion.premultiply(_q2);
}

/** Pseudo-perlin barato: suma de senos incongruentes, ~[-1,1]. */
function ruido(t, semilla) {
  return (
    Math.sin(t * 1.7 + semilla) * 0.5 +
    Math.sin(t * 2.93 + semilla * 1.31) * 0.3 +
    Math.sin(t * 4.71 + semilla * 2.17) * 0.2
  );
}

const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const easeInOutQuad = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/** Envolvente ataque-meseta-salida para reacciones one-shot. */
function envolvente(u, ataque = 0.18, salida = 0.28) {
  if (u <= 0 || u >= 1) return 0;
  if (u < ataque) return easeOutCubic(u / ataque);
  if (u > 1 - salida) return easeInOutQuad((1 - u) / salida);
  return 1;
}

// movimiento reducido (accesibilidad): amplitudes al 45% y sin vida propia
const MOVIMIENTO_REDUCIDO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AMP = MOVIMIENTO_REDUCIDO ? 0.45 : 1;

// ---------------------------------------------------------------- escena base
const lienzo = document.getElementById("escena");
const cargaEl = document.getElementById("carga");
const cargaTexto = document.getElementById("carga-texto");
const cargaBarra = document.getElementById("carga-progreso");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
} catch (e) {
  cargaTexto.outerHTML = `<div class="error">Este navegador no soporta WebGL, que es necesario para ver a Maia en 3D.</div>`;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();

const camara = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 50);
camara.position.set(0.0, 1.32, 2.05);

const controles = new OrbitControls(camara, lienzo);
controles.target.set(0, 1.05, 0);
controles.enableDamping = true;
controles.dampingFactor = 0.06;
controles.enablePan = false;
controles.minDistance = 0.85;
controles.maxDistance = 3.4;
controles.minPolarAngle = 0.55;
controles.maxPolarAngle = 1.55;
controles.update();

lienzo.addEventListener("pointerdown", () => lienzo.classList.add("agarrando"));
window.addEventListener("pointerup", () => lienzo.classList.remove("agarrando"));

// ---------------------------------------------------------------- iluminación
// Estudio suave con la paleta Westfield: clave cálida, rim teal, relleno índigo.
const hemi = new THREE.HemisphereLight(0x8a88d8, 0x10142a, 0.85);
escena.add(hemi);

const clave = new THREE.DirectionalLight(0xfff1e0, 2.4);
clave.position.set(1.6, 2.6, 2.2);
clave.castShadow = true;
clave.shadow.mapSize.set(1024, 1024);
clave.shadow.camera.near = 0.5;
clave.shadow.camera.far = 8;
clave.shadow.camera.left = clave.shadow.camera.bottom = -1.6;
clave.shadow.camera.right = clave.shadow.camera.top = 1.6;
clave.shadow.bias = -0.0004;
clave.shadow.radius = 6;
escena.add(clave);

const rim = new THREE.DirectionalLight(0x5eead4, 1.5);
rim.position.set(-1.8, 1.8, -1.6);
escena.add(rim);

const relleno = new THREE.DirectionalLight(0x605be5, 0.7);
relleno.position.set(-1.2, 0.8, 2.0);
escena.add(relleno);

// ---------------------------------------------------------------- suelo
const suelo = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 64),
  new THREE.ShadowMaterial({ opacity: 0.34 }),
);
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);

const anillo = new THREE.Mesh(
  new THREE.RingGeometry(0.52, 0.56, 96),
  new THREE.MeshBasicMaterial({
    color: 0x605be5,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
anillo.rotation.x = -Math.PI / 2;
anillo.position.y = 0.002;
escena.add(anillo);

// ---------------------------------------------------------------- estado global
const huesos = {};            // nombre → THREE.Bone
const reposo = {};            // nombre → { q, p } pose natural (post-corrección)
const morphRefs = {};         // nombre morph → [{ mesh, idx }]
let avatar = null;

const VISEMAS = ["1", "3", "8", "2", "19", "6"]; // bocas útiles para "hablar"
const MORPHS_USADOS = [...VISEMAS, "0", "21", "eye_close", "eye_look_up"];
const morphFrame = {};        // acumulador por frame
const pesosVisema = {};       // pesos suavizados del silabeo
for (const v of VISEMAS) pesosVisema[v] = 0;

let estado = "idle";          // idle | thinking | talking
let vidaPropia = !MOVIMIENTO_REDUCIDO;
let reaccion = null;          // { def, t0, sutil }
let blink = { proximo: 1.8, t: -1, doble: false };
let visema = { actual: null, timer: 0, amp: 0.7 };
let autoTimer = 6;
let gazeSuave = { yaw: 0, pitch: 0 };
let vistazo = { yaw: 0, pitch: 0, timer: 2.5 };   // sacadas cuando no hay cursor
let puntero = { x: 0, y: 0, dentro: false, ultimoMov: -10 };

const planoMirada = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.85);
const rayo = new THREE.Raycaster();
const miradaObjetivo = new THREE.Vector3(0, 1.28, 2.0);

// poses de brazo precomputadas (quaterniones locales)
const poses = {};

// ---------------------------------------------------------------- carga del GLB
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
const cargador = new GLTFLoader();
cargador.setDRACOLoader(draco);

cargador.load(
  "./maia-avatar.glb",
  (gltf) => {
    avatar = gltf.scene;
    escena.add(avatar);

    avatar.traverse((o) => {
      if (o.isBone) huesos[o.name] = o;
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false; // los skinned mesh recortan mal al animar
        if (o.morphTargetDictionary) {
          for (const [nombre, idx] of Object.entries(o.morphTargetDictionary)) {
            (morphRefs[nombre] ??= []).push({ mesh: o, idx });
          }
        }
      }
    });

    corregirPoseT();
    capturarReposo();
    precomputarPosesBrazo();
    crearColliders();

    cargaEl.classList.add("oculto");
    requestAnimationFrame(bucle);
  },
  (ev) => {
    const total = ev.total || 3366868;
    cargaBarra.style.width = `${Math.min(100, (ev.loaded / total) * 100)}%`;
  },
  (err) => {
    console.error("✗ No se pudo cargar el avatar:", err);
    cargaTexto.outerHTML = `<div class="error">No se pudo cargar <code>maia-avatar.glb</code>.<br>
      Sirve esta carpeta con un servidor local (por ejemplo <code>npx serve .</code>) —
      abrir el archivo directamente con <code>file://</code> no funciona.</div>`;
  },
);

/** El GLB viene en T-pose: baja los brazos alineando cada cadena en mundo. */
function corregirPoseT() {
  // izquierda = +X en mundo, derecha = −X
  alinear("LeftArm", "LeftForeArm", new THREE.Vector3(0.2, -0.97, 0.03));
  alinear("LeftForeArm", "LeftHand", new THREE.Vector3(0.12, -0.95, 0.22));
  alinear("RightArm", "RightForeArm", new THREE.Vector3(-0.2, -0.97, 0.03));
  alinear("RightForeArm", "RightHand", new THREE.Vector3(-0.12, -0.95, 0.22));
}

/** Rota `hueso` para que la dirección hacia `hijo` apunte a `dirMundo`. */
function alinear(nombreHueso, nombreHijo, dirMundo) {
  const hueso = huesos[nombreHueso];
  const hijo = huesos[nombreHijo];
  if (!hueso || !hijo) return;
  avatar.updateMatrixWorld(true);
  const a = hueso.getWorldPosition(new THREE.Vector3());
  const b = hijo.getWorldPosition(new THREE.Vector3());
  const actual = b.sub(a).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(actual, dirMundo.clone().normalize());
  const pw = hueso.parent.getWorldQuaternion(new THREE.Quaternion());
  const corr = pw.clone().invert().multiply(delta).multiply(pw);
  hueso.quaternion.premultiply(corr);
}

function capturarReposo() {
  avatar.updateMatrixWorld(true);
  for (const [nombre, h] of Object.entries(huesos)) {
    reposo[nombre] = { q: h.quaternion.clone(), p: h.position.clone() };
  }
}

/** Captura poses clave de brazo (saludo, palmas de "no sé") y restaura reposo. */
function precomputarPosesBrazo() {
  const capturar = (pares) => {
    for (const [hueso, hijo, dir] of pares) alinear(hueso, hijo, dir);
    const out = {};
    for (const [hueso] of pares) out[hueso] = huesos[hueso].quaternion.clone();
    for (const [nombre, h] of Object.entries(huesos)) {
      h.quaternion.copy(reposo[nombre].q);
    }
    avatar.updateMatrixWorld(true);
    return out;
  };

  // saludo: brazo derecho arriba-afuera, antebrazo casi vertical
  poses.saludo = capturar([
    ["RightArm", "RightForeArm", new THREE.Vector3(-0.62, 0.5, 0.1)],
    ["RightForeArm", "RightHand", new THREE.Vector3(-0.18, 0.96, 0.12)],
  ]);

  // "no sé": ambos antebrazos hacia afuera y adelante (palmas abiertas)
  poses.palmas = capturar([
    ["LeftForeArm", "LeftHand", new THREE.Vector3(0.5, -0.32, 0.78)],
    ["RightForeArm", "RightHand", new THREE.Vector3(-0.5, -0.32, 0.78)],
  ]);
}

// ---------------------------------------------------------------- morphs
function ponerMorph(nombre, valor) {
  morphFrame[nombre] = Math.max(morphFrame[nombre] ?? 0, valor);
}

function aplicarMorphs() {
  for (const nombre of MORPHS_USADOS) {
    const v = clamp(morphFrame[nombre] ?? 0, 0, 1);
    const refs = morphRefs[nombre];
    if (!refs) continue;
    for (const r of refs) r.mesh.morphTargetInfluences[r.idx] = v;
  }
}

// ---------------------------------------------------------------- reacciones
// Cada reacción es una función de (u∈[0,1], env, t) que suma offsets sobre la pose.
const REACCIONES = {
  saludar: {
    dur: 2.6, msg: "¡Hola!", mirarCamara: 0.85,
    fn(u, env, t) {
      const s = env;
      huesos.RightArm.quaternion.slerp(poses.saludo.RightArm, s);
      huesos.RightForeArm.quaternion.slerp(poses.saludo.RightForeArm, s);
      // vaivén del antebrazo + muñeca suelta
      rotMundo(huesos.RightForeArm, EJE_Z, Math.sin(u * Math.PI * 7) * 0.34 * s);
      rotMundo(huesos.RightHand, EJE_Z, Math.sin(u * Math.PI * 7 + 0.6) * 0.18 * s);
      rotLocal(huesos.Head, EJE_Z, -0.09 * s);
      rotLocal(huesos.Spine1, EJE_Z, 0.04 * s);
      ponerMorph("1", 0.3 * envolvente(u, 0.1, 0.55));
    },
  },
  asentir: {
    dur: 1.3, msg: "Ajá",
    fn(u, env) {
      const ang = Math.sin(u * Math.PI * 4) * 0.16 * env;
      rotLocal(huesos.Head, EJE_X, ang);
      rotLocal(huesos.Neck, EJE_X, ang * 0.45);
      ponerMorph("8", 0.18 * env);
    },
  },
  negar: {
    dur: 1.45, msg: "Mmm… no",
    fn(u, env) {
      const ang = Math.sin(u * Math.PI * 5) * 0.14 * env;
      rotLocal(huesos.Head, EJE_Y, ang);
      rotLocal(huesos.Neck, EJE_Y, ang * 0.4);
      ponerMorph("3", 0.25 * env);
    },
  },
  sorpresa: {
    dur: 1.6, msg: "¡Oh!", mirarCamara: 0.9, sinParpadeo: true,
    fn(u, env) {
      rotLocal(huesos.Spine1, EJE_X, -0.06 * env);   // se echa atrás
      rotLocal(huesos.Head, EJE_X, -0.1 * env);
      rotMundo(huesos.LeftShoulder, EJE_Z, 0.16 * env);   // hombros arriba
      rotMundo(huesos.RightShoulder, EJE_Z, -0.16 * env);
      huesos.Hips.position.y += -0.012 * env;        // mini agachada del susto
      ponerMorph("1", 0.85 * env);                   // boca muy abierta
      ponerMorph("eye_look_up", 0.3 * env);
    },
  },
  encogerse: {
    dur: 1.9, msg: "Ni idea…",
    fn(u, env) {
      rotMundo(huesos.LeftShoulder, EJE_Z, 0.27 * env);
      rotMundo(huesos.RightShoulder, EJE_Z, -0.27 * env);
      huesos.LeftForeArm.quaternion.slerp(poses.palmas.LeftForeArm, env * 0.85);
      huesos.RightForeArm.quaternion.slerp(poses.palmas.RightForeArm, env * 0.85);
      rotLocal(huesos.Head, EJE_Z, 0.13 * env);      // cabeza ladeada
      ponerMorph("3", 0.4 * env);                    // boquita fruncida
    },
  },
  celebrar: {
    dur: 1.8, msg: "¡Eso es!", mirarCamara: 0.6,
    fn(u, env, t) {
      const rebote = Math.abs(Math.sin(u * Math.PI * 3));
      huesos.Hips.position.y += (-0.028 + rebote * 0.04) * env;
      rotMundo(huesos.LeftArm, EJE_Z, 0.22 * env * rebote);
      rotMundo(huesos.RightArm, EJE_Z, -0.22 * env * rebote);
      rotMundo(huesos.LeftShoulder, EJE_Z, 0.1 * env * rebote);
      rotMundo(huesos.RightShoulder, EJE_Z, -0.1 * env * rebote);
      rotLocal(huesos.Head, EJE_Z, Math.sin(u * Math.PI * 3) * 0.1 * env);
      ponerMorph("1", 0.4 * env * rebote);
      ponerMorph("eye_close", 0.45 * env);           // ojitos felices
    },
  },
  // --- sutiles (vida propia) ---
  ladearCabeza: {
    dur: 2.6, sutil: true,
    fn(u, env) {
      rotLocal(huesos.Head, EJE_Z, 0.11 * env);
      rotLocal(huesos.Neck, EJE_Z, 0.04 * env);
    },
  },
  asentirSuave: {
    dur: 1.4, sutil: true,
    fn(u, env) {
      rotLocal(huesos.Head, EJE_X, Math.sin(u * Math.PI * 2) * 0.07 * env);
    },
  },
  labios: {
    dur: 1.2, sutil: true,
    fn(u, env) { ponerMorph("21", 0.45 * env); },
  },
  hombrosRoll: {
    dur: 2.2, sutil: true,
    fn(u, env) {
      const a = Math.sin(u * Math.PI * 2) * 0.06 * env;
      rotMundo(huesos.LeftShoulder, EJE_Z, a);
      rotMundo(huesos.RightShoulder, EJE_Z, a * 0.7);
      rotLocal(huesos.Spine2, EJE_X, 0.02 * env);
    },
  },
};

const chipEstado = document.getElementById("chip-estado");
const burbuja = document.getElementById("burbuja");
let burbujaTimer = null;

function decir(texto) {
  if (!texto) return;
  burbuja.textContent = texto;
  burbuja.classList.add("visible");
  clearTimeout(burbujaTimer);
  burbujaTimer = setTimeout(() => burbuja.classList.remove("visible"), 1700);
}

function dispararReaccion(nombre, mensaje = true) {
  const def = REACCIONES[nombre];
  if (!def || !avatar) return;
  reaccion = { def, t0: reloj.elapsedTime, nombre };
  if (mensaje && def.msg) decir(def.msg);
}

// ---------------------------------------------------------------- interacción
// Colliders invisibles que siguen a los huesos → clic en cabeza/hombros/cuerpo.
const matInvisible = new THREE.MeshBasicMaterial({ visible: false });
const colliders = [];

function crearColliders() {
  const defs = [
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
    huesos[c.userData.hueso].getWorldPosition(c.position).add(c.userData.off);
  }
}

const REACCION_POR_REGION = {
  cabeza: ["sorpresa", "¡Ey! ¿Y mi peinado?"],
  hombro: ["encogerse", "Jeje… ¿sí?"],
  cuerpo: ["celebrar", "¡Jaja, cosquillas!"],
};

let descenso = null;
lienzo.addEventListener("pointerdown", (e) => {
  descenso = { x: e.clientX, y: e.clientY, t: performance.now() };
});
lienzo.addEventListener("pointerup", (e) => {
  if (!descenso) return;
  const dist = Math.hypot(e.clientX - descenso.x, e.clientY - descenso.y);
  const dur = performance.now() - descenso.t;
  descenso = null;
  if (dist > 6 || dur > 450) return; // fue un arrastre de cámara, no un clic
  const region = regionBajoPuntero(e);
  if (region) {
    const [nombre, msg] = REACCION_POR_REGION[region];
    dispararReaccion(nombre, false);
    decir(msg);
  }
});

const _ndc = new THREE.Vector2();
function regionBajoPuntero(e) {
  _ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  rayo.setFromCamera(_ndc, camara);
  const hits = rayo.intersectObjects(colliders, false);
  return hits.length ? hits[0].object.userData.region : null;
}

window.addEventListener("pointermove", (e) => {
  puntero.x = (e.clientX / window.innerWidth) * 2 - 1;
  puntero.y = -(e.clientY / window.innerHeight) * 2 + 1;
  puntero.dentro = true;
  puntero.ultimoMov = reloj.elapsedTime;
  if (colliders.length) {
    lienzo.classList.toggle("tocable", !!regionBajoPuntero(e));
  }
});
document.addEventListener("pointerleave", () => (puntero.dentro = false));
window.addEventListener("blur", () => (puntero.dentro = false));

// botones de reacciones
document.querySelectorAll("[data-reaccion]").forEach((b) => {
  b.addEventListener("click", () => dispararReaccion(b.dataset.reaccion));
});

// botones de estado
const ETIQUETA_ESTADO = { idle: "en reposo", thinking: "pensando…", talking: "hablando" };
document.querySelectorAll("[data-estado]").forEach((b) => {
  b.addEventListener("click", () => {
    estado = b.dataset.estado;
    document.querySelectorAll("[data-estado]").forEach((x) => x.classList.toggle("activo", x === b));
    chipEstado.textContent = ETIQUETA_ESTADO[estado];
    chipEstado.className = "estado-chip" + (estado === "thinking" ? " pensando" : estado === "talking" ? " hablando" : "");
  });
});

document.getElementById("btn-vida").addEventListener("click", (e) => {
  vidaPropia = !vidaPropia;
  e.currentTarget.classList.toggle("activo", vidaPropia);
});

// ---------------------------------------------------------------- bucle
const reloj = new THREE.Clock();

function bucle() {
  requestAnimationFrame(bucle);
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;

  // 0) limpiar acumulador de morphs y volver a la pose de reposo
  for (const n of MORPHS_USADOS) morphFrame[n] = 0;
  for (const [nombre, h] of Object.entries(huesos)) {
    h.quaternion.copy(reposo[nombre].q);
    h.position.copy(reposo[nombre].p);
  }

  const energia = estado === "talking" ? 1.35 : estado === "thinking" ? 0.8 : 1;

  capaRespiracion(t, energia);
  capaBalanceo(t, energia);
  capaEstado(t, dt);
  capaMirada(t, dt);
  capaRuidoVivo(t, energia);
  capaReaccion(t);
  capaParpadeo(t, dt);
  capaVidaPropia(t, dt);

  aplicarMorphs();
  actualizarColliders();
  posicionarBurbuja();

  controles.update();
  renderer.render(escena, camara);
}

// 1) respiración: pecho, hombros y compensación de cabeza
function capaRespiracion(t, energia) {
  const f = estado === "thinking" ? 0.21 : 0.26;
  const resp = Math.sin(t * Math.PI * 2 * f);
  const a = 0.016 * AMP * (0.8 + 0.4 * energia);
  rotLocal(huesos.Spine2, EJE_X, resp * a);
  rotLocal(huesos.Spine1, EJE_X, resp * a * 0.45);
  rotLocal(huesos.Head, EJE_X, -resp * a * 0.5);
  rotMundo(huesos.LeftShoulder, EJE_Z, resp * 0.012 * AMP);
  rotMundo(huesos.RightShoulder, EJE_Z, -resp * 0.012 * AMP);
}

// 2) balanceo de peso: caderas + contracurva del torso
function capaBalanceo(t, energia) {
  const s = ruido(t * 0.32, 1.7) * AMP;
  const s2 = ruido(t * 0.21, 4.1) * AMP;
  huesos.Hips.position.x += s * 0.0065;
  huesos.Hips.position.y += Math.abs(s2) * -0.004;
  rotLocal(huesos.Hips, EJE_Z, s * 0.018);
  rotLocal(huesos.Spine, EJE_Z, -s * 0.02);
  rotLocal(huesos.Spine1, EJE_Y, s2 * 0.022);
  // brazos acompañan levísimamente para que no queden rígidos
  rotMundo(huesos.LeftArm, EJE_Z, s * 0.015 + 0.01);
  rotMundo(huesos.RightArm, EJE_Z, -s * 0.015 - 0.01);
  rotMundo(huesos.LeftForeArm, EJE_X, s2 * 0.012);
  rotMundo(huesos.RightForeArm, EJE_X, s2 * 0.012);
}

// 3) capa por estado: pensar (mirada arriba, fruncido) / hablar (visemas)
function capaEstado(t, dt) {
  if (estado === "thinking") {
    ponerMorph("eye_look_up", 0.5 + ruido(t * 0.4, 8.8) * 0.12);
    ponerMorph("3", 0.28);
    rotLocal(huesos.Head, EJE_Z, 0.1 * AMP);
    rotLocal(huesos.Head, EJE_X, -0.05 * AMP);
    rotLocal(huesos.Neck, EJE_Z, 0.04 * AMP);
  } else if (estado === "talking") {
    // silabeo: cada 90–180 ms cambia el visema objetivo (con pausas)
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
    // gesticulación: micro-asentimientos al ritmo del habla
    rotLocal(huesos.Head, EJE_X, ruido(t * 2.6, 3.3) * 0.025 * AMP);
    rotLocal(huesos.Head, EJE_Y, ruido(t * 1.9, 6.6) * 0.02 * AMP);
  } else {
    for (const v of VISEMAS) {
      pesosVisema[v] = lerp(pesosVisema[v], 0, 1 - Math.exp(-dt * 10));
      ponerMorph(v, pesosVisema[v]);
    }
  }
}

// 4) mirada: sigue al cursor (o deambula); cabeza+cuello+torso en cascada
function capaMirada(t, dt) {
  let objetivoYaw, objetivoPitch;

  const cabezaPos = huesos.Head.getWorldPosition(_v);

  if (puntero.dentro && t - puntero.ultimoMov < 5) {
    _ndc.set(puntero.x, puntero.y);
    rayo.setFromCamera(_ndc, camara);
    if (rayo.ray.intersectPlane(planoMirada, _v2)) miradaObjetivo.copy(_v2);
  } else {
    // deambular: sacadas suaves cada 2–5 s
    vistazo.timer -= dt;
    if (vistazo.timer <= 0) {
      vistazo.yaw = (Math.random() - 0.5) * 0.7;
      vistazo.pitch = (Math.random() - 0.4) * 0.3;
      vistazo.timer = 2 + Math.random() * 3;
    }
    miradaObjetivo.set(Math.sin(vistazo.yaw) * 2, cabezaPos.y + Math.tan(vistazo.pitch) * 2, Math.cos(vistazo.yaw) * 2);
  }

  // al hablar o saludar, busca la cámara
  let pesoCamara = estado === "talking" ? 0.6 : 0;
  if (reaccion?.def.mirarCamara) {
    const u = (t - reaccion.t0) / reaccion.def.dur;
    pesoCamara = Math.max(pesoCamara, reaccion.def.mirarCamara * envolvente(u, 0.15, 0.25));
  }
  if (pesoCamara > 0) miradaObjetivo.lerp(camara.position, pesoCamara);

  _v2.copy(miradaObjetivo).sub(cabezaPos);
  objetivoYaw = clamp(Math.atan2(_v2.x, _v2.z), -0.6, 0.6);
  objetivoPitch = clamp(Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z)), -0.32, 0.38);

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

// 5) ruido orgánico: nadie se queda perfectamente quieto
function capaRuidoVivo(t, energia) {
  const a = 0.011 * AMP * energia;
  rotLocal(huesos.Neck, EJE_X, ruido(t * 0.6, 2.2) * a);
  rotLocal(huesos.Neck, EJE_Y, ruido(t * 0.5, 5.5) * a);
  rotLocal(huesos.Head, EJE_Z, ruido(t * 0.45, 7.3) * a * 1.2);
  rotLocal(huesos.Head, EJE_X, ruido(t * 0.7, 9.1) * a);
}

// 6) reacción activa (one-shot sobre todo lo demás)
function capaReaccion(t) {
  if (!reaccion) return;
  const u = (t - reaccion.t0) / reaccion.def.dur;
  if (u >= 1) {
    reaccion = null;
    return;
  }
  reaccion.def.fn(u, envolvente(u) * AMP, t);
}

// 7) parpadeo: cierre rápido, apertura lenta, dobles ocasionales
function capaParpadeo(t, dt) {
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
      else if (blink.doble) { blink.doble = false; blink.t = 0; }
      else blink.t = -1;
      ponerMorph("eye_close", v);
    }
  }
  // al pensar, párpados un poco caídos
  if (estado === "thinking") ponerMorph("eye_close", 0.12);
}

// 8) vida propia: micro-acciones espontáneas en reposo
function capaVidaPropia(t, dt) {
  if (!vidaPropia || reaccion || estado !== "idle") return;
  autoTimer -= dt;
  if (autoTimer > 0) return;
  autoTimer = 6 + Math.random() * 9;
  const sutiles = ["ladearCabeza", "asentirSuave", "labios", "hombrosRoll"];
  dispararReaccion(sutiles[(Math.random() * sutiles.length) | 0], false);
}

// burbuja de diálogo anclada sobre la cabeza
function posicionarBurbuja() {
  if (!burbuja.classList.contains("visible") || !huesos.Head) return;
  huesos.Head.getWorldPosition(_v);
  _v.y += 0.22;
  _v.project(camara);
  const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
  burbuja.style.left = `${Math.round(x + 14)}px`;
  burbuja.style.top = `${Math.round(y - 40)}px`;
}

// ---------------------------------------------------------------- resize
window.addEventListener("resize", () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
