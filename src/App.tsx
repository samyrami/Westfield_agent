import { BackgroundOrbs } from "@/components/BackgroundOrbs";
import { LiveDemo } from "@/components/LiveDemo";
import { useDisableZoom } from "@/lib/useDisableZoom";

export default function App() {
  // Bloquea cualquier zoom del navegador (Cmd+/-, pinch, ctrl+scroll)
  useDisableZoom();

  // Vista mínima para incrustar en Canvas: sólo Maia (avatar + chat).
  // Se quitaron navbar, secciones explicativas y footer — todo eso vive
  // ahora dentro de Canvas. Se mantiene el fondo (BackgroundOrbs + gradientes).
  return (
    <div className="relative min-h-screen bg-bg text-fg font-sans antialiased overflow-x-hidden">
      <BackgroundOrbs />
      <main className="relative z-10">
        <LiveDemo />
      </main>
    </div>
  );
}
