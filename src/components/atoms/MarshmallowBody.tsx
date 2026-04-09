import { useMemo } from "react";
import * as THREE from "three";

const fireVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fireFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += noise(p * 1.0) * 0.5;
    v += noise(p * 2.0) * 0.25;
    v += noise(p * 4.0) * 0.125;
    v += noise(p * 8.0) * 0.0625;
    return v;
  }

  void main() {
    // UV: x = around cylinder (0..1), y = bottom to top (0..1)
    vec2 uv = vUv;

    // Map UV.x to a circle so noise tiles seamlessly around the cylinder
    float angle = uv.x * 6.28318530718; // 2*PI
    float cx = cos(angle);
    float cy = sin(angle);

    // Scroll noise upward for flame movement
    float n = fbm(vec2(cx * 3.0 + cy * 3.0, uv.y * 4.0 - uTime * 3.0));
    n += fbm(vec2(cx * 5.0 - cy * 5.0 + 1.7, uv.y * 6.0 - uTime * 4.5)) * 0.5;

    // Flame shape: strongest at bottom, fades at top
    float heightFade = 1.0 - uv.y;
    float flame = n * heightFade * 2.0;
    flame = clamp(flame * uIntensity, 0.0, 1.0);

    // Color palette: black -> red -> orange -> yellow -> white
    vec3 col;
    if (flame < 0.33) {
      col = mix(vec3(0.0), vec3(0.8, 0.1, 0.0), flame / 0.33);
    } else if (flame < 0.66) {
      col = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.6, 0.0), (flame - 0.33) / 0.33);
    } else {
      col = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.95, 0.5), (flame - 0.66) / 0.34);
    }

    // Alpha: flame shape with height fade
    float alpha = flame * smoothstep(0.0, 0.1, flame);

    gl_FragColor = vec4(col, alpha);
  }
`;

interface MarshmallowBodyProps {
  bodyMatRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  topCapMatRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  bottomCapMatRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  fireGroupRef: React.RefObject<THREE.Mesh | null>;
  fireMatRef: React.RefObject<THREE.ShaderMaterial | null>;
}

export function MarshmallowBody({
  bodyMatRef,
  topCapMatRef,
  bottomCapMatRef,
  fireGroupRef,
  fireMatRef,
}: MarshmallowBodyProps) {
  const fireUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  }), []);

  return (
    <>
      {/* Body — cylinder with small rounded caps */}
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 1.8, 32, 1, false]} />
        <meshStandardMaterial ref={bodyMatRef} color="#fff8f0" roughness={0.8} />
      </mesh>
      {/* Top rounded cap — small bevel */}
      <mesh castShadow position={[0, 0.9, 0]} scale={[1, 0.25, 1]}>
        <sphereGeometry args={[0.85, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={topCapMatRef} color="#fff8f0" roughness={0.8} />
      </mesh>
      {/* Bottom rounded cap — small bevel */}
      <mesh castShadow position={[0, -0.9, 0]} scale={[1, 0.25, 1]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.85, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={bottomCapMatRef} color="#fff8f0" roughness={0.8} />
      </mesh>
      {/* GPU shader fire — cylinder wrapping marshmallow */}
      <mesh ref={fireGroupRef} visible={false} position={[0, -0.2, 0]} renderOrder={10}>
        <cylinderGeometry args={[0.95, 0.95, 1.8, 32, 1, true]} />
        <shaderMaterial
          ref={fireMatRef}
          vertexShader={fireVertexShader}
          fragmentShader={fireFragmentShader}
          uniforms={fireUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
