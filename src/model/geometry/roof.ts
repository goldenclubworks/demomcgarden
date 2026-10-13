import * as THREE from 'three';
import type { RoofCoverId } from '@/data/catalog';
import { SPEC, roofUnderside } from '../spec';
import { merge, rng, woodBox } from './wood';

const MM = 0.001;
const { roof: R, wall } = SPEC;

export const ROOF_THETA = Math.atan(SPEC.wedge / wall.runZ);
const COS = Math.cos(ROOF_THETA);
/** halbe Dachlänge entlang der Neigung (mm) */
export const ROOF_HALF_L = (wall.runZ / 2 + wall.cornerOverhang + R.overhangZ) / COS;
export const ROOF_HALF_W = R.width / 2;
/** Ursprung des geneigten Dach-Koordinatensystems (Unterkante in Hausmitte), in Metern */
export const ROOF_ORIGIN_Y = roofUnderside(0) * MM;

function planarUV(g: THREE.BufferGeometry, mmPerRepeat: number) {
  const p = g.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / mmPerRepeat;
    uv[i * 2 + 1] = p.getZ(i) / mmPerRepeat;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function box(w: number, h: number, d: number, c: [number, number, number]) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(...c);
  return g;
}

export interface RoofStructure {
  wood: THREE.BufferGeometry; // Blenden + Pfetten
  deck: THREE.BufferGeometry; // OSB
}

/** Dachkonstruktion im geneigten lokalen System (y = 0 Unterkante, y = 139,5 Oberkante Dachplatte). */
export function buildRoofStructure(): RoofStructure {
  const rand = rng(2024);
  const T = R.thickness;
  const L = ROOF_HALF_L * 2;
  const W = R.width;
  const wood: THREE.BufferGeometry[] = [];

  // Stirnblenden vorn/hinten über die gesamte Dachhöhe (Wand B: 4160 × 139,5)
  wood.push(woodBox([W, T, R.fasciaT], [0, T / 2, ROOF_HALF_L - R.fasciaT / 2], 0, rand));
  wood.push(woodBox([W, T, R.fasciaT], [0, T / 2, -ROOF_HALF_L + R.fasciaT / 2], 0, rand));
  // Seitenblenden (nur obere Partie, darunter schauen die Pfetten heraus)
  const sh = R.sideFascia;
  for (const sx of [-1, 1]) {
    wood.push(woodBox([R.fasciaT, sh, L - 2 * R.fasciaT], [sx * (W / 2 - R.fasciaT / 2), T - sh / 2, 0], 2, rand));
  }
  // Pfetten
  const bh = T - R.osb;
  for (const zb of R.beams) {
    wood.push(woodBox([W, bh, R.beamW], [0, bh / 2, zb / COS], 0, rand));
  }
  const deck = box(W - 2 * R.fasciaT, R.osb, L - 2 * R.fasciaT, [0, T - R.osb / 2, 0]);
  planarUV(deck, 1000);
  return { wood: merge(wood)!.scale(MM, MM, MM), deck: deck.scale(MM, MM, MM) };
}

export interface RoofCover {
  main: THREE.BufferGeometry;
  alu?: THREE.BufferGeometry;
}

function trapezSheet(width: number, length: number, x0: number): THREE.BufferGeometry {
  // Profil T35-ähnlich: Rippenabstand 207 mm, Höhe 35 mm
  const pitch = 207, h = 35, top = 60, bot = 70;
  const pts: [number, number][] = [];
  const n = Math.round(width / pitch);
  for (let i = 0; i < n; i++) {
    const o = i * pitch;
    pts.push([o, 0], [o + bot, 0], [o + bot + (pitch - bot - top) / 2, h], [o + bot + (pitch - bot - top) / 2 + top, h]);
  }
  pts.push([n * pitch, 0]);
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach(([px, py]) => {
    pos.push(x0 + px, py, -length / 2, x0 + px, py, length / 2);
  });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

export function buildCover(id: RoofCoverId, aluTrim: boolean): RoofCover | null {
  const T = R.thickness;
  const L = ROOF_HALF_L * 2;
  const W = R.width;
  const top = T;
  if (id === 'osb') return null;
  if (id === 'bitumen' || id === 'felt') {
    // überlappende Bahnen quer zur Neigung (Gefällerichtung: entlang z)
    const strips: THREE.BufferGeometry[] = [];
    const sw = 1000, step = 920;
    const count = Math.ceil((W - 80) / step);
    const x00 = -W / 2;
    for (let i = 0; i < count; i++) {
      const xc = x00 + sw / 2 + i * step;
      const w = Math.min(sw, W / 2 - (xc - sw / 2));
      const g = box(Math.min(sw, w), 2.2, L - 2 * R.fasciaT + 20, [xc - (sw - Math.min(sw, w)) / 2 * 0, top + 1.1 + (i % 2) * 0.9, 0]);
      planarUV(g, 1000);
      strips.push(g);
    }
    return { main: merge(strips)!.scale(MM, MM, MM) };
  }
  if (id === 'epdm') {
    const g = box(W - 2 * R.fasciaT + 40, 1.6, L - 2 * R.fasciaT + 40, [0, top + 0.8, 0]);
    planarUV(g, 1000);
    // um die Oberkante der Blenden geschlagen
    const wraps: THREE.BufferGeometry[] = [g];
    wraps.push(box(W + 3, 36, 1.6, [0, top - 18, ROOF_HALF_L + 0.8]));
    wraps.push(box(W + 3, 36, 1.6, [0, top - 18, -ROOF_HALF_L - 0.8]));
    for (const sx of [-1, 1]) wraps.push(box(1.6, 36, L + 3, [sx * (W / 2 + 0.8), top - 18, 0]));
    wraps.forEach((w) => planarUV(w, 1000));
    const out: RoofCover = { main: merge(wraps)!.scale(MM, MM, MM) };
    if (aluTrim) {
      const a: THREE.BufferGeometry[] = [];
      const t = 2;
      a.push(box(W + 24, t, 34, [0, top + 2.4, ROOF_HALF_L - 4])); // Abdeckung oben vorn
      a.push(box(W + 24, 46, t, [0, top - 14, ROOF_HALF_L + 12]));
      a.push(box(W + 24, t, 34, [0, top + 2.4, -ROOF_HALF_L + 4]));
      a.push(box(W + 24, 46, t, [0, top - 14, -ROOF_HALF_L - 12]));
      for (const sx of [-1, 1]) {
        a.push(box(34, t, L + 24, [sx * (W / 2 - 4), top + 2.4, 0]));
        a.push(box(t, 46, L + 24, [sx * (W / 2 + 12), top - 14, 0]));
      }
      out.alu = merge(a)!.scale(MM, MM, MM);
    }
    return out;
  }
  // Trapezblech
  const sheets: THREE.BufferGeometry[] = [];
  const sheetW = 1035, n = 4, total = sheetW * n;
  for (let i = 0; i < n; i++) {
    const g = trapezSheet(sheetW, L - 2 * R.fasciaT + 90, -total / 2 + i * sheetW);
    g.translate(0, top + 1, 0);
    sheets.push(g);
  }
  const m = merge(sheets)!;
  // UV für evtl. Texturen (hier nicht genutzt, aber Attribut für Merge-Kompatibilität vorhanden)
  planarUV(m, 1000);
  return { main: m.scale(MM, MM, MM) };
}

/** Halbrunde Dachrinne (Länge längs x) + Halter, im lokalen Dachsystem hinten angesetzt. */
export function buildGutter(): { gutter: THREE.BufferGeometry; brackets: THREE.BufferGeometry; outletX: number } {
  const r = 62;
  const len = R.width - 60;
  const prof: [number, number][] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI * i) / steps;
    prof.push([Math.cos(a) * r, Math.sin(a) * r + r]);
  }
  prof.unshift([-r, r + 10]);
  prof.push([r, r + 10]);
  const pos: number[] = [];
  const idx: number[] = [];
  prof.forEach(([pz, py]) => {
    pos.push(-len / 2, py, pz, len / 2, py, pz);
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const gutter = new THREE.BufferGeometry();
  gutter.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gutter.setIndex(idx);
  gutter.computeVertexNormals();
  const gz = -ROOF_HALF_L - r - 4;
  const gy = R.thickness - r - 18;
  gutter.translate(0, gy, gz);
  const br: THREE.BufferGeometry[] = [];
  for (let x = -len / 2 + 120; x < len / 2; x += 600) {
    const b = box(18, 4, r * 2 + 8, [x, gy + 4, gz]);
    br.push(b);
    br.push(box(18, 56, 4, [x, gy + 30, -ROOF_HALF_L - 2]));
  }
  return { gutter: gutter.scale(MM, MM, MM), brackets: merge(br)!.scale(MM, MM, MM), outletX: len / 2 - 70 };
}
