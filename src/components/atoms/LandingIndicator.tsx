import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";

export function LandingIndicator() {
  const meshRef = useRef<THREE.Mesh>(null);
  const store = useGameStore();

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.set(store.position.x, store.landingY + 0.1, store.position.z);

    const heightAbove = Math.max(0, store.position.y - store.landingY);
    const scale = 1 + Math.min(heightAbove / 8, 0.7);
    mesh.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.9, 32]} />
      <meshBasicMaterial
        color="#ffdd00"
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
