import { describe, expect, it } from 'vitest';
import { SPEC, frontOpenings, roofUnderside } from '../src/model/spec';
import { PACKAGES } from '../src/data/catalog';
import { DEFAULT_CONFIG, priceLines } from '../src/data/store';

describe('Maße laut Herstellerzeichnung', () => {
  it('Außenmaß der Wände 3980 × 2980 mm', () => {
    expect(SPEC.outerX).toBe(3980);
    expect(SPEC.outerZ).toBe(2980);
  });
  it('Innenmaß 3732 × 2732 mm und Nutzfläche ≈ 10,2 m²', () => {
    expect(SPEC.innerX).toBe(3732);
    expect(SPEC.innerZ).toBe(2732);
    expect(SPEC.floorAreaM2).toBeCloseTo(10.2, 1);
  });
  it('Höhen: hinten 2092,5 mm, vorn 2244 mm, Neigung ≈ 3,1°', () => {
    expect(SPEC.heightBack).toBeCloseTo(2092.5, 6);
    expect(SPEC.heightFront).toBe(2244);
    expect(SPEC.stack).toBeCloseTo(1953, 6);
    expect(SPEC.slopeDeg).toBeCloseTo(3.1, 1);
  });
  it('Dachunterkante steigt von hinten (1953) nach vorn (1953 + 151,5)', () => {
    expect(roofUnderside(-1400)).toBeCloseTo(1953, 6);
    expect(roofUnderside(1400)).toBeCloseTo(2104.5, 6);
  });
  it('Frontwand: 701 | 1450 Tür | Lücke | 550 Fenster | 701 = 3980', () => {
    const { door, window: win } = frontOpenings(false);
    const left = -SPEC.front.totalWidth / 2;
    expect(door.x0 - left).toBe(701);
    expect(door.x1 - door.x0).toBe(1450);
    expect(win.x1 - win.x0).toBe(550);
    expect(left * -1 - win.x1).toBe(701);
    expect(door.y1 - door.y0).toBe(2035);
    expect(win.y1 - win.y0).toBe(1890);
  });
  it('Spiegelverkehrt vertauscht Tür und Fenster, Maße bleiben gleich', () => {
    const a = frontOpenings(false);
    const b = frontOpenings(true);
    expect(b.door.x0).toBeCloseTo(-a.door.x1, 6);
    expect(b.window.x1).toBeCloseTo(-a.window.x0, 6);
    expect(b.door.x1 - b.door.x0).toBe(1450);
  });
  it('Gesamthöhe hinten = 14 Bohlen + Dachstärke', () => {
    expect(SPEC.wall.courses * SPEC.wall.courseH + SPEC.roof.thickness).toBeCloseTo(2092.5, 6);
  });
});

describe('Preislogik (Produktseite, Stand 13.10.2026)', () => {
  it('Basispreis 1.999 €', () => {
    expect(priceLines(DEFAULT_CONFIG).total).toBe(1999);
  });
  it('Paketpreise 389 / 949 / 1.349 €', () => {
    expect(PACKAGES.map((p) => p.price)).toEqual([0, 389, 949, 1349]);
  });
  it('Dach im Paket enthalten wird nicht doppelt berechnet', () => {
    const t = priceLines({ ...DEFAULT_CONFIG, package: 'premium', roof: 'epdm', gutter: true }).total;
    expect(t).toBe(1999 + 949);
  });
  it('Extras addieren sich: Boden 339 + Rinne 154,99 + Montage 879', () => {
    const t = priceLines({ ...DEFAULT_CONFIG, floor: true, gutter: true, assemblyService: true }).total;
    expect(t).toBeCloseTo(1999 + 339 + 154.99 + 879, 2);
  });
});
