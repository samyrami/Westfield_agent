/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL absoluto del backend Maia (override para builds de prod cross-origin). */
  readonly VITE_API_BASE_URL?: string;
  /** Backend al que apunta el proxy de Vite en dev (default: http://3.16.91.222:8080). */
  readonly VITE_API_PROXY_TARGET?: string;
  /** URL/ruta del GLB del avatar de Maia. Default: /avatars/maia-avatar.glb */
  readonly VITE_MAIA_AVATAR_URL?: string;
  /** URL/ruta de un GLB de animación idle opcional (si el avatar aparece en T-pose). */
  readonly VITE_MAIA_AVATAR_ANIMATION?: string;
  /** URL/ruta de un GLB de pose estática (corrige T-pose sin animación). Default: /avatars/pose.glb */
  readonly VITE_MAIA_AVATAR_POSE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
