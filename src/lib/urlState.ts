import { useEffect } from 'react';
import { FINISHES, PACKAGES, ROOF_COVERS } from '@/data/catalog';
import { configOf, useStore, type HouseConfig } from '@/data/store';

/** Konfiguration als teilbarer Link (?finish=anthrazit&roof=epdm&…). */
const KEYS: (keyof HouseConfig)[] = ['finish', 'doorFinish', 'roof', 'gutter', 'aluTrim', 'floor', 'mirrored', 'package', 'assemblyService', 'extraBase'];

const valid: Partial<Record<keyof HouseConfig, (v: string) => boolean>> = {
  finish: (v) => FINISHES.some((f) => f.id === v),
  doorFinish: (v) => v === 'same' || FINISHES.some((f) => f.id === v),
  roof: (v) => ROOF_COVERS.some((r) => r.id === v),
  package: (v) => PACKAGES.some((p) => p.id === v),
};

export function readConfigFromUrl(): Partial<HouseConfig> {
  const q = new URLSearchParams(location.search);
  const out: Record<string, string | boolean> = {};
  for (const k of KEYS) {
    const v = q.get(k);
    if (v === null) continue;
    const check = valid[k];
    if (check) {
      if (check(v)) out[k] = v;
    } else out[k] = v === '1' || v === 'true';
  }
  return out as Partial<HouseConfig>;
}

export function configUrl(c: HouseConfig): string {
  const q = new URLSearchParams();
  for (const k of KEYS) q.set(k, typeof c[k] === 'boolean' ? (c[k] ? '1' : '0') : String(c[k]));
  return `${location.origin}${location.pathname}?${q.toString()}`;
}

export function useUrlConfig() {
  useEffect(() => {
    const init = readConfigFromUrl();
    if (Object.keys(init).length) useStore.getState().set(init);
  }, []);
}

export { configOf };
