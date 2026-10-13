import { lazy, Suspense, useEffect, useRef } from 'react';
import { Scene } from '@/scene/Scene';
import { Panel } from '@/ui/Panel';
import { Toolbar } from '@/ui/Toolbar';
import { useStore } from '@/data/store';
import { de } from '@/i18n/de';
import { useEmbedBridge } from '@/embed/bridge';
import { useUrlConfig } from '@/lib/urlState';

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
      const next = Math.min(1, s.assembly + dt / (s.intro ? 11 : 16));
      s.set(next >= 1 ? { assembly: 1, assemblyPlaying: false, intro: false } : { assembly: next });
      if (next < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
  return null;
}

function IntroStarter() {
  const ready = useStore((s) => s.ready);
  useEffect(() => {
    const s = useStore.getState();
    if (!ready || !s.intro) return;
    s.set({ assembly: 0, assemblyPlaying: true });
    const skip = () => useStore.getState().set({ assembly: 1, assemblyPlaying: false, intro: false });
    const t = setTimeout(() => window.addEventListener('pointerdown', skip, { once: true }), 1200);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', skip);
    };
  }, [ready]);
  return null;
}

function Toast() {
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useStore.getState().set({ toast: null }), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return toast ? <div className="toast" role="status">{toast}</div> : null;
}

export function App() {
  const ready = useStore((s) => s.ready);
  const arOpen = useStore((s) => s.arOpen);
  const embed = new URLSearchParams(location.search).has('embed');
  useEmbedBridge();
  useUrlConfig();
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
      <IntroStarter />
      <Toast />
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
