import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import qrcode from 'qrcode-generator';
import { exportRoot } from '@/lib/exportRoot';
import { useStore } from '@/data/store';

type MV = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': MV;
    }
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exportGlb(): Promise<Blob> {
  const st = useStore.getState();
  const prev = { assembly: st.assembly, roofOff: st.roofOff, doorOpen: st.doorOpen, assemblyPlaying: st.assemblyPlaying };
  st.set({ assembly: 1, roofOff: false, assemblyPlaying: false });
  await wait(500); // Animationszustand einschwingen lassen
  const src = exportRoot.house;
  if (!src) throw new Error('Haus nicht bereit');
  const clone = src.clone(true);
  const wrap = new THREE.Group();
  wrap.add(clone);
  wrap.position.y = 0.07; // Unterkante der Unterkonstruktion auf y = 0
  wrap.updateMatrixWorld(true);
  const buf = (await new GLTFExporter().parseAsync(wrap, { binary: true, onlyVisible: true, maxTextureSize: 1024 })) as ArrayBuffer;
  st.set(prev);
  return new Blob([buf], { type: 'model/gltf-binary' });
}

export default function ArModal() {
  const set = useStore((s) => s.set);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState('');
  const isTouch = useMemo(() => matchMedia('(pointer: coarse)').matches, []);

  useEffect(() => {
    let revoke: string | null = null;
    let dead = false;
    (async () => {
      try {
        await import('@google/model-viewer');
        const blob = await exportGlb();
        if (dead) return;
        revoke = URL.createObjectURL(blob);
        setSize((blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB');
        setUrl(revoke);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      dead = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, []);

  const qr = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(location.origin + location.pathname + '?ar=1');
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, []);

  const close = () => set({ arOpen: false });
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Augmented Reality" onClick={close}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Im eigenen Garten ansehen</h3>
        {err && <p>Das Modell konnte nicht erzeugt werden: {err}</p>}
        {!url && !err && <p>Modell wird für AR erzeugt …</p>}
        {url && (
          <model-viewer
            src={url}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1.1"
            exposure="1"
            environment-image="neutral"
            alt="Gartenhaus Bergen 400 × 300 cm als 3D-Modell in Originalgröße"
          >
            <button slot="ar-button" className="btn primary" style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
              In AR starten
            </button>
          </model-viewer>
        )}
        {!isTouch && (
          <>
            <p>Auf dem Smartphone scannen – das Haus erscheint in Originalgröße (4 × 3 m) auf Ihrer Terrasse oder im Garten.</p>
            <div className="qr" aria-label="QR-Code" dangerouslySetInnerHTML={{ __html: qr }} />
          </>
        )}
        <p>{size && `Modellgröße ${size}. `}Die aktuelle Konfiguration (Farben, Dach, Rinne) wird übernommen.</p>
        <div className="modal-actions">
          <button className="btn" onClick={close}>Schließen</button>
        </div>
      </div>
    </div>
  );
}
