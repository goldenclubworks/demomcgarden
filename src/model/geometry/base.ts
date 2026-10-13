import * as THREE from 'three';
import { SPEC } from '../spec';
import { merge, rng, woodBox } from './wood';

const MM = 0.001;
const { base, wall } = SPEC;

export const JOIST_H = base.joistH;
export const UNDER_H = base.underH;
/** Bodenhöhe unter der ersten Bohle (Oberkante Boden = y 0 der Wände) */
export const GROUND_Y = -(JOIST_H + UNDER_H);

/** Lagerhölzer (8 × quer zur Tiefe) auf zwei Unterlegehölzern. */
export function buildBase(): THREE.BufferGeometry {
  const rand = rng(77);
  const parts: THREE.BufferGeometry[] = [];
  const n = base.joists;
  const zr = wall.runZ / 2 - base.joistW / 2;
  for (let i = 0; i < n; i++) {
    const z = -zr + (i * (2 * zr)) / (n - 1);
    parts.push(woodBox([wall.runX, JOIST_H, base.joistW], [0, -JOIST_H / 2, z], 0, rand));
  }
  for (const sx of [-1, 1]) {
    parts.push(woodBox([base.underW, UNDER_H, wall.runZ], [sx * (wall.runX / 2 - 150), -JOIST_H - UNDER_H / 2, 0], 2, rand));
  }
  return merge(parts)!.scale(MM, MM, MM);
}

/** Fußbodendielen (Fußbodenpaket), längs x. */
export function buildFloor(): THREE.BufferGeometry {
  const rand = rng(555);
  const parts: THREE.BufferGeometry[] = [];
  const iz = SPEC.innerZ;
  const n = 19;
  const w = iz / n;
  for (let i = 0; i < n; i++) {
    parts.push(woodBox([SPEC.innerX, base.floorBoard, w - 1.5], [0, base.floorBoard / 2, -iz / 2 + w * (i + 0.5)], 0, rand));
  }
  return merge(parts)!.scale(MM, MM, MM);
}
