import { lazy, Suspense, useEffect, useRef } from 'react';
import { Scene } from '@/scene/Scene';
import { Panel } from '@/ui/Panel';
import { Toolbar } from '@/ui/Toolbar';
import { useStore } from '@/data/store';
import { de } from '@/i18n/de';
import { useEmbedBridge } from '@/embed/bridge';

const ArModal = lazy(() => import('@/features/ArModal'));

function AssemblyDriver() {
  const raf = useRef(0);
  const playing = useStore((s) => s.assemblyPlaying);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = useStore.getState();
      const next = Math.min(1, s.assembly + dt / 16);
      s.set(next >= 1 ? { assembly: 1, assemblyPlaying: false } : { assembly: next });
      if (next < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
  return null;
}

export function App() {
  const ready = useStore((s) => s.ready);
  const arOpen = useStore((s) => s.arOpen);
  const embed = new URLSearchParams(location.search).has('embed');
  useEmbedBridge();
  useEffect(() => {
    if (new URLSearchParams(location.search).get('ar') === '1') useStore.getState().set({ arOpen: true });
  }, []);
  return (
    <div className={`app${embed ? ' embed' : ''}`}>
      <div className="stage">
        <Scene />
      </div>
      <header className="brand">
        <div className="brand-mark" aria-hidden />
        <div>
          <h1>{de.title}</h1>
          <p>{de.subtitle}</p>
        </div>
        <span className="chip">{de.demo}</span>
      </header>
      <Toolbar />
      <Panel />
      <AssemblyDriver />
      {arOpen && (
        <Suspense fallback={null}>
          <ArModal />
        </Suspense>
      )}
      <div className={`loader${ready ? ' done' : ''}`} role="status">
        <div className="loader-ring" />
        <span>{de.loading}</span>
      </div>
    </div>
  );
}
