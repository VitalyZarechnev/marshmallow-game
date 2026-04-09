import * as THREE from "three";

interface MarshmallowFaceProps {
  smileRef: React.RefObject<THREE.Mesh | null>;
  surpriseRef: React.RefObject<THREE.Mesh | null>;
}

export function MarshmallowFace({ smileRef, surpriseRef }: MarshmallowFaceProps) {
  return (
    <>
      {/* Left eye */}
      <mesh position={[-0.25, 0.15, 0.9]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Right eye */}
      <mesh position={[0.25, 0.15, 0.9]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Smile — visible when grounded */}
      <mesh ref={smileRef} position={[0, -0.1, 0.9]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.15, 0.03, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Surprised "O" mouth — visible when jumping */}
      <mesh ref={surpriseRef} position={[0, -0.12, 0.9]} visible={false}>
        <ringGeometry args={[0.06, 0.12, 16]} />
        <meshStandardMaterial color="#222222" side={2} />
      </mesh>
      {/* Left blush */}
      <mesh position={[-0.45, -0.02, 0.88]}>
        <circleGeometry args={[0.12, 12]} />
        <meshStandardMaterial color="#ffaaaa" transparent opacity={0.5} side={2} />
      </mesh>
      {/* Right blush */}
      <mesh position={[0.45, -0.02, 0.88]}>
        <circleGeometry args={[0.12, 12]} />
        <meshStandardMaterial color="#ffaaaa" transparent opacity={0.5} side={2} />
      </mesh>
    </>
  );
}
