import { useMemo } from "react";
import * as THREE from "three";
import { createMountainTexture } from "../../utils/textures";

const RADIUS = 200;
const HEIGHT = 80;
const SEGMENTS = 64;

export function Mountains() {
  const texture = useMemo(() => createMountainTexture(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, SEGMENTS, 1, true);
    // Flip UVs horizontally so texture reads correctly from inside
    const uv = geo.attributes.uv.array as Float32Array;
    for (let i = 0; i < uv.length; i += 2) {
      uv[i] = 1 - uv[i];
    }
    geo.attributes.uv.needsUpdate = true;
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, [texture]);

  return (
    <mesh position={[0, HEIGHT / 2 - 18, 0]} geometry={geometry} material={material} renderOrder={-1} />
  );
}
