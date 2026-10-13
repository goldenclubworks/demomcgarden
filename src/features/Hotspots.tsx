import { useState } from 'react';
import { Html } from '@react-three/drei';
import { useStore } from '@/data/store';
import { SPEC, frontOpenings } from '@/model/spec';

const mm = (v: number) => v / 1000;

interface Spot {
  id: string;
  pos: [number, number, number];
  title: string;
  text: string;
}

/** Verkaufsargumente an den Bauteilen – Inhalte aus der Produktbeschreibung (mcgarden24.de). */
export function Hotspots() {
  const on = useStore((s) => s.hotspots);
  const mirrored = useStore((s) => s.mirrored);
  const preset = useStore((s) => s.preset);
  const assembled = useStore((s) => s.assembly >= 1);
  const [open, setOpen] = useState<string | null>(null);
  if (!on || preset === 'interior' || !assembled) return null;
  const o = frontOpenings(mirrored);
  const D = mm(SPEC.outerZ) / 2;
  const spots: Spot[] = [
    {
      id: 'wall',
      pos: [mm(-SPEC.outerX / 2) + 0.02, 1.05, D],
      title: '34-mm-Blockbohlen',
      text: 'Kammergetrocknete nordische Fichte, Doppelnut und Feder, 4-fach Eckausfräsung. Keine Säge-Arbeiten nötig: stecken und schrauben.',
    },
    {
      id: 'door',
      pos: [mm((o.door.x0 + o.door.x1) / 2), 1.55, D + 0.06],
      title: 'Doppeltür 145 × 203,5 cm',
      text: 'Leimholzrahmen, durchgehende Sprossen, Echtglas, Edelstahl-Scharniere, Drückergarnitur aus Aluminium und Zylinderschloss. Klick auf die Tür öffnet sie.',
    },
    {
      id: 'window',
      pos: [mm((o.window.x0 + o.window.x1) / 2), 1.3, D + 0.06],
      title: 'Sprossenfenster 55 × 189 cm',
      text: 'Feststehend verglast, passend zur Tür gegliedert.',
    },
    {
      id: 'roof',
      pos: [mm(SPEC.outerX) / 2 - 0.5, 2.3, 0.9],
      title: 'Pultdach, 3,1° Neigung',
      text: 'OSB-Dachplatte und drei Pfetten im Lieferumfang. Eindeckung wählbar: Dachpappe, Bitumen, EPDM oder Trapezblech.',
    },
    {
      id: 'base',
      pos: [mm(SPEC.outerX) / 2 - 0.9, -0.02, D - 0.1],
      title: 'Unterkonstruktion',
      text: 'Acht Lagerhölzer auf zwei Unterlegehölzern – das Haus wird von unten belüftet. Ebene, vollflächige Unterlage erforderlich.',
    },
  ];
  return (
    <group>
      {spots.map((s) => (
        <Html key={s.id} position={s.pos} center zIndexRange={[15, 0]}>
          <div className={`spot${open === s.id ? ' open' : ''}`}>
            <button className="spot-dot" aria-label={s.title} aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)} />
            {open === s.id && (
              <div className="spot-card" role="note">
                <b>{s.title}</b>
                <p>{s.text}</p>
              </div>
            )}
          </div>
        </Html>
      ))}
    </group>
  );
}
