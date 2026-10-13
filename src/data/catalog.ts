/**
 * Optionen und Preise laut Produktseite mcgarden24.de (Stand 13.10.2026).
 * `sku` ist bewusst null: das Mapping auf Plentymarkets-Variationen erfolgt bei der Shop-Integration.
 */
export const PRICE_DATE = '13.10.2026';

export const BASE = { name: 'Gartenhaus Bergen 400 × 300 cm', price: 1999, uvp: 2999, shipping: 179 };

export type FinishId = 'natur' | 'eiche' | 'nuss' | 'grau' | 'anthrazit' | 'weiss' | 'moosgruen' | 'nachtblau';
export interface Finish {
  id: FinishId;
  label: string;
  /** Lasur (Holzstruktur sichtbar) oder Deckfarbe */
  kind: 'natur' | 'lasur' | 'deck';
  color: string;
  swatch: string;
}
export const FINISHES: Finish[] = [
  { id: 'natur', label: 'Naturbelassen', kind: 'natur', color: '#ffffff', swatch: '#d9bd8a' },
  { id: 'eiche', label: 'Eiche hell', kind: 'lasur', color: '#f2c27c', swatch: '#c99a55' },
  { id: 'nuss', label: 'Nussbaum', kind: 'lasur', color: '#a8774a', swatch: '#8a5d38' },
  { id: 'grau', label: 'Silbergrau', kind: 'lasur', color: '#b6b5ad', swatch: '#9d9c95' },
  { id: 'anthrazit', label: 'Anthrazit', kind: 'deck', color: '#555a5e', swatch: '#3a3d40' },
  { id: 'weiss', label: 'Reinweiß', kind: 'deck', color: '#f4f4f0', swatch: '#eeeeea' },
  { id: 'moosgruen', label: 'Moosgrün', kind: 'deck', color: '#4a5d44', swatch: '#4a5d44' },
  { id: 'nachtblau', label: 'Nachtblau', kind: 'deck', color: '#2f3d52', swatch: '#2f3d52' },
];

export type RoofCoverId = 'osb' | 'bitumen' | 'felt' | 'epdm' | 'trapez';
export interface RoofCover {
  id: RoofCoverId;
  label: string;
  hint: string;
  price: number;
}
export const ROOF_COVERS: RoofCover[] = [
  { id: 'osb', label: 'Unbehandelt', hint: 'OSB-Dachplatte wie geliefert (nicht wetterfest)', price: 0 },
  { id: 'bitumen', label: 'Bitumen selbstklebend', hint: 'Bitumen-Kaltselbstklebebahnen', price: 202.9 },
  { id: 'felt', label: 'Dachpappe', hint: 'Dachpappe V13 mit Glasvlieseinlage, 1. Lage', price: 56.9 },
  { id: 'epdm', label: 'EPDM-Folie', hint: 'Kautschukfolie, nahtlos verklebt', price: 637.95 },
  { id: 'trapez', label: 'Trapezblech', hint: 'Trapezblech anthrazit, 2. Lage', price: 769.9 },
];

export type PackageId = 'none' | 'standard' | 'premium' | 'exklusiv';
export interface AccessoryPackage {
  id: PackageId;
  label: string;
  price: number;
  /** Lieferumfang laut Produktseite („Zubehör-Paket im Überblick“) */
  items: string[];
  /** Voreinstellung der Visualisierung beim Wählen des Pakets */
  preset?: { roof: RoofCoverId; gutter: boolean; aluTrim: boolean; finish?: FinishId };
}
export const PACKAGES: AccessoryPackage[] = [
  { id: 'none', label: 'Ohne Paket', price: 0, items: [] },
  {
    id: 'standard',
    label: 'Standard',
    price: 389,
    items: [
      'Bitumen-Kaltselbstklebebahnen',
      'Pappstifte 13 mm',
      'Schraubenset, gelb verzinkt',
      'Sturmsicherung',
      '100 Gummi-Pads als Feuchtigkeitssperre',
      'Holzschutzgrund 2 × 5 l',
    ],
    preset: { roof: 'bitumen', gutter: false, aluTrim: false },
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 949,
    items: [
      'EPDM-Dachbahnset',
      'Schraubenset, gelb verzinkt',
      'Sturmsicherung',
      '100 Gummi-Pads als Feuchtigkeitssperre',
      'Holzschutzgrund 2 × 5 l',
      'Dachrinne anthrazit',
    ],
    preset: { roof: 'epdm', gutter: true, aluTrim: false },
  },
  {
    id: 'exklusiv',
    label: 'Exklusiv',
    price: 1349,
    items: [
      'EPDM-Dachbahnset inkl. Alu-Abschlussprofile (anthrazit)',
      'Schraubenset, Edelstahl',
      'Sturmsicherung',
      '100 Gummi-Pads als Feuchtigkeitssperre',
      'Holzschutzgrund-Lasur 2 × 5 l, Eiche hell',
      'Dachrinne anthrazit',
    ],
    preset: { roof: 'epdm', gutter: true, aluTrim: true, finish: 'eiche' },
  },
];

export const EXTRAS = {
  floor: { label: 'Fußbodenpaket', price: 339, sku: null },
  extraBase: { label: 'Zusätzliche Unterkonstruktion', price: 175, sku: null },
  gutter: { label: 'Regenrinnen-Set', price: 154.99, sku: null },
  assembly: { label: 'Montageservice (Vermittlung)', price: 879, sku: null },
} as const;

export const WARRANTY = '5 Jahre Garantie';
