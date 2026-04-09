import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";

const SHIELD_COUNT = 4;
const ORBIT_RADIUS = 1.8;
const ORBIT_SPEED = 2.5;
const S = 0.9;

function MiniShield() {
  return (
    <group>
      {/* Shield body */}
      <mesh>
        <boxGeometry args={[S * 0.5, S * 0.6, S * 0.1]} />
        <meshStandardMaterial
          color="#4488ff"
          emissive="#2266dd"
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Shield bottom point */}
      <mesh position={[0, -S * 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[S * 0.25, S * 0.25, S * 0.1]} />
        <meshStandardMaterial
          color="#4488ff"
          emissive="#2266dd"
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Shield cross */}
      <mesh position={[0, 0, S * 0.06]}>
        <boxGeometry args={[S * 0.35, S * 0.08, 0.02]} />
        <meshStandardMaterial color="#aaccff" emissive="#88aaff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0, S * 0.06]}>
        <boxGeometry args={[S * 0.08, S * 0.4, 0.02]} />
        <meshStandardMaterial color="#aaccff" emissive="#88aaff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function ShieldOrbit() {
  const store = useGameStore();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.visible = store.hasShield;
    if (!store.hasShield) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * ORBIT_SPEED;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {Array.from({ length: SHIELD_COUNT }, (_, i) => {
        const angle = (i / SHIELD_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * ORBIT_RADIUS;
        const z = Math.sin(angle) * ORBIT_RADIUS;
        return (
          <group key={i} position={[x, 0, z]}>
            <MiniShield />
          </group>
        );
      })}
    </group>
  );
}
