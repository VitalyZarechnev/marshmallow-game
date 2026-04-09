import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";
import { statsStore } from "../../stores/StatsStore";
import type { ModifierData } from "../../utils/levelGenerator";

const MODIFIER_SCALE = 1.4;
const BOB_SPEED = 2;
const BOB_HEIGHT = 0.3;
const ROTATE_SPEED = 1.5;
const PICKUP_DISTANCE = 2.5;

interface ModifierProps {
  readonly data: ModifierData;
}

function HeartShape() {
  const shape = new THREE.Shape();
  const s = 0.4 * MODIFIER_SCALE;
  shape.moveTo(0, s * 0.3);
  shape.bezierCurveTo(0, s * 0.9, -s * 1.0, s * 0.9, -s * 1.0, s * 0.3);
  shape.bezierCurveTo(-s * 1.0, -s * 0.4, 0, -s * 0.8, 0, -s * 1.2);
  shape.bezierCurveTo(0, -s * 0.8, s * 1.0, -s * 0.4, s * 1.0, s * 0.3);
  shape.bezierCurveTo(s * 1.0, s * 0.9, 0, s * 0.9, 0, s * 0.3);

  return (
    <mesh>
      <extrudeGeometry
        args={[
          shape,
          { depth: 0.15 * MODIFIER_SCALE, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 },
        ]}
      />
      <meshStandardMaterial color="#ff4466" emissive="#ff2244" emissiveIntensity={0.3} />
    </mesh>
  );
}

function ArrowShape() {
  const s = MODIFIER_SCALE;
  return (
    <group>
      {/* Arrow shaft */}
      <mesh position={[0, -0.15 * s, 0]}>
        <boxGeometry args={[0.2 * s, 0.5 * s, 0.15 * s]} />
        <meshStandardMaterial color="#44cc44" emissive="#22aa22" emissiveIntensity={0.3} />
      </mesh>
      {/* Arrow head (cone pointing up) */}
      <mesh position={[0, 0.2 * s, 0]}>
        <coneGeometry args={[0.3 * s, 0.4 * s, 4]} />
        <meshStandardMaterial color="#44cc44" emissive="#22aa22" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function ShieldShape() {
  const s = MODIFIER_SCALE;
  return (
    <group>
      {/* Shield body */}
      <mesh>
        <boxGeometry args={[0.5 * s, 0.6 * s, 0.1 * s]} />
        <meshStandardMaterial color="#4488ff" emissive="#2266dd" emissiveIntensity={0.3} />
      </mesh>
      {/* Shield bottom point */}
      <mesh position={[0, -0.4 * s, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.25 * s, 0.25 * s, 0.1 * s]} />
        <meshStandardMaterial color="#4488ff" emissive="#2266dd" emissiveIntensity={0.3} />
      </mesh>
      {/* Shield cross */}
      <mesh position={[0, 0, 0.06 * s]}>
        <boxGeometry args={[0.35 * s, 0.08 * s, 0.02 * s]} />
        <meshStandardMaterial color="#aaccff" emissive="#88aaff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.06 * s]}>
        <boxGeometry args={[0.08 * s, 0.4 * s, 0.02 * s]} />
        <meshStandardMaterial color="#aaccff" emissive="#88aaff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function Modifier({ data }: ModifierProps) {
  const groupRef = useRef<THREE.Group>(null);
  const store = useGameStore();
  const hidden = useRef(false);
  const lastEpoch = useRef(store.resetEpoch);
  const baseY = data.y;

  useFrame((state) => {
    const paused = store.paused;
    const epoch = store.resetEpoch;
    if (paused) return;

    // Respawn: restore shield/jumpBoost modifiers on reset
    if (epoch !== lastEpoch.current) {
      lastEpoch.current = epoch;
      if (data.type !== "heart") {
        hidden.current = false;
        if (groupRef.current) groupRef.current.visible = true;
      }
    }

    if (hidden.current) return;

    // Hearts collected permanently
    if (data.type === "heart" && store.isModifierCollected(data.id)) {
      hidden.current = true;
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    const t = state.clock.elapsedTime;

    // Bob and rotate
    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(t * BOB_SPEED) * BOB_HEIGHT;
      groupRef.current.rotation.y = t * ROTATE_SPEED;
    }

    // Check pickup — only when not game over/win
    if (store.isGameOver || store.isWin) return;
    const pos = store.position;
    const dx = pos.x - data.x;
    const dy = pos.y - data.y;
    const dz = pos.z - data.z;
    if (dx * dx + dy * dy + dz * dz < PICKUP_DISTANCE * PICKUP_DISTANCE) {
      // Can't pick up shield/jumpBoost if already active
      if (data.type === "shield" && store.hasShield) return;
      if (data.type === "jumpBoost" && store.hasJumpBoost) return;

      hidden.current = true;
      if (groupRef.current) groupRef.current.visible = false;
      store.collectModifier(data.id, data.type);
      statsStore.recordModifierCollected(data.type);
    }
  });

  return (
    <group ref={groupRef} position={[data.x, baseY, data.z]}>
      {data.type === "heart" && <HeartShape />}
      {data.type === "jumpBoost" && <ArrowShape />}
      {data.type === "shield" && <ShieldShape />}
    </group>
  );
}
