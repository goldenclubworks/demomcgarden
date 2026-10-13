import { useStore, type PresetId, type TimeOfDay } from '@/data/store';
import { de } from '@/i18n/de';
import { configOf } from '@/data/store';
import { configUrl } from '@/lib/urlState';

const VIEWS: PresetId[] = ['hero', 'front', 'side', 'back', 'top', 'interior'];
const TIMES: TimeOfDay[] = ['day', 'golden', 'night'];

export function Toolbar() {
  const s = useStore();
  const playAssembly = () => {
    if (s.assemblyPlaying) return s.set({ assemblyPlaying: false });
    s.set({ assembly: s.assembly >= 1 ? 0 : s.assembly, assemblyPlaying: true });
  };
  const photo = () => {
    const c = document.querySelector('canvas');
    c?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'gartenhaus-bergen.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      s.set({ toast: 'Foto gespeichert' });
    }, 'image/png');
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(configUrl(configOf(s)));
      s.set({ toast: 'Link zur Konfiguration kopiert' });
    } catch {
      s.set({ toast: 'Kopieren nicht möglich' });
    }
  };
  return (
    <nav className="toolbar" aria-label="Ansicht">
      <div className="group" role="radiogroup" aria-label="Kamera">
        {VIEWS.map((v) => (
          <button key={v} className={s.preset === v ? 'on' : ''} onClick={() => s.set({ preset: v, view: v === 'interior' ? 'interior' : 'orbit' })} role="radio" aria-checked={s.preset === v}>
            {de.views[v]}
          </button>
        ))}
      </div>
      <div className="group">
        <button className={s.dimensions ? 'on' : ''} onClick={() => s.set({ dimensions: !s.dimensions })} aria-pressed={s.dimensions}>{de.tools.dims}</button>
        <button className={s.roofOff ? 'on' : ''} onClick={() => s.set({ roofOff: !s.roofOff })} aria-pressed={s.roofOff}>{de.tools.roofOff}</button>
        <button className={s.doorOpen > 0.5 ? 'on' : ''} onClick={() => s.set({ doorOpen: s.doorOpen > 0.5 ? 0 : 1 })} aria-pressed={s.doorOpen > 0.5}>{de.tools.door}</button>
      </div>
      <div className="group" role="radiogroup" aria-label="Tageszeit">
        {TIMES.map((t) => (
          <button key={t} className={s.time === t ? 'on' : ''} onClick={() => s.set({ time: t })} role="radio" aria-checked={s.time === t}>
            {de.tools[t]}
          </button>
        ))}
      </div>
      <div className="group assembly">
        <button className={s.assemblyPlaying ? 'on' : ''} onClick={playAssembly}>{s.assemblyPlaying ? 'Pause' : `${de.tools.assembly} ▶`}</button>
        <input type="range" min={0} max={1000} value={Math.round(s.assembly * 1000)} aria-label="Aufbaufortschritt" onChange={(e) => s.set({ assembly: +e.target.value / 1000, assemblyPlaying: false })} />
      </div>
      <div className="group">
        <button className={s.hotspots ? 'on' : ''} onClick={() => s.set({ hotspots: !s.hotspots })} aria-pressed={s.hotspots}>Details</button>
        <button onClick={photo}>Foto</button>
        <button onClick={share}>Link</button>
        <button className="accent" onClick={() => s.set({ arOpen: true })}>{de.tools.ar}</button>
      </div>
    </nav>
  );
}
