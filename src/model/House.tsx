import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useStore } from '@/data/store';
import { buildWalls } from './geometry/walls';
import { buildOpenings } from './geometry/openings';
import { buildBase, buildFloor, GROUND_Y } from './geometry/base';
import {
  ROOF_HALF_L,
  ROOF_ORIGIN_Y,
  ROOF_THETA,
  buildCover,
  buildGutter,
  buildRoofStructure,
} from './geometry/roof';
import { getMaterials } from './materials/materials';
import { SPEC, roofUnderside } from './spec';
import { exportRoot } from '@/lib/exportRoot';

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const seg = (a: number, s: number, d: number) => Math.min(1, Math.max(0, (a - s) / d));

/** Zeitleiste der Aufbau-Animation (0 … 1) */
const TL = { base: [0, 0.08], walls: [0.08, 0.66], doors: [0.66, 0.8], roof: [0.8, 1] } as const;

const geoCache = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key) as T;
}

function useDisposable<T extends { dispose(): void }>(v: T): T {
  useEffect(() => () => v.dispose(), [v]);
  return v;
}

export function House() {
  const mirrored = useStore((s) => s.mirrored);
  const finish = useStore((s) => s.finish);
  const doorFinish = useStore((s) => s.doorFinish);
  const roofCover = useStore((s) => s.roof);
  const aluTrim = useStore((s) => s.aluTrim);
  const gutterOn = useStore((s) => s.gutter);
  const floorOn = useStore((s) => s.floor);

  const mats = useMemo(() => getMaterials(), []);
  // Geometrie wird gecacht: React verwirft useMemo-Ergebnisse, solange Texturen per Suspense laden.
  const walls = cached('walls' + mirrored, () => buildWalls(mirrored));
  const openings = cached('open' + mirrored, () => buildOpenings(mirrored));
  const base = cached('base', buildBase);
  const floor = cached('floor', buildFloor);
  const roofStruct = cached('roof', buildRoofStructure);
  const cover = cached(`cover${roofCover}${aluTrim}`, () => buildCover(roofCover, aluTrim));
  const gutter = cached('gutter', buildGutter);

  useEffect(() => mats.walls.setFinish(finish), [mats, finish]);
  useEffect(() => mats.door.setFinish(doorFinish === 'same' ? finish : doorFinish), [mats, finish, doorFinish]);

  const osb = useTexture({
    map: '/textures/osb_diff.jpg',
    normalMap: '/textures/osb_nor.jpg',
    roughnessMap: '/textures/osb_rough.jpg',
  });
  const bit = useTexture({
    map: '/textures/bitumen_diff.jpg',
    normalMap: '/textures/bitumen_nor.jpg',
    roughnessMap: '/textures/bitumen_rough.jpg',
  });
  useMemo(() => {
    [osb.map, osb.normalMap, osb.roughnessMap, bit.map, bit.normalMap, bit.roughnessMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    });
    osb.map.colorSpace = bit.map.colorSpace = THREE.SRGBColorSpace;
  }, [osb, bit]);

  const floorMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: mats.maps.wood.color, normalMap: mats.maps.wood.normal, roughness: 0.7, vertexColors: true });
    return m;
  }, [mats]);
  useDisposable(floorMat);

  const osbMat = useMemo(() => new THREE.MeshStandardMaterial({ ...osb, roughness: 1, color: '#e8d6b8' }), [osb]);
  const coverMat = useMemo(() => {
    if (roofCover === 'bitumen' || roofCover === 'felt')
      return new THREE.MeshStandardMaterial({ ...bit, color: roofCover === 'felt' ? '#6b6b6b' : '#8a8a8a', roughness: 1 });
    if (roofCover === 'epdm') return new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.82, metalness: 0 });
    if (roofCover === 'trapez')
      return new THREE.MeshStandardMaterial({ color: '#3b3f44', roughness: 0.42, metalness: 0.75, side: THREE.DoubleSide });
    return null;
  }, [roofCover, bit]);
  useDisposable(osbMat);

  // ---- Animation (Aufbau, Tür, Dach-Abheben) ----
  const courseRefs = useRef<(THREE.Group | null)[]>([]);
  const baseRef = useRef<THREE.Group>(null);
  const doorsRef = useRef<THREE.Group>(null);
  const roofRef = useRef<THREE.Group>(null);
  const leafRefs = useRef<(THREE.Group | null)[]>([]);
  const rootRef = useRef<THREE.Group>(null);
  useEffect(() => {
    exportRoot.house = rootRef.current;
    return () => {
      exportRoot.house = null;
    };
  }, []);
  const door = useRef(0);
  const lift = useRef(0);

  useFrame((_, dt) => {
    const st = useStore.getState();
    const a = st.assembly;
    const set = (g: THREE.Object3D | null, p: number, rise: number) => {
      if (!g) return;
      g.visible = p > 0;
      g.position.y = (1 - ease(p)) * rise;
    };
    set(baseRef.current, seg(a, TL.base[0], TL.base[1] - TL.base[0]), 4);
    const n = SPEC.wall.courses + 1;
    courseRefs.current.forEach((g, i) => {
      const s = TL.walls[0] + ((TL.walls[1] - TL.walls[0]) * i) / n;
      set(g, seg(a, s, (TL.walls[1] - TL.walls[0]) / n * 2.2), 3.2);
    });
    set(doorsRef.current, seg(a, TL.doors[0], TL.doors[1] - TL.doors[0]), 2.5);
    const targetLift = st.roofOff ? 3.4 : 0;
    lift.current += (targetLift - lift.current) * Math.min(1, dt * 4);
    const roofP = seg(a, TL.roof[0], TL.roof[1] - TL.roof[0]);
    if (roofRef.current) {
      roofRef.current.visible = roofP > 0;
      roofRef.current.position.y = ROOF_ORIGIN_Y + (1 - ease(roofP)) * 5 + lift.current;
    }
    door.current += (st.doorOpen - door.current) * Math.min(1, dt * 3.2);
    leafRefs.current.forEach((g, i) => {
      if (!g) return;
      const side = openings.leaves[i].side;
      const ang = door.current * (side === 1 ? -1 : 1) * (Math.PI * 0.56);
      g.rotation.y = ang;
    });
  });

  const toggleDoor = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const s = useStore.getState();
    s.set({ doorOpen: s.doorOpen > 0.5 ? 0 : 1 });
  };

  const wallMesh = (geo: THREE.BufferGeometry | null, mat: THREE.Material, key: string) =>
    geo ? <mesh key={key} geometry={geo} material={mat} castShadow receiveShadow /> : null;

  const gutterWorld = useMemo(() => {
    // Rohrauslauf in Weltkoordinaten (m): hinten, an der Seite des Rinnenendes
    const zLocal = (-ROOF_HALF_L - 66) * 0.001;
    const yLocal = (SPEC.roof.thickness - 62 - 18) * 0.001;
    const c = Math.cos(ROOF_THETA), s = Math.sin(ROOF_THETA);
    return { y: ROOF_ORIGIN_Y + yLocal * c + zLocal * s, z: -yLocal * s + zLocal * c };
  }, []);

  return (
    <group ref={rootRef}>
      {/* Unterkonstruktion */}
      <group ref={baseRef}>
        <mesh geometry={base} material={mats.walls.side} castShadow receiveShadow />
        {floorOn && <mesh geometry={floor} material={floorMat} receiveShadow castShadow />}
      </group>

      {/* Wandlagen */}
      {walls.courses.map((c, i) => (
        <group key={i} ref={(g) => { courseRefs.current[i] = g; }}>
          {wallMesh(c.sides, mats.walls.side, 's')}
          {wallMesh(c.caps, mats.walls.end, 'e')}
        </group>
      ))}

      {/* Türen / Fenster / Blenden */}
      <group ref={doorsRef}>
        <mesh geometry={openings.frameWood} material={mats.door.side} castShadow receiveShadow />
        <mesh geometry={openings.frameGlass} material={mats.glass} renderOrder={2} />
        {openings.leaves.map((l, i) => (
          <group
            key={i + (mirrored ? 'm' : '')}
            ref={(g) => { leafRefs.current[i] = g; }}
            position={l.hinge}
            onClick={toggleDoor}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <mesh geometry={l.wood} material={mats.door.side} castShadow receiveShadow />
            <mesh geometry={l.glass} material={mats.glass} renderOrder={2} />
            <mesh geometry={l.steel} material={mats.steel} castShadow />
          </group>
        ))}
      </group>

      {/* Dach (geneigt) */}
      <group ref={roofRef} rotation={[-ROOF_THETA, 0, 0]}>
        <mesh geometry={roofStruct.wood} material={mats.walls.side} castShadow receiveShadow />
        <mesh geometry={roofStruct.deck} material={osbMat} castShadow receiveShadow />
        {cover && coverMat && (
          <>
            <mesh geometry={cover.main} material={coverMat} castShadow receiveShadow />
            {cover.alu && <mesh geometry={cover.alu} material={mats.anthracite} castShadow />}
          </>
        )}
        {gutterOn && (
          <>
            <mesh geometry={gutter.gutter} material={mats.anthracite} castShadow receiveShadow />
            <mesh geometry={gutter.brackets} material={mats.anthracite} castShadow />
          </>
        )}
      </group>
      {gutterOn && (
        <mesh
          material={mats.anthracite}
          position={[(mirrored ? -1 : 1) * (gutter.outletX * 0.001), (gutterWorld.y + GROUND_Y * 0.001) / 2, gutterWorld.z]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.04, gutterWorld.y - GROUND_Y * 0.001 - 0.06, 20]} />
        </mesh>
      )}
    </group>
  );
}

export { roofUnderside };
