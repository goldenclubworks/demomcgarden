import { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, useEnvironment, useTexture } from '@react-three/drei';
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js';
import { useStore, type TimeOfDay } from '@/data/store';

export const SUN: Record<TimeOfDay, { pos: [number, number, number]; color: string; intensity: number; env: number; bg: number; sky: string }> = {
  day: { pos: [-3.4, 8.3, 8.0], color: '#fff0da', intensity: 2.6, env: 1.2, bg: 1, sky: '#9fc4e8' },
  golden: { pos: [-9, 3.2, 5.5], color: '#ffb877', intensity: 3.6, env: 0.4, bg: 0.55, sky: '#c98a5e' },
  night: { pos: [5, 8, -4], color: '#8ba3ff', intensity: 0.35, env: 0.1, bg: 0.1, sky: '#050912' },
};

/** Rasenfläche mit weichem Rand und Pflasterterrasse unter dem Haus. */
export function Ground() {
  const time = useStore((s) => s.time);
  const g = useTexture({
    map: '/textures/grass_diff.jpg',
    normalMap: '/textures/grass_nor.jpg',
    roughnessMap: '/textures/grass_rough.jpg',
  });
  const p = useTexture({
    map: '/textures/pavers_diff.jpg',
    normalMap: '/textures/pavers_nor.jpg',
    roughnessMap: '/textures/pavers_rough.jpg',
  });
  const fade = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(0.72, '#fff');
    gr.addColorStop(1, '#000');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  useMemo(() => {
    for (const t of [g.map, g.normalMap, g.roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(70, 70);
      t.anisotropy = 8;
    }
    for (const t of [p.map, p.normalMap, p.roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(5, 4);
      t.anisotropy = 8;
    }
    g.map.colorSpace = p.map.colorSpace = THREE.SRGBColorSpace;
  }, [g, p]);
  const dim = time === 'night' ? 0.35 : 1;
  return (
    <group position={[0, -0.07, 0]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.004, 0]}>
        <circleGeometry args={[70, 96]} />
        <meshStandardMaterial {...g} color={new THREE.Color(0.55 * dim, 0.68 * dim, 0.4 * dim)} transparent alphaMap={fade} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0.6, 0.001, 0.9]}>
        <planeGeometry args={[8.6, 6.6]} />
        <meshStandardMaterial {...p} color={new THREE.Color(0.9 * dim, 0.9 * dim, 0.9 * dim)} roughness={1} />
      </mesh>
    </group>
  );
}

/** Dreht die HDRI so, dass Sonne vorn links steht und hinter dem Haus Bäume statt Mauer sichtbar sind. */
export const ENV_ROT = -1.35;
const HDRI_SUN_AZ = 0.626;

function Backdrop({ texture, rot, gain }: { texture: THREE.Texture; rot: number; gain: number }) {
  const sky = useMemo(() => {
    // weiche Vergrößerung statt Pixelblöcke: lineare Filter + Mipmaps, leichte Unschärfe wie Tiefenunschärfe
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    if (import.meta.env.DEV) (window as unknown as { __hdri: unknown }).__hdri = texture;
    const m = new GroundedSkybox(texture, 2.1, 80);
    (m.material as THREE.MeshBasicMaterial).onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        'vec4 sampledDiffuseColor = texture2D( map, vMapUv, 4.0 ); diffuseColor *= sampledDiffuseColor;',
      );
    };
    m.rotation.y = -rot;
    m.position.y = -0.07 + 2.1;
    return m;
  }, [texture, rot]);
  // MeshBasicMaterial multipliziert die Karte mit der Farbe → Helligkeit des Hintergrunds
  (sky.material as THREE.MeshBasicMaterial).color.setScalar(gain);
  (sky.material as THREE.MeshBasicMaterial).toneMapped = true;
  return <primitive object={sky} />;
}

export function Sky() {
  const time = useStore((s) => s.time);
  const t = SUN[time];
  const tex = useEnvironment({ files: '/hdri/garden_1k.hdr' });
  const rot = useMemo(() => {
    const q = new URLSearchParams(location.search).get('rot');
    return q !== null ? +q : ENV_ROT;
  }, []);
  return (
    <>
      <Environment map={tex} environmentIntensity={t.env} environmentRotation={[0, rot, 0]} />
      <group visible>
        <Backdrop texture={tex} rot={rot} gain={4.2 * t.bg} />
      </group>
    </>
  );
}

export const SUN_DIR_DAY = (() => {
  const az = HDRI_SUN_AZ + 1.35;
  const el = 0.76;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)] as const;
})();
