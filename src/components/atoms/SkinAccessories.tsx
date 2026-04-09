import * as THREE from "three";
import type { SkinId } from "../../stores/GameStore";

interface SkinAccessoriesProps {
  readonly skin: SkinId;
}

const lensShape = new THREE.Shape();
lensShape.absellipse(0, 0, 0.18, 0.13, 0, Math.PI * 2, false, 0);

function Sunglasses() {
  return (
    <group position={[0, 0.15, 0.85]}>
      {/* Left lens */}
      <mesh position={[-0.25, 0, 0.05]}>
        <extrudeGeometry args={[lensShape, { depth: 0.06, bevelEnabled: false }]} />
        <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Right lens */}
      <mesh position={[0.25, 0, 0.05]}>
        <extrudeGeometry args={[lensShape, { depth: 0.06, bevelEnabled: false }]} />
        <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Bridge */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.12, 0.03, 0.04]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.44, 0, -0.05]} rotation={[0, Math.PI / 2.5, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.03]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.44, 0, -0.05]} rotation={[0, -Math.PI / 2.5, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.03]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function CowboyHat() {
  return (
    <group position={[0, 0.9, 0]}>
      {/* Brim */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.06, 32]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Crown */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.5, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Top dent */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.06, 16]} />
        <meshStandardMaterial color="#7a3b10" roughness={0.9} />
      </mesh>
      {/* Hat band */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.08, 16]} />
        <meshStandardMaterial color="#654321" roughness={0.7} />
      </mesh>
    </group>
  );
}

function CowboyVest() {
  // Vest wraps around the marshmallow body (radius 0.85), open in front
  // thetaStart=0.4 thetaLength=PI*2-0.8 leaves a gap in front
  const frontGap = 0.7;
  return (
    <group position={[0, -0.45, 0]}>
      {/* Main vest body — open cylinder wrapping around, below face */}
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, 0.7, 32, 1, true, frontGap, Math.PI * 2 - frontGap * 2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Left lapel */}
      <mesh position={[-0.32, 0.2, 0.82]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.25, 0.35, 0.04]} />
        <meshStandardMaterial color="#7a3b10" roughness={0.9} />
      </mesh>
      {/* Right lapel */}
      <mesh position={[0.32, 0.2, 0.82]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.25, 0.35, 0.04]} />
        <meshStandardMaterial color="#7a3b10" roughness={0.9} />
      </mesh>
      {/* Bottom trim */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.06, 32, 1, true, frontGap, Math.PI * 2 - frontGap * 2]} />
        <meshStandardMaterial color="#654321" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Mustache() {
  return (
    <group position={[0, -0.08, 0.88]}>
      {/* Left side — horizontal, curving down slightly */}
      <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]}>
        <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      {/* Right side — horizontal, curving down slightly */}
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]}>
        <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Halo() {
  return (
    <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.55, 0.07, 12, 32]} />
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ffaa00"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

export function SkinAccessories({ skin }: SkinAccessoriesProps) {
  switch (skin) {
    case "sunglasses":
      return <Sunglasses />;
    case "cowboy":
      return (
        <>
          <CowboyHat />
          <CowboyVest />
          <Mustache />
        </>
      );
    case "angel":
      return <Halo />;
    default:
      return null;
  }
}
