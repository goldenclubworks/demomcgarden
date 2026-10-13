import type * as THREE from 'three';

/** Wurzelgruppe des Hauses für den GLB-Export (AR). Wird von <House /> registriert. */
export const exportRoot: { house: THREE.Object3D | null } = { house: null };
