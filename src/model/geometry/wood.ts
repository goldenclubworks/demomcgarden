import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Deterministischer Zufall (mulberry32), damit das Haus bei jedem Laden identisch aussieht. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TEX_LEN_MM = 1000; // 1 Texturwiederholung längs der Faser
export const TEX_WIDTH_MM = 139.5; // 1 Texturwiederholung quer

type Axis = 0 | 1 | 2;

/**
 * Weist Holz-UVs zu: u läuft längs der Faser (Achse `along`), v quer dazu.
 * Hirnholz-Flächen (Normale ∥ along) bekommen UVs im 100-mm-Raster.
 * Setzt außerdem ein Vertex-Color-Attribut (leichte Tonabweichung pro Bauteil).
 */
export function assignWoodUV(geo: THREE.BufferGeometry, along: Axis, rand: () => number, opts: { tone?: number } = {}) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  const uOff = rand();
  const vOff = rand();
  const flip = rand() < 0.5 ? -1 : 1;
  const p = [0, 0, 0];
  const n = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    n[0] = Math.abs(nor.getX(i)); n[1] = Math.abs(nor.getY(i)); n[2] = Math.abs(nor.getZ(i));
    let a: Axis = 0;
    if (n[1] > n[a]) a = 1;
    if (n[2] > n[a]) a = 2;
    if (a === along) {
      const o = ([0, 1, 2] as Axis[]).filter((k) => k !== along);
      uv[i * 2] = p[o[0]] / 100;
      uv[i * 2 + 1] = p[o[1]] / 100;
    } else {
      const r = ([0, 1, 2] as Axis[]).find((k) => k !== a && k !== along)!;
      uv[i * 2] = flip * (p[along] / TEX_LEN_MM) + uOff;
      uv[i * 2 + 1] = p[r] / TEX_WIDTH_MM + vOff;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  const t = opts.tone ?? 0.045;
  const b = 1 + (rand() - 0.5) * 2 * t;
  const warm = (rand() - 0.5) * 2 * t * 0.6;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    col[i * 3] = b * (1 + warm);
    col[i * 3 + 1] = b;
    col[i * 3 + 2] = b * (1 - warm * 1.4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** Zerlegt eine ExtrudeGeometry in Hirnholz (group 0) und Längsholz (group 1). */
export function splitExtrude(geo: THREE.BufferGeometry): { caps: THREE.BufferGeometry; sides: THREE.BufferGeometry } {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pick = (matIndex: number) => {
    const g = new THREE.BufferGeometry();
    const parts: number[][] = [[], [], []];
    for (const grp of geo.groups) {
      if (grp.materialIndex !== matIndex) continue;
      const names = ['position', 'normal', 'uv'] as const;
      names.forEach((nm, k) => {
        const a = src.getAttribute(nm);
        for (let i = grp.start; i < grp.start + grp.count; i++) {
          for (let c = 0; c < a.itemSize; c++) parts[k].push(a.array[i * a.itemSize + c]);
        }
      });
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(parts[0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(parts[1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(parts[2], 2));
    return g;
  };
  return { caps: pick(0), sides: pick(1) };
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!list.length) return null;
  return mergeGeometries(list, false);
}

/** Quader mit Holz-UVs. Maße in mm, Mittelpunkt bei `c`. */
export function woodBox(
  size: [number, number, number],
  c: [number, number, number],
  along: Axis,
  rand: () => number,
  rot?: THREE.Euler,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
  assignWoodUV(g, along, rand);
  if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
  g.translate(c[0], c[1], c[2]);
  return g;
}
