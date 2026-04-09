import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";

export function Lighting() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const store = useGameStore();

  useFrame(() => {
    if (!lightRef.current) return;
    const { x, z } = store.position;
    // Shadow camera follows player
    lightRef.current.position.set(x + 10, 15, z + 10);
    lightRef.current.target.position.set(x, 0, z);
    lightRef.current.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight args={["#87ceeb", "#556b2f", 0.8]} />
      <directionalLight
        ref={lightRef}
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </>
  );
}
