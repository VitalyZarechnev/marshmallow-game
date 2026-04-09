import * as THREE from "three";

/**
 * Creates a box geometry with tiling UVs for the side/dirt texture.
 * The top face will be hidden by a separate grass plane on top.
 *
 * Three.js BoxGeometry face order:
 * 0: +X, 1: -X, 2: +Y (top), 3: -Y (bottom), 4: +Z, 5: -Z
 */
export function createIslandBoxGeometry(
  w: number,
  h: number,
  d: number
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv.array as Float32Array;

  for (let face = 0; face < 6; face++) {
    const base = face * 8;

    let tileU: number;
    let tileV: number;

    if (face === 0 || face === 1) {
      // +X, -X: width = d, height = h
      tileU = d / 2;
      tileV = h / 2;
    } else if (face === 2 || face === 3) {
      // +Y, -Y: width = w, height = d
      tileU = w / 2;
      tileV = d / 2;
    } else {
      // +Z, -Z: width = w, height = h
      tileU = w / 2;
      tileV = h / 2;
    }

    for (let v = 0; v < 4; v++) {
      uv[base + v * 2] *= tileU;
      uv[base + v * 2 + 1] *= tileV;
    }
  }

  geo.attributes.uv.needsUpdate = true;
  return geo;
}

/**
 * Creates a horizontal plane for the island top (grass/sand top texture).
 * Positioned at y=0 in local space — caller translates to correct world position.
 */
export function createIslandTopGeometry(
  w: number,
  d: number
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);

  const uv = geo.attributes.uv.array as Float32Array;
  const tileU = w / 2;
  const tileV = d / 2;
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] *= tileU;
    uv[i + 1] *= tileV;
  }
  geo.attributes.uv.needsUpdate = true;
  return geo;
}
