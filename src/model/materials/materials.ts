import * as THREE from 'three';
import { FINISHES, type FinishId } from '@/data/catalog';
import { createEndGrainMaps, createWoodMaps, type EndGrainMaps, type WoodMaps } from './woodTextures';

/** Ein Holzmaterial-Paar (Längsholz + Hirnholz), dessen Oberfläche per Finish umgestellt wird. */
export class WoodSet {
  side: THREE.MeshStandardMaterial;
  end: THREE.MeshStandardMaterial;
  constructor(private maps: WoodMaps, private endMaps: EndGrainMaps) {
    this.side = new THREE.MeshStandardMaterial({
      map: maps.color,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: maps.rough,
      roughness: 1,
      metalness: 0,
      vertexColors: true,
    });
    this.end = new THREE.MeshStandardMaterial({
      map: endMaps.color,
      roughness: 0.95,
      metalness: 0,
      vertexColors: true,
    });
  }
  setFinish(id: FinishId) {
    const f = FINISHES.find((x) => x.id === id)!;
    const deck = f.kind === 'deck';
    this.side.map = deck ? this.maps.grain : this.maps.color;
    this.end.map = deck ? this.endMaps.grain : this.endMaps.color;
    this.side.color.set(f.kind === 'natur' ? '#ffffff' : f.color);
    this.end.color.set(f.kind === 'natur' ? '#ffffff' : f.color);
    this.side.roughness = deck ? 0.9 : f.kind === 'lasur' ? 0.82 : 1;
    this.side.normalScale.setScalar(deck ? 0.55 : 0.9);
    this.side.needsUpdate = true;
    this.end.needsUpdate = true;
  }
}

export interface HouseMaterials {
  walls: WoodSet;
  door: WoodSet;
  glass: THREE.MeshPhysicalMaterial;
  steel: THREE.MeshStandardMaterial;
  aluminium: THREE.MeshStandardMaterial;
  anthracite: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  maps: { wood: WoodMaps; end: EndGrainMaps };
}

let cached: HouseMaterials | null = null;

export function getMaterials(): HouseMaterials {
  if (cached) return cached;
  const t0 = performance.now();
  const wood = createWoodMaps();
  const end = createEndGrainMaps();
  if (import.meta.env.DEV) console.info('[perf] Holztexturen', Math.round(performance.now() - t0), 'ms');
  cached = {
    walls: new WoodSet(wood, end),
    door: new WoodSet(wood, end),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#3f5159',
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.4,
      ior: 2.0,
      reflectivity: 1,
      envMapIntensity: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    steel: new THREE.MeshStandardMaterial({ color: '#c8cacc', metalness: 1, roughness: 0.28 }),
    aluminium: new THREE.MeshStandardMaterial({ color: '#d3d5d6', metalness: 1, roughness: 0.34 }),
    anthracite: new THREE.MeshStandardMaterial({ color: '#35383b', metalness: 0.6, roughness: 0.42 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#1b1c1d', metalness: 0, roughness: 0.92 }),
    maps: { wood, end },
  };
  return cached;
}
