import * as THREE from 'three';
import { SPEC, frontOpenings, roofUnderside } from '../spec';
import { merge, rng, woodBox } from './wood';

/** Hilfsfunktionen: alles in mm, am Ende in Meter skaliert. */
const MM = 0.001;
const scaled = (g: THREE.BufferGeometry | null) => (g ? g.scale(MM, MM, MM) : null);

export interface LeafGeo {
  wood: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  steel: THREE.BufferGeometry;
  /** Scharnierachse in Hauskoordinaten (m) */
  hinge: THREE.Vector3;
  /** +1: Flügel schlägt nach +x auf (links), −1: nach −x */
  side: 1 | -1;
}

export interface OpeningsGeo {
  frameWood: THREE.BufferGeometry; // Zargen, Fensterrahmen, Blenden
  frameGlass: THREE.BufferGeometry;
  frameSteel: THREE.BufferGeometry;
  leaves: LeafGeo[];
}

const WALL_OUT = SPEC.wall.runZ / 2; // 1400: Außenfläche Frontwand
const WALL_IN = WALL_OUT - SPEC.wall.thickness;

function pane(w: number, h: number, cx: number, cy: number, cz: number, t: number) {
  const g = new THREE.BoxGeometry(w, h, t).toNonIndexed();
  g.translate(cx, cy, cz);
  return g;
}

function cyl(r: number, h: number, c: [number, number, number], axis: 'y' | 'z' | 'x' = 'y', seg = 20) {
  const g = new THREE.CylinderGeometry(r, r, h, seg).toNonIndexed();
  if (axis === 'z') g.rotateX(Math.PI / 2);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  g.translate(...c);
  return g;
}

export function buildOpenings(mirrored: boolean): OpeningsGeo {
  const rand = rng(99);
  const { door: D, window: W, casing: K } = SPEC;
  const open = frontOpenings(mirrored);
  const frameWood: THREE.BufferGeometry[] = [];
  const frameGlass: THREE.BufferGeometry[] = [];
  const frameSteel: THREE.BufferGeometry[] = [];
  const leaves: LeafGeo[] = [];

  // ---- Zargen / Blenden für beide Öffnungen ----
  const casings = (x0: number, x1: number, y0: number, y1: number) => {
    const cz = WALL_OUT + K.depth / 2;
    // seitliche Blenden (außen neben der Öffnung) – Höhe bis Dachunterkante
    const top = roofUnderside(WALL_OUT);
    const hSide = top - y0 - K.headerH;
    frameWood.push(woodBox([K.width, hSide, K.depth], [x0 - K.width / 2, y0 + hSide / 2, cz], 1, rand));
    frameWood.push(woodBox([K.width, hSide, K.depth], [x1 + K.width / 2, y0 + hSide / 2, cz], 1, rand));
    // Sturzbrett über der Öffnung, breiter als die Blenden
    const hw = x1 - x0 + 2 * (K.width + K.headerOverhang);
    frameWood.push(
      woodBox([hw, K.headerH, K.headerDepth], [(x0 + x1) / 2, top - K.headerH / 2, WALL_OUT + K.headerDepth / 2], 0, rand),
    );
    void y1;
  };

  // ---- Doppeltür ----
  {
    const { x0, x1, y0, y1 } = open.door;
    const cxm = (x0 + x1) / 2;
    const zc = WALL_OUT - D.frameDepth / 2 + 2; // Zarge, außen bündig + 2 mm
    // Zarge: zwei Pfosten, Sturz, Schwelle
    frameWood.push(woodBox([D.frameSide, y1 - y0, D.frameDepth], [x0 + D.frameSide / 2, (y0 + y1) / 2, zc], 1, rand));
    frameWood.push(woodBox([D.frameSide, y1 - y0, D.frameDepth], [x1 - D.frameSide / 2, (y0 + y1) / 2, zc], 1, rand));
    frameWood.push(
      woodBox([x1 - x0 - 2 * D.frameSide, D.frameTop, D.frameDepth], [cxm, y1 - D.frameTop / 2, zc], 0, rand),
    );
    frameWood.push(woodBox([x1 - x0 - 2 * D.frameSide, 30, D.frameDepth + 8], [cxm, y0 + 15, zc + 2], 0, rand));
    casings(x0, x1, y0, y1);

    const clearW = x1 - x0 - 2 * D.frameSide;
    const leafW = (clearW - 3 * D.gap) / 2;
    const leafH = y1 - D.frameTop - (y0 + 30) - D.gap * 2;
    const leafY0 = y0 + 30 + D.gap;
    const zLeaf = WALL_OUT - D.leafThickness / 2 + 8;

    const mkLeaf = (side: 1 | -1): LeafGeo => {
      const hingeX = side === 1 ? x0 + D.frameSide + D.gap : x1 - D.frameSide - D.gap;
      const wood: THREE.BufferGeometry[] = [];
      const glass: THREE.BufferGeometry[] = [];
      const steel: THREE.BufferGeometry[] = [];
      // lokale Koordinaten: Ursprung an der Scharnierachse; x ∈ [0, leafW]·side, y ab Flügelunterkante, z = Mitte
      const lx = (a: number, w: number) => side * (a + w / 2);
      wood.push(woodBox([D.stile, leafH, D.leafThickness], [lx(0, D.stile), leafH / 2, 0], 1, rand));
      wood.push(woodBox([D.stile, leafH, D.leafThickness], [lx(leafW - D.stile, D.stile), leafH / 2, 0], 1, rand));
      const innerW = leafW - 2 * D.stile;
      wood.push(woodBox([innerW, D.topRail, D.leafThickness], [lx(D.stile, innerW), leafH - D.topRail / 2, 0], 0, rand));
      wood.push(woodBox([innerW, D.bottomRail, D.leafThickness], [lx(D.stile, innerW), D.bottomRail / 2, 0], 0, rand));
      const glassH = leafH - D.topRail - D.bottomRail - (D.panes - 1) * D.muntin;
      const paneH = glassH / D.panes;
      for (let i = 0; i < D.panes; i++) {
        const py = D.bottomRail + i * (paneH + D.muntin);
        glass.push(pane(innerW, paneH, lx(D.stile, innerW), py + paneH / 2, 0, D.glass));
        if (i < D.panes - 1)
          wood.push(woodBox([innerW, D.muntin, D.leafThickness - 10], [lx(D.stile, innerW), py + paneH + D.muntin / 2, 0], 0, rand));
      }
      // Scharniere: Edelstahlbänder an der Außenseite
      for (const hy of [160, leafH / 2, leafH - 160]) {
        steel.push(cyl(8, 62, [side * -2, hy, D.leafThickness / 2 + 2], 'y'));
        steel.push(woodBoxFlat(side * 20, hy, D.leafThickness / 2 + 1.5, 52, 30, 3));
      }
      // Drückergarnitur (Aluminium) am Treffpunkt – nur am ersten Flügel + Zylinderschloss
      if (side === 1) {
        const hx = side * (leafW - D.stile / 2);
        steel.push(woodBoxFlat(hx, D.handleHeight - leafY0, D.leafThickness / 2 + 2, 34, 190, 4));
        steel.push(cyl(9, 60, [hx, D.handleHeight - leafY0, D.leafThickness / 2 + 10], 'z'));
        steel.push(woodBoxFlat(hx - side * 55, D.handleHeight - leafY0, D.leafThickness / 2 + 62, 120, 18, 14));
        steel.push(cyl(11, 14, [hx, D.handleHeight - leafY0 - 62, D.leafThickness / 2 + 3], 'z'));
      }
      const g = (list: THREE.BufferGeometry[]) => scaled(merge(list))!;
      const geo: LeafGeo = {
        wood: g(wood),
        glass: g(glass),
        steel: g(steel),
        hinge: new THREE.Vector3(hingeX * MM, leafY0 * MM, zLeaf * MM),
        side,
      };
      return geo;
    };
    leaves.push(mkLeaf(1), mkLeaf(-1));
  }

  // ---- Festverglastes Fenster ----
  {
    const { x0, x1, y0, y1 } = open.window;
    const cxm = (x0 + x1) / 2;
    const zc = WALL_OUT - W.frameDepth / 2 + 2;
    const f = W.frame;
    frameWood.push(woodBox([f, y1 - y0, W.frameDepth], [x0 + f / 2, (y0 + y1) / 2, zc], 1, rand));
    frameWood.push(woodBox([f, y1 - y0, W.frameDepth], [x1 - f / 2, (y0 + y1) / 2, zc], 1, rand));
    frameWood.push(woodBox([x1 - x0 - 2 * f, f, W.frameDepth], [cxm, y1 - f / 2, zc], 0, rand));
    frameWood.push(woodBox([x1 - x0 - 2 * f, f + 10, W.frameDepth], [cxm, y0 + (f + 10) / 2, zc], 0, rand));
    casings(x0, x1, y0, y1);
    const innerW = x1 - x0 - 2 * f;
    const innerH = y1 - y0 - 2 * f - 10;
    const paneH = (innerH - (W.panes - 1) * W.muntin) / W.panes;
    const baseY = y0 + f + 10;
    for (let i = 0; i < W.panes; i++) {
      const py = baseY + i * (paneH + W.muntin);
      frameGlass.push(pane(innerW, paneH, cxm, py + paneH / 2, zc, W.glass));
      if (i < W.panes - 1) frameWood.push(woodBox([innerW, W.muntin, W.frameDepth - 10], [cxm, py + paneH + W.muntin / 2, zc], 0, rand));
    }
  }

  return {
    frameWood: scaled(merge(frameWood))!,
    frameGlass: scaled(merge(frameGlass))!,
    frameSteel: scaled(frameSteel.length ? merge(frameSteel) : new THREE.BufferGeometry()) ?? new THREE.BufferGeometry(),
    leaves,
  };
}

/** Flaches Beschlagteil (Box) in mm, Mittelpunkt (x, y, z). */
function woodBoxFlat(x: number, y: number, z: number, w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  return g;
}

export { WALL_IN };
