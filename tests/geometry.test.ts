import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildWalls } from '../src/model/geometry/walls';
import { buildOpenings } from '../src/model/geometry/openings';
import { buildRoofStructure, ROOF_THETA } from '../src/model/geometry/roof';
import { buildBase } from '../src/model/geometry/base';

const box = (gs: (THREE.BufferGeometry | null)[]) => {
  const b = new THREE.Box3();
  for (const g of gs) {
    if (!g) continue;
    g.computeBoundingBox();
    b.union(g.boundingBox!);
  }
  return b;
};

describe('Geometrie entspricht der Spezifikation (Meter)', () => {
  const walls = buildWalls(false);
  const b = box(walls.courses.flatMap((c) => [c.sides, c.caps]));

  it('Wandkörper 3,98 × 2,98 m inkl. Eckvorstand', () => {
    expect(b.max.x - b.min.x).toBeCloseTo(3.98, 3);
    expect(b.max.z - b.min.z).toBeCloseTo(2.98, 3);
  });
  it('Wandlagen enden bei 1953 mm (hinten) bzw. 2104,5 mm (Keil vorn)', () => {
    expect(b.max.y).toBeCloseTo(2.1045, 3);
    expect(b.min.y).toBeCloseTo(0, 6);
  });
  it('15 Lagen (14 Bohlenlagen + Keil)', () => {
    expect(walls.courses).toHaveLength(15);
    walls.courses.forEach((c) => expect(c.sides).not.toBeNull());
  });
  it('Spiegelung ändert die Außenmaße nicht', () => {
    const m = box(buildWalls(true).courses.flatMap((c) => [c.sides, c.caps]));
    expect(m.max.x - m.min.x).toBeCloseTo(b.max.x - b.min.x, 6);
  });
  it('Türflügel: zwei Stück, Scharniere an den Außenseiten der Öffnung', () => {
    const o = buildOpenings(false);
    expect(o.leaves).toHaveLength(2);
    expect(o.leaves[0].hinge.x).toBeLessThan(o.leaves[1].hinge.x);
  });
  it('Dach 4,16 m breit, Neigung ≈ 3,1°', () => {
    const r = buildRoofStructure();
    const rb = box([r.wood]);
    expect(rb.max.x - rb.min.x).toBeCloseTo(4.16, 3);
    expect((ROOF_THETA * 180) / Math.PI).toBeCloseTo(3.1, 1);
  });
  it('Unterkonstruktion: 3,8 m lang', () => {
    const bb = box([buildBase()]);
    expect(bb.max.x - bb.min.x).toBeCloseTo(3.8, 3);
  });
});
