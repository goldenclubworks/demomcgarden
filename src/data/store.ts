import { create } from 'zustand';
import type { FinishId, PackageId, RoofCoverId } from './catalog';
import { PACKAGES, BASE, EXTRAS, ROOF_COVERS } from './catalog';

export type ViewMode = 'orbit' | 'interior';
export type PresetId = 'hero' | 'front' | 'side' | 'back' | 'top' | 'interior';
export type TimeOfDay = 'day' | 'golden' | 'night';
export type Quality = 'high' | 'medium' | 'low';

export interface HouseConfig {
  finish: FinishId;
  doorFinish: FinishId | 'same';
  roof: RoofCoverId;
  gutter: boolean;
  aluTrim: boolean; // Alu-Abschlussprofile anthrazit (Exklusiv-Paket)
  floor: boolean;
  mirrored: boolean;
  package: PackageId;
  assemblyService: boolean;
  extraBase: boolean;
}

export interface UiState extends HouseConfig {
  view: ViewMode;
  preset: PresetId;
  time: TimeOfDay;
  quality: Quality;
  doorOpen: number; // 0..1
  assembly: number; // 0..1 (1 = fertig aufgebaut)
  assemblyPlaying: boolean;
  dimensions: boolean;
  roofOff: boolean;
  panel: boolean;
  arOpen: boolean;
  ready: boolean;
  set: (p: Partial<UiState>) => void;
  applyPackage: (id: PackageId) => void;
  reset: () => void;
}

export const DEFAULT_CONFIG: HouseConfig = {
  finish: 'natur',
  doorFinish: 'same',
  roof: 'osb',
  gutter: false,
  aluTrim: false,
  floor: false,
  mirrored: false,
  package: 'none',
  assemblyService: false,
  extraBase: false,
};

export const useStore = create<UiState>((set) => ({
  ...DEFAULT_CONFIG,
  view: 'orbit',
  preset: 'hero',
  time: 'day',
  quality: 'high',
  doorOpen: 0,
  assembly: 1,
  assemblyPlaying: false,
  dimensions: false,
  roofOff: false,
  panel: typeof window === 'undefined' || window.innerWidth > 880,
  arOpen: false,
  ready: false,
  set: (p) => set(p),
  applyPackage: (id) =>
    set(() => {
      const preset = PACKAGES.find((p) => p.id === id)?.preset;
      return preset
        ? { package: id, roof: preset.roof, gutter: preset.gutter, aluTrim: preset.aluTrim, ...(preset.finish ? { finish: preset.finish } : {}) }
        : { package: id };
    }),
  reset: () => set({ ...DEFAULT_CONFIG }),
}));

export function configOf(s: HouseConfig): HouseConfig {
  const { finish, doorFinish, roof, gutter, aluTrim, floor, mirrored, package: pkg, assemblyService, extraBase } = s;
  return { finish, doorFinish, roof, gutter, aluTrim, floor, mirrored, package: pkg, assemblyService, extraBase };
}

export interface PriceLine {
  label: string;
  price: number;
}
/** Preislogik: Paket enthält Dachset/Rinne/Blenden – doppelt gewählte Posten werden nicht erneut berechnet. */
export function priceLines(c: HouseConfig): { lines: PriceLine[]; total: number; shipping: number } {
  const lines: PriceLine[] = [{ label: BASE.name, price: BASE.price }];
  const pkg = PACKAGES.find((p) => p.id === c.package)!;
  if (pkg.price > 0) lines.push({ label: `${pkg.label}-Zubehörpaket`, price: pkg.price });
  const included = pkg.preset;
  const cover = ROOF_COVERS.find((r) => r.id === c.roof)!;
  if (cover.price > 0 && !(included && included.roof === c.roof)) lines.push({ label: `Dach: ${cover.label}`, price: cover.price });
  if (c.gutter && !included?.gutter) lines.push({ label: EXTRAS.gutter.label, price: EXTRAS.gutter.price });
  if (c.floor) lines.push({ label: EXTRAS.floor.label, price: EXTRAS.floor.price });
  if (c.extraBase) lines.push({ label: EXTRAS.extraBase.label, price: EXTRAS.extraBase.price });
  if (c.assemblyService) lines.push({ label: EXTRAS.assembly.label, price: EXTRAS.assembly.price });
  const total = Math.round(lines.reduce((a, l) => a + l.price, 0) * 100) / 100;
  return { lines, total, shipping: BASE.shipping };
}
