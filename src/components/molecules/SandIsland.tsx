import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { createSandTexture, createSandSideTexture } from "../../utils/textures";

let _sandTopCache: THREE.CanvasTexture | null = null;
let _sandSideCache: THREE.CanvasTexture | null = null;
function getSandTopCached() { return _sandTopCache ??= createSandTexture(); }
function getSandSideCached() { return _sandSideCache ??= createSandSideTexture(); }
import { createIslandBoxGeometry, createIslandTopGeometry } from "../../utils/islandGeometry";
import { statsStore } from "../../stores/StatsStore";
import {
  ISLAND_HEIGHT,
  WATER_BOTTOM,
  SAND_PARTICLE_COUNT,
} from "../../config/constants";
import { useGameStore } from "../../stores/GameStore";
import type { IslandData } from "../../utils/levelGenerator";

const SAND_SHAKE_INTENSITY = 0.08;
const SAND_SHAKE_SPEED = 35;
const SAND_PARTICLE_LIFETIME = 2.0;

const sandParticleVertexShader = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aVelocity;
  attribute float aSpawnTime;
  uniform float uTime;
  varying float vLife;

  void main() {
    float t = uTime - aSpawnTime;
    vLife = t / ${SAND_PARTICLE_LIFETIME.toFixed(1)};

    // Hide inactive particles
    float isAlive = step(0.0, t) * step(t, ${SAND_PARTICLE_LIFETIME.toFixed(1)});

    // Physics: pos = offset + vel*t + gravity
    vec3 pos = aOffset + aVelocity * t + vec3(0.0, -3.0 * t * t, 0.0);

    // Scale: shrinks over lifetime
    float scale = 0.4 * max(0.01, 1.0 - vLife) * isAlive;

    vec3 worldPos = pos + position * scale;
    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const sandParticleFragmentShader = /* glsl */ `
  varying float vLife;
  void main() {
    if (vLife < 0.0 || vLife > 1.0) discard;
    vec3 col = vec3(0.83, 0.75, 0.45); // #d4be72
    float alpha = 1.0 - vLife;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

interface SandIslandProps {
  readonly data: IslandData;
}

export function SandIsland({ data }: SandIslandProps) {
  const topY = data.y + ISLAND_HEIGHT;
  const pillarHeight = topY - WATER_BOTTOM;
  const centerY = WATER_BOTTOM + pillarHeight / 2;

  const groupRef = useRef<THREE.Group>(null);
  const rbRef = useRef<any>(null);
  const sinking = useRef(false);
  const sinkOffset = useRef(0);
  const store = useGameStore();
  const lastEpoch = useRef(store.resetEpoch);
  const nextParticleIdx = useRef(0);
  const timeRef = useRef(0);
  const sandUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  // GPU sand particle geometry with per-instance attributes
  const sandParticleGeometry = useMemo(() => {
    const base = new THREE.BoxGeometry(1, 1, 1);
    const geom = new THREE.InstancedBufferGeometry();
    geom.index = base.index;
    geom.attributes.position = base.attributes.position;
    geom.attributes.normal = base.attributes.normal;

    const offsets = new Float32Array(SAND_PARTICLE_COUNT * 3);
    const velocities = new Float32Array(SAND_PARTICLE_COUNT * 3);
    const spawnTimes = new Float32Array(SAND_PARTICLE_COUNT).fill(-999);

    geom.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    geom.setAttribute("aVelocity", new THREE.InstancedBufferAttribute(velocities, 3));
    geom.setAttribute("aSpawnTime", new THREE.InstancedBufferAttribute(spawnTimes, 1));
    geom.instanceCount = SAND_PARTICLE_COUNT;
    return geom;
  }, []);

  const sandTopTex = useMemo(getSandTopCached, []);
  const sandSideTex = useMemo(getSandSideCached, []);
  const boxGeometry = useMemo(
    () => createIslandBoxGeometry(data.w, pillarHeight, data.d),
    [data.w, data.d, pillarHeight]
  );
  const topGeometry = useMemo(
    () => {
      const geo = createIslandTopGeometry(data.w, data.d);
      geo.translate(0, pillarHeight / 2 + 0.01, 0);
      return geo;
    },
    [data.w, data.d, pillarHeight]
  );

  const halfW = data.w / 2;
  const halfH = pillarHeight / 2;
  const halfD = data.d / 2;

  useFrame((_, delta) => {
    if (store.paused) return;

    timeRef.current += delta;

    // Update shader time directly via memoized uniforms object
    sandUniforms.uTime.value = timeRef.current;

    // Reset on respawn/restart
    if (store.resetEpoch !== lastEpoch.current) {
      lastEpoch.current = store.resetEpoch;
      sinking.current = false;
      sinkOffset.current = 0;
      if (groupRef.current) groupRef.current.position.y = centerY;
      if (rbRef.current) {
        rbRef.current.setTranslation({ x: data.x, y: centerY, z: data.z }, true);
      }
      // Reset all particle spawn times to hide them
      const spawnAttr = sandParticleGeometry.getAttribute("aSpawnTime") as THREE.InstancedBufferAttribute;
      (spawnAttr.array as Float32Array).fill(-999);
      spawnAttr.needsUpdate = true;
      nextParticleIdx.current = 0;
    }

    const { x: px, y: py, z: pz } = store.position;
    const surfaceY = data.y + ISLAND_HEIGHT;
    const margin = 0.5;

    // Detect player on island
    const onIsland =
      Math.abs(px - data.x) < halfW + margin &&
      Math.abs(pz - data.z) < halfD + margin &&
      py > surfaceY - 0.5 &&
      py < surfaceY + 3;

    if (onIsland && !sinking.current) {
      sinking.current = true;
      statsStore.recordSandIslandSunk();
    }

    if (sinking.current && groupRef.current) {
      sinkOffset.current += store.difficultyConfig.sandSinkSpeed * delta;

      // Shake
      const shakeX =
        Math.sin(sinkOffset.current * SAND_SHAKE_SPEED) * SAND_SHAKE_INTENSITY;
      const shakeZ =
        Math.cos(sinkOffset.current * SAND_SHAKE_SPEED * 1.3) *
        SAND_SHAKE_INTENSITY *
        0.7;
      groupRef.current.position.x = data.x + shakeX;
      groupRef.current.position.z = data.z + shakeZ;
      groupRef.current.position.y = centerY - sinkOffset.current;

      // Update physics body position to match
      if (rbRef.current) {
        rbRef.current.setTranslation(
          {
            x: data.x + shakeX,
            y: centerY - sinkOffset.current,
            z: data.z + shakeZ,
          },
          true
        );
      }

      // Spawn sand particles into GPU ring buffer
      const currentSurfaceY = surfaceY - sinkOffset.current;
      const offsetAttr = sandParticleGeometry.getAttribute("aOffset") as THREE.InstancedBufferAttribute;
      const velAttr = sandParticleGeometry.getAttribute("aVelocity") as THREE.InstancedBufferAttribute;
      const spawnAttr = sandParticleGeometry.getAttribute("aSpawnTime") as THREE.InstancedBufferAttribute;
      const offArr = offsetAttr.array as Float32Array;
      const velArr = velAttr.array as Float32Array;
      const spawnArr = spawnAttr.array as Float32Array;

      let needsUpdate = false;
      for (let s = 0; s < SAND_PARTICLE_COUNT; s++) {
        // Only spawn into expired slots
        const idx = nextParticleIdx.current;
        const elapsed = timeRef.current - spawnArr[idx];
        if (elapsed > SAND_PARTICLE_LIFETIME && Math.random() < 0.8) {
          const ex = (Math.random() - 0.5) * data.w * 0.9;
          const ez = (Math.random() - 0.5) * data.d * 0.9;
          offArr[idx * 3] = data.x + ex;
          offArr[idx * 3 + 1] = currentSurfaceY + 0.5;
          offArr[idx * 3 + 2] = data.z + ez;
          velArr[idx * 3] = (Math.random() - 0.5) * 4.0;
          velArr[idx * 3 + 1] = 0.3 + Math.random() * 0.5;
          velArr[idx * 3 + 2] = (Math.random() - 0.5) * 4.0;
          spawnArr[idx] = timeRef.current;
          needsUpdate = true;
          nextParticleIdx.current = (idx + 1) % SAND_PARTICLE_COUNT;
          break; // One particle per frame to spread spawns over time
        }
        nextParticleIdx.current = (idx + 1) % SAND_PARTICLE_COUNT;
      }
      if (needsUpdate) {
        offsetAttr.needsUpdate = true;
        velAttr.needsUpdate = true;
        spawnAttr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <RigidBody
        ref={rbRef}
        type="kinematicPosition"
        position={[data.x, centerY, data.z]}
        colliders={false}
      >
        <CuboidCollider args={[halfW, halfH, halfD]} />
      </RigidBody>
      <group ref={groupRef} position={[data.x, centerY, data.z]}>
        <mesh castShadow receiveShadow geometry={boxGeometry}>
          <meshStandardMaterial map={sandSideTex} />
        </mesh>
        <mesh castShadow receiveShadow geometry={topGeometry}>
          <meshStandardMaterial map={sandTopTex} />
        </mesh>
      </group>
      {/* GPU sand particles */}
      <mesh frustumCulled={false} geometry={sandParticleGeometry}>
        <shaderMaterial
          vertexShader={sandParticleVertexShader}
          fragmentShader={sandParticleFragmentShader}
          uniforms={sandUniforms}
          alphaTest={0.01}
        />
      </mesh>
    </>
  );
}
