/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL absoluto del backend Maia (override para builds de prod cross-origin). */
  readonly VITE_API_BASE_URL?: string;
  /** Backend al que apunta el proxy de Vite en dev (default: http://3.16.91.222:8080). */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
