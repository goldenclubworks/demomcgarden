import { Html, Line } from '@react-three/drei';
import { useStore } from '@/data/store';
import { SPEC, frontOpenings } from '@/model/spec';

type V = [number, number, number];
const mm = (v: number) => v / 1000;
const fmt = (v: number) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 1 })} mm`;

function Dim({ a, b, label, tick = [0, 0.05, 0] }: { a: V; b: V; label: string; tick?: V }) {
  const t = (p: V, s: number): V => [p[0] + tick[0] * s, p[1] + tick[1] * s, p[2] + tick[2] * s];
  const mid: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const line = { color: '#ffd37a', lineWidth: 1.6, depthTest: false, transparent: true } as const;
  return (
    <group renderOrder={20}>
      <Line points={[a, b]} {...line} />
      <Line points={[t(a, -1), t(a, 1)]} {...line} />
      <Line points={[t(b, -1), t(b, 1)]} {...line} />
      <Html position={mid} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <span className="dim-label">{label}</span>
      </Html>
    </group>
  );
}

/** Bemaßung: alle Werte stammen aus spec.ts (Zeichnungen des Herstellers). */
export function Dimensions() {
  const on = useStore((s) => s.dimensions);
  const mirrored = useStore((s) => s.mirrored);
  if (!on) return null;
  const o = frontOpenings(mirrored);
  const W = mm(SPEC.outerX) / 2;
  const D = mm(SPEC.outerZ) / 2;
  const zf = D + 0.28;
  return (
    <group>
      <Dim a={[-W, 0, zf]} b={[W, 0, zf]} label={`Breite ${fmt(SPEC.outerX)}`} tick={[0, 0, 0.06]} />
      <Dim a={[W + 0.32, 0, -D]} b={[W + 0.32, 0, D]} label={`Tiefe ${fmt(SPEC.outerZ)}`} tick={[0.06, 0, 0]} />
      <Dim a={[-W - 0.3, 0, D]} b={[-W - 0.3, mm(SPEC.heightFront), D]} label={`Höhe vorn ${fmt(SPEC.heightFront)}`} tick={[0.06, 0, 0]} />
      <Dim a={[-W - 0.3, 0, -D]} b={[-W - 0.3, mm(SPEC.heightBack), -D]} label={`Höhe hinten ${fmt(SPEC.heightBack)}`} tick={[0.06, 0, 0]} />
      <Dim a={[mm(o.door.x0), 0.02, D + 0.08]} b={[mm(o.door.x1), 0.02, D + 0.08]} label={`Tür ${fmt(o.door.x1 - o.door.x0)}`} tick={[0, 0.05, 0]} />
      <Dim a={[mm(o.window.x0), 0.02, D + 0.08]} b={[mm(o.window.x1), 0.02, D + 0.08]} label={`Fenster ${fmt(o.window.x1 - o.window.x0)}`} tick={[0, 0.05, 0]} />
      <Dim a={[mm(o.door.x0) - 0.14, 0, D + 0.08]} b={[mm(o.door.x0) - 0.14, mm(o.door.y1), D + 0.08]} label={`Tür ${fmt(SPEC.front.door.height)}`} tick={[0.05, 0, 0]} />
      <Dim a={[mm(o.window.x1) + 0.14, mm(o.window.y0), D + 0.08]} b={[mm(o.window.x1) + 0.14, mm(o.window.y1), D + 0.08]} label={`Fenster ${fmt(SPEC.front.window.height)}`} tick={[0.05, 0, 0]} />
    </group>
  );
}
