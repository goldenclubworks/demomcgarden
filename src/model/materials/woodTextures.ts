import * as THREE from 'three';

/**
 * Prozedurale, kachelbare Fichtenholz-Texturen (Hobelware, längs der Faser).
 * 2048 × 512 px entsprechen 1,0 m Länge × 139,5 mm Bohlenhöhe.
 * Eigene Erzeugung statt Foto-Texturen: keine Lizenzfragen, nahtlos in beide Richtungen.
 */

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Periodisches Value-Noise (Gitter wickelt mit pu × pv um). */
function makeNoise(seed: number, pu: number, pv: number) {
  const rnd = mulberry(seed);
  const g = new Float32Array(pu * pv);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (u: number, v: number) => {
    // u,v in Gitter-Einheiten, periodisch
    const x = ((u % pu) + pu) % pu;
    const y = ((v % pv) + pv) % pv;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = (x0 + 1) % pu, y1 = (y0 + 1) % pv;
    const fx = sm(x - x0), fy = sm(y - y0);
    const a = g[y0 * pu + x0], b = g[y0 * pu + x1], c = g[y1 * pu + x0], d = g[y1 * pu + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

export interface WoodMaps {
  color: THREE.CanvasTexture; // farbig (naturbelassen / Lasur)
  grain: THREE.CanvasTexture; // Graustufen, Mittelwert ≈ 0.92 (Deckfarbe: color × grain)
  normal: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
}

const W = 2048;
const H = 512;

export function createWoodMaps(): WoodMaps {
  const nLow = makeNoise(11, 6, 4);
  const nMid = makeNoise(23, 24, 10);
  const nHi = makeNoise(37, 256, 24); // Poren / Faserstriche, stark in u gestreckt
  const nHi2 = makeNoise(41, 512, 64);
  const nTone = makeNoise(53, 3, 3);
  const nKnot = mulberry(7);

  // Äste: Position (u,v in 0..1), Radius in Pixeln
  const knots = Array.from({ length: 3 }, () => ({
    u: nKnot(),
    v: 0.15 + nKnot() * 0.7,
    r: 22 + nKnot() * 20,
  }));

  const col = new Uint8ClampedArray(W * H * 4);
  const gr = new Uint8ClampedArray(W * H * 4);
  const hgt = new Float32Array(W * H);
  const rgh = new Uint8ClampedArray(W * H * 4);

  const ringCount = 11; // sichtbare Jahrringlinien auf 139,5 mm (leicht stilisiert, Moiré-sicher)
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // Jahrringe: Grundphase über v, verzerrt durch niederfrequentes Rauschen → „Fladerung“
      let warp = (nLow(u * 6, v * 4) - 0.5) * 2.4 + (nMid(u * 24, v * 10) - 0.5) * 0.35;
      let knotDark = 0;
      for (const k of knots) {
        let du = Math.abs(u - k.u);
        du = Math.min(du, 1 - du) * W;
        const dv = (v - k.v) * H;
        const d = Math.hypot(du * 0.5, dv);
        if (d < k.r * 3.2) {
          const f = 1 - d / (k.r * 3.2);
          warp += Math.sin(f * Math.PI * 0.5) * 1.6 * Math.sign(dv || 1) * 0.35;
          if (d < k.r) knotDark = Math.max(knotDark, 1 - d / k.r);
        }
      }
      const phase = (v * ringCount + warp) % 1;
      const p = phase < 0 ? phase + 1 : phase;
      // Frühholz hell, Spätholz schmal und dunkel
      const ring = p < 0.6 ? 0 : Math.pow(Math.sin(((p - 0.6) / 0.4) * Math.PI), 1.6);
      const fibre = nHi(u * 256, v * 24) * 0.6 + nHi2(u * 512, v * 64) * 0.4;
      const tone = nTone(u * 3, v * 3);
      let dark = ring * (0.26 + 0.12 * nMid(u * 3, v * 40)) + (fibre - 0.5) * 0.26 + (tone - 0.5) * 0.14 + 0.05;
      dark += knotDark * 0.55;
      const i = (y * W + x) * 4;

      // Naturholz: helles, leicht gelbliches Fichtenholz
      const r0 = 214, g0 = 180, b0 = 128;
      const r1 = 148, g1 = 104, b1 = 60;
      const k = Math.min(1, Math.max(0, dark));
      col[i] = r0 + (r1 - r0) * k;
      col[i + 1] = g0 + (g1 - g0) * k;
      col[i + 2] = b0 + (b1 - b0) * k;
      col[i + 3] = 255;

      const gv = 255 * (0.99 - 0.2 * k);
      gr[i] = gr[i + 1] = gr[i + 2] = gv;
      gr[i + 3] = 255;

      hgt[y * W + x] = -ring * 0.5 - (fibre - 0.5) * 0.9 - knotDark * 0.4;
      const rv = 150 + ring * 40 + (fibre - 0.5) * 50;
      rgh[i] = rgh[i + 1] = rgh[i + 2] = rv;
      rgh[i + 3] = 255;
    }
  }

  // Normalmap aus Höhenfeld (Sobel, wrap)
  const nm = new Uint8ClampedArray(W * H * 4);
  const strength = 2.2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const xl = (x - 1 + W) % W, xr = (x + 1) % W, yu = (y - 1 + H) % H, yd = (y + 1) % H;
      const dx = (hgt[y * W + xr] - hgt[y * W + xl]) * strength;
      const dy = (hgt[yd * W + x] - hgt[yu * W + x]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      nm[i] = (-dx * inv * 0.5 + 0.5) * 255;
      nm[i + 1] = (dy * inv * 0.5 + 0.5) * 255; // Y-up (OpenGL)
      nm[i + 2] = (inv * 0.5 + 0.5) * 255;
      nm[i + 3] = 255;
    }
  }

  const mk = (data: Uint8ClampedArray<ArrayBuffer>, srgb: boolean) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.putImageData(new ImageData(data, W, H), 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { color: mk(col, true), grain: mk(gr, true), normal: mk(nm, false), rough: mk(rgh, false) };
}

export interface EndGrainMaps {
  color: THREE.CanvasTexture;
  grain: THREE.CanvasTexture;
}

/** Hirnholz: schnittnahe Jahrringbögen, 256 × 256 px ≙ 100 × 100 mm. */
export function createEndGrainMaps(): EndGrainMaps {
  const S = 256;
  const nA = makeNoise(5, 8, 8);
  const nB = makeNoise(9, 64, 64);
  const col = new Uint8ClampedArray(S * S * 4);
  const gr = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      // exzentrische Ringe um ein Mark außerhalb der Fläche
      const cx = 0.5 + (nA(u * 2, v * 2) - 0.5) * 0.15;
      const d = Math.hypot((u - cx) * 1.0, (v + 1.6) * 0.9) + (nA(u * 8, v * 8) - 0.5) * 0.06;
      const p = (d * 34) % 1;
      const ring = p < 0.65 ? 0 : Math.sin(((p - 0.65) / 0.35) * Math.PI);
      const dark = ring * 0.55 + (nB(u * 64, v * 64) - 0.5) * 0.22;
      const k = Math.min(1, Math.max(0, dark));
      const i = (y * S + x) * 4;
      col[i] = 214 + (140 - 214) * k;
      col[i + 1] = 178 + (92 - 178) * k;
      col[i + 2] = 124 + (50 - 124) * k;
      col[i + 3] = 255;
      const gv = 255 * (0.93 - 0.5 * k);
      gr[i] = gr[i + 1] = gr[i + 2] = gv;
      gr[i + 3] = 255;
    }
  }
  const mk = (data: Uint8ClampedArray<ArrayBuffer>) => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    c.getContext('2d')!.putImageData(new ImageData(data, S, S), 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { color: mk(col), grain: mk(gr) };
}
