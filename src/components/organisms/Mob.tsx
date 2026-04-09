import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";
import { ISLAND_HEIGHT } from "../../config/constants";

const MOB_SPEED = 1.8;
const SHAKE_INTENSITY = 0.08;
const SHAKE_SPEED = 40;
const FLASH_SPEED = 8;
const EXPLOSION_DURATION = 0.8;
const FIRE_PARTICLE_COUNT = 24;

const mobFireVertexShader = /* glsl */ `
  attribute vec3 aVelocity;
  attribute float aSize;
  uniform float uTime;
  uniform float uSpawnTime;
  uniform float uDuration;
  uniform vec3 uOrigin;
  varying float vLife;

  void main() {
    float t = uTime - uSpawnTime;
    vLife = clamp(t / uDuration, 0.0, 1.0);

    // Physics: position = origin + velocity*t + 0.5*gravity*t^2 (fire rises: +y)
    vec3 pos = uOrigin + aVelocity * t + vec3(0.0, 1.5 * t * t, 0.0);

    // Scale: shrinks over lifetime
    float scale = aSize * max(0.01, 1.0 - vLife);
    // Hide if not yet spawned or expired
    if (t < 0.0 || t > uDuration) scale = 0.0;

    vec3 worldPos = pos + position * scale;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const mobFireFragmentShader = /* glsl */ `
  varying float vLife;

  void main() {
    // Orange fire color, fade opacity quadratically
    vec3 col = mix(vec3(1.0, 0.4, 0.0), vec3(1.0, 0.8, 0.2), vLife);
    float alpha = 1.0 - vLife * vLife;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

// --- Merged mob geometry (shared across all mob instances) ---

interface MobPart {
  readonly pos: [number, number, number];
  readonly size: [number, number, number];
  readonly color: number;
  readonly leg: number; // 0 = not a leg, 1-4 = leg index
}

const MOB_PARTS: readonly MobPart[] = [
  { pos: [0, 0.7, 0], size: [0.8, 0.8, 0.8], color: 0x2d8c2d, leg: 0 },           // Head
  { pos: [-0.18, 0.8, 0.41], size: [0.15, 0.15, 0.02], color: 0x111111, leg: 0 },  // Left eye
  { pos: [0.18, 0.8, 0.41], size: [0.15, 0.15, 0.02], color: 0x111111, leg: 0 },   // Right eye
  { pos: [0, 0.62, 0.41], size: [0.12, 0.08, 0.02], color: 0x111111, leg: 0 },     // Mouth top
  { pos: [-0.1, 0.52, 0.41], size: [0.12, 0.12, 0.02], color: 0x111111, leg: 0 },  // Mouth bottom-left
  { pos: [0.1, 0.52, 0.41], size: [0.12, 0.12, 0.02], color: 0x111111, leg: 0 },   // Mouth bottom-right
  { pos: [0, 0, 0], size: [0.6, 0.9, 0.4], color: 0x3aa63a, leg: 0 },              // Body
  { pos: [-0.15, -0.65, 0.12], size: [0.25, 0.5, 0.25], color: 0x267a26, leg: 1 }, // Front-left leg
  { pos: [0.15, -0.65, 0.12], size: [0.25, 0.5, 0.25], color: 0x267a26, leg: 2 },  // Front-right leg
  { pos: [-0.15, -0.65, -0.12], size: [0.25, 0.5, 0.25], color: 0x267a26, leg: 3 },// Back-left leg
  { pos: [0.15, -0.65, -0.12], size: [0.25, 0.5, 0.25], color: 0x267a26, leg: 4 }, // Back-right leg
  { pos: [0.15, 0.15, 0.21], size: [0.15, 0.2, 0.02], color: 0x2d8c2d, leg: 0 },  // Body spot 1
  { pos: [-0.12, -0.1, 0.21], size: [0.18, 0.15, 0.02], color: 0x2d8c2d, leg: 0 },// Body spot 2
];

let mobGeometryCache: THREE.BufferGeometry | null = null;

function getMobGeometry(): THREE.BufferGeometry {
  if (mobGeometryCache) return mobGeometryCache;

  const tmpColor = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];

  for (const part of MOB_PARTS) {
    const geo = new THREE.BoxGeometry(...part.size);
    geo.translate(...part.pos);

    // Vertex colors
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    tmpColor.setHex(part.color);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Leg index attribute (0 = static, 1-4 = leg)
    const legIdx = new Float32Array(count).fill(part.leg);
    geo.setAttribute("aLegIndex", new THREE.BufferAttribute(legIdx, 1));

    parts.push(geo);
  }

  mobGeometryCache = mergeGeometries(parts, false)!;
  for (const geo of parts) geo.dispose();
  return mobGeometryCache;
}

// --- Types ---

type MobState = "patrol" | "fuse" | "exploding" | "dead";

interface MobProps {
  readonly islandX: number;
  readonly islandY: number;
  readonly islandZ: number;
  readonly islandW: number;
  readonly islandD: number;
}

function isPlayerOnIsland(
  px: number, py: number, pz: number,
  ix: number, iy: number, iz: number,
  iw: number, id: number,
): boolean {
  const surfaceY = iy + ISLAND_HEIGHT;
  const margin = 0.5;
  const halfW = iw / 2 + margin;
  const halfD = id / 2 + margin;
  return (
    Math.abs(px - ix) < halfW &&
    Math.abs(pz - iz) < halfD &&
    py > surfaceY - 0.5 &&
    py < surfaceY + 4
  );
}

export function Mob({ islandX, islandY, islandZ, islandW, islandD }: MobProps) {
  const groupRef = useRef<THREE.Group>(null);
  const store = useGameStore();

  const progressRef = useRef(Math.random() * 100);
  const stateRef = useRef<MobState>("patrol");
  const fuseTimerRef = useRef(0);
  const explosionTimerRef = useRef(0);
  const hasBurnedPlayer = useRef(false);
  const lastEpoch = useRef(store.resetEpoch);

  // GPU fire explosion particles
  const fireMeshRef = useRef<THREE.Mesh>(null);
  const fireShaderRef = useRef<THREE.ShaderMaterial>(null);
  const explosionOrigin = useRef(new THREE.Vector3());
  const fireUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpawnTime: { value: -999 },
    uDuration: { value: EXPLOSION_DURATION + 0.5 },
    uOrigin: { value: new THREE.Vector3() },
  }), []);

  // Create instanced buffer geometry for fire particles
  const fireGeometry = useMemo(() => {
    const base = new THREE.SphereGeometry(1, 6, 6);
    const geom = new THREE.InstancedBufferGeometry();
    geom.index = base.index;
    geom.attributes.position = base.attributes.position;
    geom.attributes.normal = base.attributes.normal;

    const velocities = new Float32Array(FIRE_PARTICLE_COUNT * 3);
    const sizes = new Float32Array(FIRE_PARTICLE_COUNT);
    for (let i = 0; i < FIRE_PARTICLE_COUNT; i++) {
      sizes[i] = 0.2 + Math.random() * 0.4;
    }
    geom.setAttribute("aVelocity", new THREE.InstancedBufferAttribute(velocities, 3));
    geom.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 1));
    geom.instanceCount = FIRE_PARTICLE_COUNT;
    return geom;
  }, []);

  // Shared merged geometry (module-level cache)
  const mobGeometry = useMemo(() => getMobGeometry(), []);

  // Per-mob leg swing uniform (updated each frame)
  const legSwings = useMemo(() => ({ value: new THREE.Vector4(0, 0, 0, 0) }), []);

  // Per-mob material with vertex colors + leg animation via onBeforeCompile
  const mobMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLegSwings = legSwings;

      // Declare attribute + uniform at top of vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        `attribute float aLegIndex;
uniform vec4 uLegSwings;
void main() {`
      );

      // Inject leg rotation after begin_vertex (which sets `vec3 transformed`)
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
if (aLegIndex > 0.5) {
  vec3 pivot;
  float swing;
  if (aLegIndex < 1.5) { pivot = vec3(-0.15, -0.65, 0.12); swing = uLegSwings.x; }
  else if (aLegIndex < 2.5) { pivot = vec3(0.15, -0.65, 0.12); swing = uLegSwings.y; }
  else if (aLegIndex < 3.5) { pivot = vec3(-0.15, -0.65, -0.12); swing = uLegSwings.z; }
  else { pivot = vec3(0.15, -0.65, -0.12); swing = uLegSwings.w; }
  vec3 rel = transformed - pivot;
  float c = cos(swing);
  float s = sin(swing);
  transformed = pivot + vec3(rel.x, rel.y * c - rel.z * s, rel.y * s + rel.z * c);
}`
      );
    };
    return mat;
  }, [legSwings]);

  const inset = 0.6;
  const halfW = islandW / 2 - inset;
  const halfD = islandD / 2 - inset;

  const segLengths = [2 * halfD, 2 * halfW, 2 * halfD, 2 * halfW];
  const totalPerimeter = segLengths[0] + segLengths[1] + segLengths[2] + segLengths[3];
  const surfaceY = islandY + ISLAND_HEIGHT;

  function getPatrolPose(p: number): { localX: number; localZ: number; rotY: number } {
    const pp = ((p % totalPerimeter) + totalPerimeter) % totalPerimeter;
    let localX = 0;
    let localZ = 0;
    let rotY = 0;

    if (pp < segLengths[0]) {
      const t = pp / segLengths[0];
      localX = halfW;
      localZ = -halfD + t * 2 * halfD;
      rotY = Math.PI;
    } else if (pp < segLengths[0] + segLengths[1]) {
      const t = (pp - segLengths[0]) / segLengths[1];
      localX = halfW - t * 2 * halfW;
      localZ = halfD;
      rotY = Math.PI / 2;
    } else if (pp < segLengths[0] + segLengths[1] + segLengths[2]) {
      const t = (pp - segLengths[0] - segLengths[1]) / segLengths[2];
      localX = -halfW;
      localZ = halfD - t * 2 * halfD;
      rotY = 0;
    } else {
      const t = (pp - segLengths[0] - segLengths[1] - segLengths[2]) / segLengths[3];
      localX = -halfW + t * 2 * halfW;
      localZ = -halfD;
      rotY = -Math.PI / 2;
    }
    return { localX, localZ, rotY };
  }

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (store.paused) return;
    const mat = mobMaterial;

    // Reset on respawn/restart
    if (store.resetEpoch !== lastEpoch.current) {
      lastEpoch.current = store.resetEpoch;
      stateRef.current = "patrol";
      fuseTimerRef.current = 0;
      explosionTimerRef.current = 0;
      hasBurnedPlayer.current = false;
      progressRef.current = Math.random() * 100;
      group.visible = true;
      group.scale.set(1, 1, 1);
      mat.opacity = 1;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      if (mat.transparent) {
        mat.transparent = false;
        mat.needsUpdate = true;
      }
      if (fireMeshRef.current) fireMeshRef.current.visible = false;
    }

    const state = stateRef.current;

    // --- Update GPU fire shader time ---
    if (fireShaderRef.current) {
      fireShaderRef.current.uniforms.uTime.value += delta;
    }

    if (state === "dead") {
      group.visible = false;
      return;
    }

    const { x: px, y: py, z: pz } = store.position;
    const playerOnIsland = isPlayerOnIsland(px, py, pz, islandX, islandY, islandZ, islandW, islandD);

    // --- State transitions ---
    if (state === "patrol" && playerOnIsland) {
      stateRef.current = "fuse";
      fuseTimerRef.current = 0;
    } else if (state === "fuse" && !playerOnIsland) {
      stateRef.current = "patrol";
      fuseTimerRef.current = 0;
    } else if (state === "fuse") {
      fuseTimerRef.current += delta;
      if (fuseTimerRef.current >= store.difficultyConfig.fuseTime) {
        // BOOM — init fire particles from mob position
        stateRef.current = "exploding";
        explosionTimerRef.current = 0;
        hasBurnedPlayer.current = false;
        const { localX, localZ } = getPatrolPose(progressRef.current);
        const ox = islandX + localX;
        const oy = surfaceY + 0.9;
        const oz = islandZ + localZ;
        explosionOrigin.current.set(ox, oy, oz);

        // Write new random velocities to GPU buffer
        const velocities = new Float32Array(FIRE_PARTICLE_COUNT * 3);
        const sizes = new Float32Array(FIRE_PARTICLE_COUNT);
        for (let i = 0; i < FIRE_PARTICLE_COUNT; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI - Math.PI / 2;
          const speed = 3 + Math.random() * 5;
          velocities[i * 3] = Math.cos(theta) * Math.cos(phi) * speed;
          velocities[i * 3 + 1] = Math.abs(Math.sin(phi)) * speed * 1.5 + 2;
          velocities[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * speed;
          sizes[i] = 0.2 + Math.random() * 0.4;
        }
        const velAttr = fireGeometry.getAttribute("aVelocity") as THREE.InstancedBufferAttribute;
        const sizeAttr = fireGeometry.getAttribute("aSize") as THREE.InstancedBufferAttribute;
        velAttr.array = velocities;
        velAttr.needsUpdate = true;
        sizeAttr.array = sizes;
        sizeAttr.needsUpdate = true;
        if (fireShaderRef.current) {
          fireShaderRef.current.uniforms.uOrigin.value.copy(explosionOrigin.current);
          fireShaderRef.current.uniforms.uSpawnTime.value = fireShaderRef.current.uniforms.uTime.value;
        }
        if (fireMeshRef.current) fireMeshRef.current.visible = true;
      }
    } else if (state === "exploding") {
      explosionTimerRef.current += delta;

      // Trigger player burning at the moment of explosion
      if (!hasBurnedPlayer.current) {
        hasBurnedPlayer.current = true;
        store.startBurning();
      }

      // Mob body shrinks and vanishes (no transparency — avoids water blending)
      const t = explosionTimerRef.current / EXPLOSION_DURATION;
      if (t >= 1) {
        stateRef.current = "dead";
        return;
      }
      const scale = Math.max(0.01, 1 - t * 1.5);
      group.scale.set(scale, scale, scale);

      // Flash white during explosion
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = t * 2;

      group.visible = scale > 0.02;
      return;
    }

    const currentState = stateRef.current;

    // --- Movement & animation ---
    if (currentState === "patrol") {
      progressRef.current = (progressRef.current + MOB_SPEED * delta) % totalPerimeter;
      const { localX, localZ, rotY } = getPatrolPose(progressRef.current);

      group.position.set(islandX + localX, surfaceY + 0.9, islandZ + localZ);
      group.rotation.y = rotY;
      group.scale.set(1, 1, 1);
      group.visible = true;

      // Reset emissive from fuse flash
      if (mat.emissiveIntensity > 0) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }

      // Leg swing via vertex shader uniform
      const walkCycle = progressRef.current * 4;
      const swing = Math.sin(walkCycle) * 0.3;
      legSwings.value.set(swing, -swing, -swing, swing);
    } else if (currentState === "fuse") {
      const { localX, localZ, rotY } = getPatrolPose(progressRef.current);
      const baseX = islandX + localX;
      const baseZ = islandZ + localZ;

      const fuseProgress = fuseTimerRef.current / store.difficultyConfig.fuseTime;
      const intensity = SHAKE_INTENSITY * (0.5 + fuseProgress * 1.5);
      const shakeX = Math.sin(fuseTimerRef.current * SHAKE_SPEED) * intensity;
      const shakeZ = Math.cos(fuseTimerRef.current * SHAKE_SPEED * 1.3) * intensity * 0.7;

      group.position.set(baseX + shakeX, surfaceY + 0.9, baseZ + shakeZ);
      group.rotation.y = rotY;

      // Flash white — make mob body flash between normal and white
      const flash = Math.sin(fuseTimerRef.current * FLASH_SPEED * (1 + fuseProgress * 2));
      const isFlashing = flash > 0 && fuseProgress > 0.3;
      if (isFlashing) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = fuseProgress * 0.6;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }

      const scalePulse = 1 + (flash > 0 ? 0.05 : 0) * fuseProgress;
      group.scale.set(scalePulse, scalePulse, scalePulse);

      // Stop legs during fuse
      legSwings.value.set(0, 0, 0, 0);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh castShadow geometry={mobGeometry} material={mobMaterial} />
      </group>

      {/* GPU fire explosion particles (world-space) */}
      <mesh ref={fireMeshRef} visible={false} frustumCulled={false} geometry={fireGeometry}>
        <shaderMaterial
          ref={fireShaderRef}
          vertexShader={mobFireVertexShader}
          fragmentShader={mobFireFragmentShader}
          uniforms={fireUniforms}
          alphaTest={0.01}
        />
      </mesh>
    </>
  );
}
