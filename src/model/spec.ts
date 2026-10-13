/**
 * Single Source of Truth für alle Maße des Gartenhauses „Bergen 400 × 300“ (Millimeter).
 *
 * Quellen:
 *  [Z]  Technische Zeichnungen auf der Produktseite (Grundriss, Wand A/B, Seitenwand, Unterkonstruktion)
 *  [T]  Technische Daten / Beschreibung auf mcgarden24.de (Stand 13.10.2026)
 *  [A]  Aufbauanleitung (Bergen.pdf, SketchUp-Ansichten) – Proportionen
 *  [E]  Schätzung aus den Produktfotos (Bergen-00/01/04), kalibriert per Kameraabgleich
 *
 * Widersprüche der Quellen (Wandstärke 34/35 mm, „Höhe Flachdach 220 cm“ vs. Wandhöhe 224 cm,
 * „Einfachverglasung“ vs. „Echtglas“) sind in docs/SPEC.md dokumentiert. Die Zeichnungen haben Vorrang.
 */
export const SPEC = {
  /**
   * Wandsystem: Blockbohlen, nordische Fichte, kammergetrocknet.
   * Die Wand besteht aus 14 Lagen (Wand B: 14 × 139,5 = 1953 mm). Darauf liegt das Dach (139,5 mm hoch),
   * dessen Unterkante zur Front hin ansteigt; die Seitenwände schließen mit einer Keil-Lage ab.
   * Gesamthöhe hinten 2092,5 mm, vorn 2244 mm (Zeichnungen Wand B / Seitenwand).
   */
  wall: {
    thickness: 34, // [Z] (Innenmaß 3732 = 3800 − 2·34)
    courseH: 139.5, // [Z] Teilung der Bohlen (Höhe ohne Feder)
    courses: 14, // [Z]
    runX: 3800, // [Z] Sockelmaß = Außenfläche Seitenwände
    runZ: 2800, // [Z] Sockelmaß = Außenfläche Front/Rück
    cornerOverhang: 90, // [Z] (3980 − 3800) / 2: Bohlenenden stehen an den Ecken über
    tongueH: 7.5, // [E] Feder / Nut
    chamfer: 2.5, // [E] Fase an Sichtkanten (erzeugt die feine Schattenfuge)
  },

  /** Öffnungen der Frontwand (Wand A), Maße ab Spitze des Eckvorstands [Z] */
  front: {
    totalWidth: 3980,
    edgeGap: 701,
    door: { width: 1450, height: 2035, y0: 0 },
    window: { width: 550, height: 1890, y0: 63 },
  },

  /** Doppeltür: Leimholzrahmen, 4 Glasfelder je Flügel, Edelstahlbänder [T][A] */
  door: {
    frameSide: 42,
    frameTop: 55,
    frameDepth: 44,
    leafThickness: 44,
    stile: 66,
    topRail: 66,
    bottomRail: 118,
    muntin: 38,
    panes: 4,
    glass: 4,
    gap: 3,
    handleHeight: 1020,
  },
  window: { frame: 42, frameDepth: 44, muntin: 38, panes: 4, glass: 4 },

  /** Zierblenden um Tür/Fenster [A][E] */
  casing: { width: 70, depth: 24, headerH: 95, headerOverhang: 30, headerDepth: 34 },

  /** Pultdach (Flachdach) [Z][E] */
  roof: {
    thickness: 139.5, // [Z] Wand B: oberste Lage mit 4160 mm Breite
    width: 4160, // [Z]
    overhangZ: 92, // [Z] Seitenansicht: ≈ 90 mm vorn und hinten, gemessen ab Bohlenspitze
    osb: 12, // [T] Kundenbewertung: „nur 12 mm“
    beams: [638, -142, -920], // [Z] Pfetten, z-Lage ab Hausmitte (Seitenwand-Zeichnung)
    beamW: 70,
    fasciaT: 24,
    sideFascia: 98, // sichtbare Höhe der Seitenblenden, darunter schauen die Pfetten heraus
  },

  /** Unterkonstruktion: 8 Lagerhölzer (3800 mm), 2 Unterlegehölzer [Z] */
  base: { joists: 8, joistW: 70, joistH: 44, underW: 70, underH: 26, floorBoard: 19 },

  /** Abgeleitete Größen (nicht manuell ändern) */
  get slope() {
    return this.wedge / this.wall.runZ;
  },
  get heightBack() {
    return this.wall.courses * this.wall.courseH + this.roof.thickness;
  },
  get heightFront() {
    return 2244; // [Z]
  },
  get wedge() {
    return this.heightFront - this.heightBack; // 151,5 mm
  },
  get stack() {
    return this.wall.courses * this.wall.courseH; // 1953 mm
  },
  get slopeDeg() {
    return (Math.atan(this.wedge / this.wall.runZ) * 180) / Math.PI;
  },
  get outerX() {
    return this.wall.runX + 2 * this.wall.cornerOverhang;
  },
  get outerZ() {
    return this.wall.runZ + 2 * this.wall.cornerOverhang;
  },
  get innerX() {
    return this.wall.runX - 2 * this.wall.thickness;
  },
  get innerZ() {
    return this.wall.runZ - 2 * this.wall.thickness;
  },
  get floorAreaM2() {
    return (this.innerX * this.innerZ) / 1e6;
  },
} as const;

/** Unterkante des Dachs (= Oberkante der Wandlagen) in mm an Tiefe z (+vorn … −hinten, Mitte = 0). */
export function roofUnderside(zMm: number): number {
  return SPEC.stack + (SPEC.wedge * (zMm + SPEC.wall.runZ / 2)) / SPEC.wall.runZ;
}

/** x-Positionen der Öffnungen (mm, Hausmitte = 0), optional spiegelverkehrt. */
export function frontOpenings(mirrored: boolean) {
  const { totalWidth, edgeGap, door, window: win } = SPEC.front;
  const left = -totalWidth / 2;
  const gap = totalWidth - 2 * edgeGap - door.width - win.width;
  const doorX0 = left + edgeGap;
  const winX0 = doorX0 + door.width + gap;
  const mk = (x0: number, w: number) => (mirrored ? { x0: -(x0 + w), x1: -x0 } : { x0, x1: x0 + w });
  return {
    door: { ...mk(doorX0, door.width), y0: door.y0, y1: door.y0 + door.height },
    window: { ...mk(winX0, win.width), y0: win.y0, y1: win.y0 + win.height },
  };
}
