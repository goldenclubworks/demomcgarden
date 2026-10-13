import * as THREE from 'three';
import { SPEC, frontOpenings, roofUnderside } from '../spec';
import { assignWoodUV, merge, rng, splitExtrude } from './wood';

const { wall } = SPEC;
const T = wall.thickness;
const H = wall.courseH;
const TG = wall.tongueH;
const C = wall.chamfer;

/** Bohlenprofil (Doppelnut/-feder, gefaste Sichtkanten) in (t = Wandstärke, y = Höhe), Maße in mm. */
function logShape(): THREE.Shape {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [C, 0],
    [5.5, 0], [5.5, TG], [13.5, TG], [13.5, 0],
    [20.5, 0], [20.5, TG], [28.5, TG], [28.5, 0],
    [T - C, 0], [T, C], [T, H - C], [T - C, H],
    [28, H], [28, H + TG], [21, H + TG], [21, H],
    [13, H], [13, H + TG], [6, H + TG], [6, H],
    [C, H], [0, H - C], [0, C],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/** Gefaster Rechteckquerschnitt für Passstücke (Sturz, Brüstung) mit beliebiger Höhe. */
function boxShape(h: number): THREE.Shape {
  const c = Math.min(C, h / 3);
  const s = new THREE.Shape();
  s.moveTo(c, 0);
  s.lineTo(T - c, 0); s.lineTo(T, c); s.lineTo(T, h - c); s.lineTo(T - c, h);
  s.lineTo(c, h); s.lineTo(0, h - c); s.lineTo(0, c);
  s.closePath();
  return s;
}

type WallId = 'front' | 'back' | 'left' | 'right';
const IN_X = wall.runX / 2 - T; // 1866: Innenfläche der Seitenwand
const IN_Z = wall.runZ / 2 - T; // 1366: Innenfläche Front/Rück
const OUT_X = wall.runX / 2 + wall.cornerOverhang; // 1990
const OUT_Z = wall.runZ / 2 + wall.cornerOverhang; // 1490

/** Lokal (t, y, zl) → Welt für eine Wand; Rotation um Y, danach Verschiebung. */
function wallMatrix(id: WallId, a: number, b: number, y0: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  switch (id) {
    case 'front': // Länge läuft nach −X, nach außen +Z
      return m.makeRotationY(-Math.PI / 2).setPosition(b, y0, IN_Z);
    case 'back':
      return m.makeRotationY(Math.PI / 2).setPosition(a, y0, -IN_Z);
    case 'right':
      return m.makeRotationY(0).setPosition(IN_X, y0, a);
    case 'left':
      return m.makeRotationY(Math.PI).setPosition(-IN_X, y0, b);
  }
}

export interface CoursePart {
  sides: THREE.BufferGeometry[];
  caps: THREE.BufferGeometry[];
}

export interface WallParts {
  /** je Lage (0 … 14, 14 = Keillage) gemergte Geometrie in Metern */
  courses: { sides: THREE.BufferGeometry | null; caps: THREE.BufferGeometry | null }[];
}

interface Seg {
  wall: WallId;
  course: number;
  a: number; // Anfang längs der Wand (Weltkoordinate x bzw. z)
  b: number;
  y0: number;
  h: number;
  kind: 'log' | 'box';
}

function pushSeg(parts: CoursePart[], seg: Seg, rand: () => number) {
  const len = seg.b - seg.a;
  if (len < 1 || seg.h < 1) return;
  const shape = seg.kind === 'log' ? logShape() : boxShape(seg.h);
  const ex = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 });
  const { caps, sides } = splitExtrude(ex);
  for (const g of [caps, sides]) {
    assignWoodUV(g, 2, rand);
    g.applyMatrix4(wallMatrix(seg.wall, seg.a, seg.b, seg.y0));
  }
  parts[seg.course].caps.push(caps);
  parts[seg.course].sides.push(sides);
}

/** Keil-Lage der Seitenwände (Oberseite folgt der Dachneigung). */
function wedge(id: 'left' | 'right', rand: () => number): THREE.BufferGeometry[] {
  const zF = IN_Z, zB = -IN_Z;
  const y0 = SPEC.stack;
  const topF = roofUnderside(zF) - y0, topB = roofUnderside(zB) - y0;
  // rechts: lokal x = −z (RotY +90°), links: lokal x = +z (RotY −90°)
  const sx = id === 'right' ? -1 : 1;
  const s = new THREE.Shape();
  const xs = sx === 1 ? [zB, zF] : [-zF, -zB];
  const tops = sx === 1 ? [topB, topF] : [topF, topB];
  s.moveTo(xs[0], 0); s.lineTo(xs[1], 0); s.lineTo(xs[1], tops[1]); s.lineTo(xs[0], tops[0]); s.closePath();
  const ex = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 1 });
  const { caps, sides } = splitExtrude(ex);
  const m =
    id === 'right'
      ? new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(IN_X, y0, 0)
      : new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(-IN_X, y0, 0);
  const out = [caps, sides];
  for (const g of out) {
    assignWoodUV(g, 0, rand);
    g.applyMatrix4(m);
  }
  return out;
}

export function buildWalls(mirrored: boolean): WallParts {
  const rand = rng(1337);
  const total = wall.courses + 1;
  const parts: CoursePart[] = Array.from({ length: total }, () => ({ sides: [], caps: [] }));
  const open = frontOpenings(mirrored);
  const openings = [open.door, open.window].sort((p, q) => p.x0 - q.x0);

  for (let c = 0; c < wall.courses; c++) {
    const y0 = c * H;
    const y1 = y0 + H;
    const frontThrough = c % 2 === 0;
    const spans: Record<WallId, [number, number]> = {
      front: frontThrough ? [-OUT_X, OUT_X] : [-IN_X, IN_X],
      back: frontThrough ? [-OUT_X, OUT_X] : [-IN_X, IN_X],
      left: frontThrough ? [-IN_Z, IN_Z] : [-OUT_Z, OUT_Z],
      right: frontThrough ? [-IN_Z, IN_Z] : [-OUT_Z, OUT_Z],
    };
    (['back', 'left', 'right'] as WallId[]).forEach((w) =>
      pushSeg(parts, { wall: w, course: c, a: spans[w][0], b: spans[w][1], y0, h: H, kind: 'log' }, rand),
    );

    // Frontwand: Öffnungen herausschneiden
    let segs: Seg[] = [{ wall: 'front', course: c, a: spans.front[0], b: spans.front[1], y0, h: H, kind: 'log' }];
    for (const o of openings) {
      if (o.y0 >= y1 || o.y1 <= y0) continue;
      const next: Seg[] = [];
      for (const s of segs) {
        if (s.kind !== 'log' || o.x1 <= s.a || o.x0 >= s.b) { next.push(s); continue; }
        next.push({ ...s, b: Math.min(s.b, o.x0) });
        next.push({ ...s, a: Math.max(s.a, o.x1) });
        const mid = { wall: 'front' as WallId, course: c, a: Math.max(s.a, o.x0), b: Math.min(s.b, o.x1), kind: 'box' as const };
        if (o.y0 > y0) next.push({ ...mid, y0, h: o.y0 - y0 });
        if (o.y1 < y1) next.push({ ...mid, y0: o.y1, h: y1 - o.y1 });
      }
      segs = next.filter((s) => s.b - s.a > 0.5);
    }
    segs.forEach((s) => pushSeg(parts, s, rand));
  }

  // Keil-Lage (Index 14): Front als Passbrett, Seiten als Keile
  const wc = wall.courses;
  const wy0 = SPEC.stack;
  const wh = SPEC.wedge;
  let fSegs: Seg[] = [{ wall: 'front', course: wc, a: -OUT_X, b: OUT_X, y0: wy0, h: wh, kind: 'box' }];
  for (const o of openings) {
    if (o.y1 <= wy0) continue;
    const next: Seg[] = [];
    for (const s of fSegs) {
      if (o.x1 <= s.a || o.x0 >= s.b) { next.push(s); continue; }
      next.push({ ...s, b: Math.min(s.b, o.x0) });
      next.push({ ...s, a: Math.max(s.a, o.x1) });
      next.push({ ...s, a: Math.max(s.a, o.x0), b: Math.min(s.b, o.x1), y0: o.y1, h: wy0 + wh - o.y1 });
    }
    fSegs = next.filter((s) => s.b - s.a > 0.5 && s.h > 0.5);
  }
  fSegs.forEach((s) => pushSeg(parts, s, rand));
  wedge('left', rand).forEach((g, i) => (i === 0 ? parts[wc].caps : parts[wc].sides).push(g));
  wedge('right', rand).forEach((g, i) => (i === 0 ? parts[wc].caps : parts[wc].sides).push(g));

  return {
    courses: parts.map((p) => {
      const s = merge(p.sides);
      const e = merge(p.caps);
      s?.scale(0.001, 0.001, 0.001);
      e?.scale(0.001, 0.001, 0.001);
      return { sides: s, caps: e };
    }),
  };
}
