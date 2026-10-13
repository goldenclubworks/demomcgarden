import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, SMAA, N8AO } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { House } from '@/model/House';
import { Ground, Sky, SUN } from './Environment';
import { Dimensions } from '@/features/Dimensions';
import { Hotspots } from '@/features/Hotspots';
import { useStore, type PresetId } from '@/data/store';
import type CC from 'camera-controls';

export const CAMERA_PRESETS = {
  hero: { pos: [-5.4, 2.1, 7.1], target: [0.1, 1.05, 0] },
  front: { pos: [0.4, 1.5, 8.6], target: [0, 1.15, 0] },
  side: { pos: [8.6, 1.9, 1.2], target: [0, 1.1, 0] },
  back: { pos: [4.5, 2.6, -7.4], target: [0, 1.1, 0] },
  top: { pos: [0.01, 11.5, 2.2], target: [0, 0, 0] },
  interior: { pos: [1.1, 1.55, 1.15], target: [-0.9, 1.25, -1.3] },
} as const satisfies Record<PresetId, { pos: readonly number[]; target: readonly number[] }>;

function Rig() {
  const ref = useRef<CC>(null);
  const introDone = useRef(false);
  const preset = useStore((s) => s.preset);
  const view = useStore((s) => s.view);
  const { camera } = useThree();
  const size = useThree((st) => st.size);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const p = CAMERA_PRESETS[preset];
    const inside = preset === 'interior';
    // Hochformat: Kamera zurücksetzen, damit das ganze Haus ins Bild passt
    const aspect = size.width / size.height;
    const f = inside ? 1 : Math.min(2.6, Math.max(1, 1.75 / aspect));
    const pos = p.pos.map((v, i) => p.target[i] + (v - p.target[i]) * f);
    c.minDistance = inside ? 0.01 : 2.5;
    c.maxDistance = inside ? 3.5 : 16;
    c.maxPolarAngle = inside ? Math.PI * 0.8 : Math.PI * 0.495;
    const st = useStore.getState();
    if (st.intro && preset === 'hero' && !introDone.current) {
      introDone.current = true;
      c.setLookAt(pos[0] - 4.2 * f, pos[1] + 2.4, pos[2] + 5.5 * f, p.target[0], p.target[1], p.target[2], false);
      c.smoothTime = 2.2;
      void c.setLookAt(pos[0], pos[1], pos[2], p.target[0], p.target[1], p.target[2], true).then(() => (c.smoothTime = 0.35));
    } else {
      c.setLookAt(pos[0], pos[1], pos[2], p.target[0], p.target[1], p.target[2], st.ready);
    }
    (camera as THREE.PerspectiveCamera).fov = inside ? 70 : 34;
    camera.updateProjectionMatrix();
  }, [preset, camera, size.width, size.height]);
  void view;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __store: unknown }).__store = useStore;
    (window as unknown as { __mc: unknown }).__mc = {
      look: (p: number[], t: number[]) => ref.current?.setLookAt(p[0], p[1], p[2], t[0], t[1], t[2], false),
    };
  }, []);
  // Auf Desktop: Bildmitte in die freie Fläche links vom Konfigurator schieben
  const panelOpen = useStore((st) => st.panel);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width > 880;
    const shift = wide && panelOpen ? 190 : 0;
    cam.setViewOffset(size.width, size.height, shift, 0, size.width, size.height);
    cam.updateProjectionMatrix();
  }, [size, camera, panelOpen]);
  return <CameraControls ref={ref} makeDefault smoothTime={0.35} draggingSmoothTime={0.12} dollySpeed={0.6} />;
}

function Lights() {
  const time = useStore((s) => s.time);
  const q = useStore((s) => s.quality);
  const t = SUN[time];
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (light.current) light.current.target.position.set(0, 1, 0);
  });
  return (
    <>
      <directionalLight
        ref={light}
        position={t.pos}
        color={t.color}
        intensity={t.intensity}
        castShadow
        shadow-mapSize={q === 'low' ? [1024, 1024] : [4096, 4096]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      {time === 'night' && (
        <>
          <pointLight position={[0, 1.95, 0]} color="#ffcf94" intensity={6.5} distance={7} decay={1.6} />
          <pointLight position={[0, 1.6, 2.3]} color="#ffc17a" intensity={1.2} distance={4} decay={2} />
        </>
      )}
    </>
  );
}

function Post() {
  const q = useStore((s) => s.quality);
  if (q === 'low') {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO aoRadius={0.22} distanceFalloff={0.6} intensity={q === 'high' ? 2.6 : 1.8} quality={q === 'high' ? 'high' : 'medium'} color="#2a1c10" />
      <Bloom intensity={0.12} luminanceThreshold={1.1} luminanceSmoothing={0.4} mipmapBlur />
      <Vignette eskil={false} offset={0.28} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

function Ready() {
  const set = useStore((s) => s.set);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => set({ ready: true })));
    const fallback = setTimeout(() => set({ ready: true }), 6000);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(fallback);
    };
  }, [set]);
  return null;
}

export function Scene() {
  const quality = useStore((s) => s.quality);
  const set = useStore((s) => s.set);
  return (
    <Canvas
      shadows="soft"
      dpr={[1, quality === 'high' ? 2 : 1.5]}
      camera={{ fov: 34, near: 0.1, far: 300, position: CAMERA_PRESETS.hero.pos as unknown as [number, number, number] }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }}
    >
      <PerformanceMonitor
        onDecline={() => set({ quality: quality === 'high' ? 'medium' : 'low' })}
        flipflops={2}
      />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Sky />
        <Lights />
        <Ground />
        <House />
        <Dimensions />
        <Hotspots />
        <Post />
        <Ready />
      </Suspense>
      <Rig />
    </Canvas>
  );
}
