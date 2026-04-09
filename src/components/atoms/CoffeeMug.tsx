import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../stores/GameStore";
import { ISLAND_HEIGHT } from "../../config/constants";

interface CoffeeMugProps {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function CoffeeMug({ x, y: baseY, z }: CoffeeMugProps) {
  const groupRef = useRef<THREE.Group>(null);
  const marshmallowRef = useRef<THREE.Group>(null);
  const store = useGameStore();
  const animProgress = useRef(0);

  useFrame((_, delta) => {
    if (store.paused) return;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.2;
    }

    // Animate marshmallow shrinking into mug on win
    if (store.isWin && marshmallowRef.current) {
      animProgress.current = Math.min(1, animProgress.current + delta * 0.8);
      const t = animProgress.current;
      const scale = Math.max(0.05, 1 - t * 0.95);
      const yOffset = 2.5 - t * 2.0; // drop from above into mug
      marshmallowRef.current.scale.set(scale, scale, scale);
      marshmallowRef.current.position.y = yOffset;
      marshmallowRef.current.rotation.y += delta * 4; // spin fast
      marshmallowRef.current.visible = true;
      if (t >= 1) {
        store.showWin();
      }
    } else if (!store.isWin && marshmallowRef.current) {
      // Reset animation state for next play
      animProgress.current = 0;
      marshmallowRef.current.visible = false;
      marshmallowRef.current.scale.set(1, 1, 1);
      marshmallowRef.current.position.y = 2.5;
    }
  });

  const y = baseY + ISLAND_HEIGHT + 1.2;

  return (
    <group position={[x, y, z]}>
      <group ref={groupRef}>
        {/* Mug body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.7, 1.4, 16]} />
          <meshStandardMaterial color="#f5f5f0" />
        </mesh>
        {/* Coffee inside */}
        <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.72, 16]} />
          <meshStandardMaterial color="#3e1a00" />
        </mesh>
        {/* Handle */}
        <mesh position={[0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.08, 8, 16]} />
          <meshStandardMaterial color="#f5f5f0" />
        </mesh>
        {/* Steam particles */}
        <mesh position={[-0.15, 1.1, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.3} />
        </mesh>
        <mesh position={[0.15, 1.3, 0.1]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0, 1.5, -0.1]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.2} />
        </mesh>
      </group>
      {/* Mini marshmallow that appears and shrinks into mug on win */}
      <group ref={marshmallowRef} visible={false} position={[0, 2.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.8, 12, 1, false]} />
          <meshStandardMaterial color="#fff8f0" />
        </mesh>
        <mesh position={[-0.1, 0.1, 0.42]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.1, 0.1, 0.42]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
    </group>
  );
}
